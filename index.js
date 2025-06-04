// index.js — Final Modular Version

process.env.TZ = 'Europe/London';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getAllScores } = require('./utils');
const handleSubmission = require('./handleSubmission');

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const groupChatId = process.env.GROUP_CHAT_ID;

// Set webhook for Telegram
bot.setWebHook(`${process.env.BASE_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`);
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Load all command modules from /commands
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')).forEach(file => {
  const command = require(path.join(commandsPath, file));
  command(bot, getAllScores, groupChatId);
});

// Load all schedule modules from /schedules
const schedulesPath = path.join(__dirname, 'schedules');
fs.readdirSync(schedulesPath).filter(file => file.endsWith('.js')).forEach(file => {
  const job = require(path.join(schedulesPath, file));
  job(bot, getAllScores, groupChatId);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Wordle Bot is running on port ${PORT}`);
});