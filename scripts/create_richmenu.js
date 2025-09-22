require('dotenv').config();
const fs = require('fs');
const path = require('path');
const lineService = require('../services/line');

async function main() {
  const richMenu = {
    size: { width: 2500, height: 1686 },
    selected: false,
    name: 'TravelBot Menu',
    chatBarText: 'TravelBot',
    areas: [
      { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'Search Places' } },
      { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: 'message', text: 'Places Near Me' } },
      { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'message', text: 'Popular Recommendations' } },
      { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'Search by Category' } },
      { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'Plan a Trip' } },
      { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'message', text: 'General Inquiry' } },
    ],
  };

  try {
    const richMenuId = await lineService.createRichMenu(richMenu);
    console.log('Rich menu created:', richMenuId);
    const imgPath = path.join(__dirname, '..', 'assets', 'LineRichMenu.png');
    if (!fs.existsSync(imgPath)) { console.error('Put your image at', imgPath); return; }
    const stream = fs.createReadStream(imgPath);
    await lineService.setRichMenuImage(richMenuId, stream, 'image/png');
    console.log('Rich menu image uploaded');
    await lineService.setDefaultRichMenu(richMenuId);
    console.log('Rich menu set as default');
  } catch (err) { console.error('Failed to create rich menu', err.response ? err.response.data : err.message); }
}

main();
