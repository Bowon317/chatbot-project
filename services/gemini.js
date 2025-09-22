const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_AUTH_METHOD = (process.env.GEMINI_AUTH_METHOD || '').toLowerCase();

function buildUrlAndConfig() {
  const config = { headers: { 'Content-Type': 'application/json' }, timeout: 15000 };
  let url = GEMINI_API_URL;
  if (GEMINI_AUTH_METHOD === 'bearer' && GEMINI_API_KEY) {
    config.headers.Authorization = `Bearer ${GEMINI_API_KEY}`;
    return { url, config };
  }
  if (GEMINI_AUTH_METHOD === 'apikey' && GEMINI_API_KEY) {
    url = GEMINI_API_URL.includes('?') ? `${GEMINI_API_URL}&key=${GEMINI_API_KEY}` : `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    return { url, config };
  }
  if (GEMINI_API_URL && GEMINI_API_URL.includes('generativelanguage.googleapis.com') && GEMINI_API_KEY) {
    url = GEMINI_API_URL.includes('?') ? `${GEMINI_API_URL}&key=${GEMINI_API_KEY}` : `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    return { url, config };
  }
  if (GEMINI_API_KEY) {
    config.headers.Authorization = `Bearer ${GEMINI_API_KEY}`;
  }
  return { url, config };
}

async function generateText(prompt, maxTokens = 300) {
  if (!GEMINI_API_URL) {
    return { text: `(Mock) ตอบกลับจาก Gemini สำหรับ: ${prompt}` };
  }
  const { url, config } = buildUrlAndConfig();
  let body;
  if (GEMINI_API_URL.includes('generativelanguage.googleapis.com')) {
    body = { prompt: { text: prompt }, maxOutputTokens: maxTokens };
  } else {
    body = { prompt, max_tokens: maxTokens };
  }
  try {
    const res = await axios.post(url, body, config);
    const data = res.data;
    if (typeof data === 'string') return { text: data };
    if (data.text) return { text: data.text };
    if (data.output && typeof data.output === 'string') return { text: data.output };
    if (Array.isArray(data.candidates) && data.candidates[0]) {
      const c = data.candidates[0];
      if (typeof c === 'string') return { text: c };
      if (c.content) return { text: c.content };
      if (c.output) return { text: c.output };
    }
    if (data.candidate && data.candidate.content) return { text: data.candidate.content };
    return { text: JSON.stringify(data) };
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      console.error('Gemini API DNS lookup failed - check GEMINI_API_URL in .env:', err.hostname);
    } else if (err.response) {
      console.error('Gemini API returned error:', err.response.status, err.response.data || err.response.statusText);
      if (err.response.status === 401) console.error('401 Unauthorized from Gemini API. Check your key and auth method.');
    } else {
      console.error('Gemini API error:', err.message || err);
    }
    const message = err.response ? `${err.response.status} ${err.response.statusText || ''}` : (err.message || 'unreachable');
    // Return Thai message when Gemini is unavailable
    return { text: `(Mock) Gemini ไม่พร้อมใช้งาน: ${message}` };
  }
}

module.exports = { generateText };
