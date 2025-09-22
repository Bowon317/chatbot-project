# Travel Bot

LINE chatbot for recommending tourist attractions in Thailand. Built with Node.js, Express, LINE Messaging SDK, and MySQL (XAMPP).

Quick start

1. Copy `.env.example` to `.env` and fill in credentials (LINE channel token/secret, Google Places API key, Gemini API values if available, and MySQL credentials).
2. Import `sql/dbline.sql` into your local MySQL (phpMyAdmin/XAMPP) to create the `dbline` database.
3. Install dependencies: `npm install`.
4. Start the server: `npm start`.

Create the Rich Menu

Place your rich menu image at `assets/LineRichMenu.png` and run:
```
node scripts/create_richmenu.js
```
