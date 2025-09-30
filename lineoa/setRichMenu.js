// setRichMenu.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('@line/bot-sdk');

// --- INSTRUCTIONS ---
// 1. Save your rich menu image in the 'lineoa' folder.
// 2. Run this script from your terminal with the image filename as an argument:
//    node setRichMenu.js your-image-name.png
// --------------------

// Check if an image path is provided
if (process.argv.length < 3) {
    console.error('Usage: node setRichMenu.js <path_to_image>');
    console.error('Example: node setRichMenu.js richmenu-image.png');
    process.exit(1);
}

const imagePath = path.join(__dirname, process.argv[2]);
const richMenuConfigPath = path.join(__dirname, 'richmenu.json');

// Ensure files exist
if (!fs.existsSync(imagePath)) {
    console.error(`Error: Image file not found at ${imagePath}`);
    process.exit(1);
}
if (!fs.existsSync(richMenuConfigPath)) {
    console.error(`Error: richmenu.json not found at ${richMenuConfigPath}`);
    process.exit(1);
}

// Initialize LINE client
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// Read rich menu configuration from richmenu.json
const richMenuConfig = JSON.parse(fs.readFileSync(richMenuConfigPath, 'utf8'));

async function createAndSetRichMenu() {
  try {
    console.log('Step 1: Creating rich menu object...');
    // Create the rich menu using the definition from richmenu.json
    const richMenuId = await client.createRichMenu(richMenuConfig);
    console.log(`-> Rich menu created successfully! ID: ${richMenuId}`);

    console.log('\nStep 2: Uploading rich menu image...');
    // Create a read stream for your image and upload it
    const imageBuffer = fs.readFileSync(imagePath);
    await client.setRichMenuImage(richMenuId, imageBuffer, 'image/png');
    console.log('-> Image uploaded successfully.');

    console.log('\nStep 3: Setting as default rich menu...');
    // Set this rich menu as the default for all users who add the bot
    await client.setDefaultRichMenu(richMenuId);
    console.log('-> Successfully set as the default rich menu for all users.');

    console.log('\n--- All Done! ---');
    console.log('The rich menu is now active. You may need to re-add your bot on LINE or clear the chat history to see the change.');

  } catch (error) {
    console.error('An error occurred:');
    // Log the detailed error response from the LINE API if available
    if (error.originalError && error.originalError.response) {
        console.error(JSON.stringify(error.originalError.response.data, null, 2));
    } else {
        console.error(error);
    }
  }
}

createAndSetRichMenu();
