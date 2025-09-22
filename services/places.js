const axios = require('axios');
require('dotenv').config();

const PLACES_API_KEY = process.env.PLACES_API_KEY;
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

async function textSearch(query, location, radius) {
  const params = { key: PLACES_API_KEY, query, language: 'th' };
  if (location) params.location = `${location.lat},${location.lng}`;
  if (radius) params.radius = radius;
  const url = `${PLACES_BASE}/textsearch/json`;
  const res = await axios.get(url, { params });
  return res.data;
}

async function nearbySearch({ lat, lng }, radius = 2000, type, keyword) {
  const params = { key: PLACES_API_KEY, location: `${lat},${lng}`, radius, language: 'th' };
  if (type) params.type = type;
  if (keyword) params.keyword = keyword;
  const url = `${PLACES_BASE}/nearbysearch/json`;
  const res = await axios.get(url, { params });
  return res.data;
}

function formatResults(results, limit = 5) {
  const items = (results.results || []).slice(0, limit).map(r => {
    const name = r.name || 'ไม่มีชื่อ';
    const addr = r.formatted_address || r.vicinity || '';
    const rating = r.rating ? `⭐ ${r.rating}` : '';
    const placeId = r.place_id;
    const mapsUrl = placeId ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}` : '';
    // Format in Thai: name, rating, address, and Google Maps link (if available)
    return `${name}${rating ? ' ' + rating : ''}\n${addr}${mapsUrl ? '\n' + mapsUrl : ''}`;
  });
  return items.join('\n\n') || 'ไม่พบสถานที่';
}

module.exports = { textSearch, nearbySearch, formatResults };
