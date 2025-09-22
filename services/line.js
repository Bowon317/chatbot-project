const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

module.exports = {
  client,
  replyMessage: (replyToken, messages) => client.replyMessage(replyToken, messages),
  pushMessage: (to, messages) => client.pushMessage(to, messages),
  createRichMenu: (richMenu) => client.createRichMenu(richMenu),
  setRichMenuImage: (richMenuId, stream, contentType) => client.setRichMenuImage(richMenuId, stream, contentType),
  setDefaultRichMenu: (richMenuId) => client.setDefaultRichMenu(richMenuId),
  linkRichMenuToUser: (userId, richMenuId) => client.linkRichMenuToUser(userId, richMenuId),
};
