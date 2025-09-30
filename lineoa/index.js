// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const mysql = require('mysql2/promise');

const path = require('path');
const axios = require('axios');

// LINE bot client configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Database connection pool
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const app = express();

// Serve static files from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

const client = new line.Client(config);

// Webhook endpoint
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});


// --- Gemini API Integration ---
async function askGemini(question) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    // ใช้ model ที่ account ของคุณมีสิทธิ์ เช่น gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(url, {
      contents: [{ parts: [{ text: question }] }]
    });

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text 
           || 'Sorry, I could not get a response.';
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    return 'Sorry, I could not get a response from Gemini.';
  }
}


// --- Google Maps API Integrations ---
async function searchPlaceByName(name) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&key=${apiKey}`;
    const response = await axios.get(url);
    return response.data.results;
  } catch (err) {
    console.error('Google Maps Place Search error:', err.response?.data || err.message);
    return [];
  }
}

// --- Nearby Places (with random pick) ---
async function searchNearbyPlaces(lat, lng, keyword) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // ✅ ใช้ rankby=distance เพื่อหาที่ใกล้สุดจริง ๆ
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&keyword=${encodeURIComponent(keyword)}&rankby=distance&key=${apiKey}`;

    const response = await axios.get(url);
    const results = response.data.results || [];

    if (results.length === 0) {
      return [];
    }

    // ✅ สุ่มเลือก 5 ที่จากผลลัพธ์ (กันเจอแต่ที่เดิม ๆ)
    const shuffled = results.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);

  } catch (err) {
    console.error('Google Maps Nearby API error:', err.response?.data || err.message);
    return [];
  }
}


// --- Log search to MySQL ---
async function logSearch(userId, query) {
  try {
    // Get user_id from line_user_id
    const [users] = await dbPool.execute('SELECT user_id FROM users WHERE line_user_id = ?', [userId]);
    if (users.length > 0) {
      await dbPool.execute('INSERT INTO search_logs (user_id, query) VALUES (?, ?)', [users[0].user_id, query]);
    }
  } catch (err) {
    console.error('Failed to log search:', err);
  }
}

// --- Flex Message Generators ---
function placeFlex(place) {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: place.photos && place.photos[0] 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}` 
        : 'https://via.placeholder.com/800x533?text=No+Image',
      size: 'full',
      aspectRatio: '4:3',
      aspectMode: 'cover',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: place.name, weight: 'bold', size: 'lg', wrap: true },
        { type: 'text', text: place.formatted_address || place.vicinity || '', size: 'sm', color: '#888888', wrap: true },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: 'Open in Google Maps',
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
          }
        }
      ],
      flex: 0
    }
  };
}


function placesCarouselFlex(places) {
  return {
    type: 'flex',
    altText: 'Nearby Places',
    contents: {
      type: 'carousel',
      contents: places.map(place => placeFlex(place)) // ✅ bubbles only
    }
  };
}

// ฟังก์ชันใหม่ สำหรับห่อ bubble ให้เป็น flex message ที่ LINE ยอมรับ
function placeFlexMessage(place) {
  return {
    type: 'flex',
    altText: `Result: ${place.name}`,
    contents: placeFlex(place) // bubble เดิมที่คุณมีอยู่แล้ว
  };
}




// --- Enhanced Event Handler ---
// State memory for each user (in-memory, for demo only)
const userState = {};

async function handleEvent(event) {
  if (event.type !== 'message' && event.type !== 'postback') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  await registerUser(userId);

  // --- Maps handler (Rich Menu only) ---
  if (event.type === 'postback') {
    const data = JSON.parse(event.postback.data);
    switch (data.action) {
      case 'search_place':
        // Set user state to expect place name
        userState[userId] = { mode: 'awaiting_place_name' };
        return client.replyMessage(event.replyToken, { type: 'text', text: 'Please type the name of the place you want to search for.' });
      case 'nearby_places':
        // Set user state to expect location and category
        userState[userId] = { mode: 'awaiting_location_category' };
        return client.replyMessage(event.replyToken, { type: 'text', text: 'Please share your location and type a category (e.g., restaurant, temple).' });
      case 'help':
        // Help Quick Replies
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'How to use this bot:\n- Use the menu to search for places or nearby spots.\n- "Search Place": Type the name of a place.\n- "Nearby Places": Share your location and type a category.\n- You can always ask for travel tips in free text!',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'postback', label: 'Search Place', data: '{"action":"search_place"}' } },
              { type: 'action', action: { type: 'postback', label: 'Nearby Places', data: '{"action":"nearby_places"}' } },
              { type: 'action', action: { type: 'message', label: 'Contact Admin', text: 'I need to contact an admin.' } },
            ],
          },
        });
    }
  }

  // --- Gemini handler (Free text) ---
  if (event.type === 'message') {
    const msg = event.message;
    // If user is in a special state from rich menu
    if (userState[userId]?.mode === 'awaiting_place_name' && msg.type === 'text') {
      // Maps handler: Search place by name
      const text = msg.text.trim();
      const places = await searchPlaceByName(text);
      if (places && places.length > 0) {
        await logSearch(userId, text);
        userState[userId] = undefined;
        client.replyMessage(event.replyToken, placeFlexMessage(places[0]));
      } else {
        return client.replyMessage(event.replyToken, { type: 'text', text: 'Sorry, I could not find that place.' });
      }
    }
    if (userState[userId]?.mode === 'awaiting_location_category') {
      // Expecting location and category
      if (msg.type === 'location') {
        // Store location, wait for category
        userState[userId].location = { lat: msg.latitude, lng: msg.longitude };
        return client.replyMessage(event.replyToken, { type: 'text', text: 'Now type a category (e.g., restaurant, temple).' });
      } else if (msg.type === 'text' && userState[userId].location) {
        // Got category after location
        const category = msg.text.trim();
        const { lat, lng } = userState[userId].location;
        const places = await searchNearbyPlaces(lat, lng, category);
        if (places && places.length > 0) {
          await logSearch(userId, `Nearby: ${category} @${lat},${lng}`);
          userState[userId] = undefined;
          return client.replyMessage(event.replyToken, [placesCarouselFlex(places)]);
        } else {
          return client.replyMessage(event.replyToken, { type: 'text', text: 'Sorry, I could not find any places in that category nearby.' });
        }
      } else {
        // Prompt for location or category
        return client.replyMessage(event.replyToken, { type: 'text', text: 'Please share your location and then type a category.' });
      }
    }

    // --- Gemini handler: All other free text ---
    if (msg.type === 'text') {
      // Only Gemini, never Google Maps from free text
      const geminiReply = await askGemini(msg.text.trim());
      return client.replyMessage(event.replyToken, geminiFlexMessage(msg.text.trim(), geminiReply));
    }

    // If user shares location outside of rich menu flow
    if (msg.type === 'location') {
      return client.replyMessage(event.replyToken, { type: 'text', text: 'To search nearby, please use the menu and select "Nearby Places" first.' });
    }
  }
}



// Register user if not exists
async function registerUser(lineUserId) {
  try {
    const [rows] = await dbPool.execute('SELECT * FROM users WHERE line_user_id = ?', [lineUserId]);
    if (rows.length === 0) {
      // Get user profile from LINE
      const profile = await client.getProfile(lineUserId);
      await dbPool.execute('INSERT INTO users (line_user_id, name) VALUES (?, ?)', [lineUserId, profile.displayName]);
      console.log(`Registered new user: ${profile.displayName}`);
    } else {
        // Update last_active timestamp
        await dbPool.execute('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE line_user_id = ?', [lineUserId]);
    }
  } catch (error) {
    console.error(`Failed to register or update user ${lineUserId}:`, error);
  }
}

// --- Gemini Flex Wrapper ---
function cleanText(text) {
  // ตัด markdown พวก ** หรือ * ออก
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

function geminiFlexMessage(userText, geminiReply) {
  const safeReply = cleanText(geminiReply);

  // กำหนดความยาวสูงสุดใหม่ที่ต้องการ (เช่น 2500)
  const MAX_REPLY_LENGTH = 2000; 

  return {
    type: 'flex',
    altText: 'Gemini Reply',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '🤖 Gemini Suggestion', weight: 'bold', size: 'md', color: '#1DB446' },
          { type: 'text', text: `Q: ${userText}`, wrap: true, margin: 'sm', size: 'sm', color: '#555555' },
          { type: 'separator', margin: 'md' },
          { 
            type: 'text', 
            
            text: safeReply.length > MAX_REPLY_LENGTH ? safeReply.slice(0, MAX_REPLY_LENGTH) + '...' : safeReply, 
            wrap: true, 
            margin: 'md', 
            size: 'sm' 
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🔍 More Info',
              uri: 'https://www.google.com/search?q=' + encodeURIComponent(userText)
            }
          }
        ]
      }
    }
  };
}


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
