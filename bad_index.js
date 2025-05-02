
// Wordle Bot – Final Webhook Version with OpenAI + Custom Reactions
const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json());

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const cron = require('node-cron');
const { reactions, mildInsults } = require('./phrases');
const { reactionThemes } = require('./reactions');
const { generateReaction } = require('./openaiReaction');

// Decode and save credentials.json from base64 env var
if (process.env.GOOGLE_CREDENTIALS_B64) {
  fs.writeFileSync(
    './credentials.json',
    Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64')
  );
}
const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

// Setup Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: 'v4', auth });

const sheetId = process.env.GOOGLE_SHEET_ID;
const groupChatId = process.env.GROUP_CHAT_ID;

// Setup Telegram bot with webhook
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
bot.setWebHook(`${process.env.BASE_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`);

// Webhook endpoint
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});

console.log("✅ Wordle Bot is running and ready to track scores!");

// Example scoring response logic to use:
async function handleScoreResponse(chatId, player, score, attempts) {
  let reaction;

  try {
    reaction = await generateReaction(score, attempts, player);
  } catch (err) {
    console.error("OpenAI fallback triggered:", err);
  }

  if (!reaction) {
    const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts);
    if (reactionThemes[attemptKey]) {
      reaction = reactionThemes[attemptKey][Math.floor(Math.random() * reactionThemes[attemptKey].length)];
    } else {
      reaction = reactions[Math.floor(Math.random() * reactions.length)];
    }
  }

  bot.sendMessage(chatId, `${player} scored ${score} points in ${attempts} attempts.
${reaction}`);
}

// Note: You'll want to hook handleScoreResponse into your actual bot.on('message', ...) block where the score is calculated.
