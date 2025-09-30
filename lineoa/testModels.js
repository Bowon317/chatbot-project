const axios = require("axios");
require("dotenv").config();

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const response = await axios.get(url);
    console.log("Available models:");
    response.data.models.forEach(m => {
      console.log("-", m.name);
    });
  } catch (err) {
    console.error("Error listing models:", err.response?.data || err.message);
  }
}

listModels();
