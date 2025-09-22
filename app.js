// app.js - Entry point for Travel Bot
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webhook = require('./webhook');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Travel Bot running'));
app.post('/webhook', webhook.handleEvent);

app.listen(PORT, () => console.log(`Travel Bot listening on port ${PORT}`));
