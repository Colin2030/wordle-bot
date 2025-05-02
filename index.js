// index.js — FULL CLEANED AND RESTORED VERSION
// Webhook-enabled version of the Wordle Telegram bot
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

const memes = [
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjM1M290dWxpb3Zmd2w0bWtrMDdqZ3FrcGwwbnE0cDNrb2tveG1zeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/eMbRvq3my2K78HvQkf/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeG5xeHpyaTV4d2xvanBucXZqeHhncTFjbDlhdzltam9xcWgwOGppNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sTczweWUTxLqg/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3kzMGFsZ3hxMDNzNnZqbWExd3J4dW5mcmdlNWlhM2N6bjJkcjBraCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d8D5RoR8adbJaFF3TV/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMG0wd2hmcHd1bjg0ZXk3NDFnOWl4YnB5a3JtN2czZTAzbm44cnV2ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/AcvtX3DDKMTy3PdvZ2/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2VzY3R3djJ3Zm9nZ2tpZ2ZzOWk3bWxsNGYxaDhoZzB4ajNoaWQwcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTiQyCg9B3OGv1NvXi/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnJiaTRubGJqOHFmdXc4N2k0aGhwNnFkbThwdXJnM2s0amJndHN3YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjHKjVoNVsCeMoDe/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzYxNDJrOHFkdzQ0a3E2ZXRpaTFpOTBidDc3MTFrdzM5eW9iN2tnMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Mwc9vB8NxmZq/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2xtYTQ3emVoeXJvbWIwcTVranJ0ZjA0bnZ2YnNjZ2doZGZhc21iNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4KhRX9mqrUVYRuRW/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3gydXJ5MWZnY3J6cjYyNzVmdnQwYnBndnJ0MGFwaDh3c3UzeHphZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ylyUQkRS0PyhNMPGIE/giphy.gif"
];

const victoryMemes = [
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTFrazZwdjA3eGRxMHh3b3RxNXZmb291ZTVqaW1nZ3hoa2twbnNuOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/mIZ9rPeMKefm0/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExamx3cDBsNDdhcW9icWVmbWZ1a2N3NDNtanZ0eXVzZGNpZGlxYnppdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dUYddwtCVUOIpgXijq/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGVvdGN0YWdrZXd6NjFtcWp2bmVnNW9peG81ZGZmM2JybTFnejNwdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IwAZ6dvvvaTtdI8SD5/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWtuZjluNjM0ZnZoMnZiaGl0Mnh6a3ViNTdkNzVxZnhhc2h2cXo0bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/opDRL3H2A9iLNuvbOv/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGthbXZ0enp6ZDZuaDc5dWY3cWJwYmNzMmczNXUwbmJmeG44NWVuNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT0GqBJf5FNUGKoVrO/giphy.gif"
];

function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function logScore(player, score, wordleNumber, attempts) {
  const now = new Date();
  const today = getLocalDateString(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayString = getLocalDateString(yesterday);

  const allScores = await getAllScores();

  const yesterdayEntry = allScores.find(([date, p]) => date === yesterdayString && p === player);
  const playerEntries = allScores.filter(([_, p]) => p === player);

  let currentStreak = 1;
  let maxStreak = 1;

  if (playerEntries.length > 0) {
    const lastEntry = playerEntries[playerEntries.length - 1];
    maxStreak = parseInt(lastEntry[6] || '1'); // column 7 (max streak)
    if (yesterdayEntry) {
      currentStreak = parseInt(lastEntry[5] || '1') + 1; // column 6 (current streak)
    } else {
      currentStreak = 1;
    }
  }

  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[today, player, score, wordleNumber, attempts, currentStreak, maxStreak]]
    }
  });
}

async function getAllScores() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1'
  });
  const rows = res.data.values;
  rows.shift();
  return rows;
}

function getTitle(score) {
  if (score >= 50) return "Wordle Grandmaster";
  if (score >= 40) return "Wordle Wizard";
  if (score >= 30) return "Brainiac";
  return "Wordle Warrior";
}

async function isMonthlyChampion(player) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'MonthlyWinners!A:B'
  });
  const rows = res.data.values || [];
  return rows.some(([month, winner]) => month === monthKey && winner === player);
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;
  if (!msg.text) return;

  const cleanText = msg.text.replace(/,/g, '').trim();
  const match = cleanText.match(/Wordle\s(\d+)\s([1-6X])\/6\*?/);
  if (!match) return;

  const wordleNumber = parseInt(match[1]);
  const attempts = match[2];
  const player = msg.from.first_name || 'Unknown';
  const now = new Date();
  const isFriday = now.getUTCDay() === 5;
  const numAttempts = attempts === 'X' ? 7 : parseInt(attempts);

  const gridRegex = /([⬛⬜🟨🟩]{5}\n?)+/g;
  const gridMatch = cleanText.match(gridRegex);

  let finalScore = 0;
  if (attempts !== 'X') {
    const base = [0, 50, 40, 30, 20, 10, 5];
    finalScore += base[numAttempts];

    if (gridMatch) {
      const gridText = gridMatch.join('');
      const greens = (gridText.match(/🟩/g) || []).length;
      const yellows = (gridText.match(/🟨/g) || []).length;
      const tileBonus = Math.min(greens * 1 + yellows * 0.5, 10);
      finalScore += tileBonus;
    }

    if (isFriday) finalScore *= 2;
  }

  await logScore(player, Math.round(finalScore), wordleNumber, attempts);
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  const title = getTitle(Math.round(finalScore));
  const isChampion = await isMonthlyChampion(player);
  const trophy = isChampion ? ' 🏆' : '';

  if (Math.round(finalScore) === 0) {
    const insult = mildInsults[Math.floor(Math.random() * mildInsults.length)];
    bot.sendMessage(chatId, `${insult} ${player}${trophy} scored 0 points. Better luck next time!`);
  } else {
    bot.sendMessage(chatId, `${player}${trophy} (${title}) scored ${Math.round(finalScore)} points! ${reaction}`);
  }
});

// /ping
bot.onText(/\/ping(@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;
  bot.sendMessage(chatId, "🏓 Pong!");
});

// /leaderboard
bot.onText(/\/leaderboard(@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;
  const scores = await getAllScores();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const leaderboard = {};

  for (const [date, player, score] of scores) {
    if (date === today) {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    }
  }

  let text = `📈 *Today's Leaderboard:*\n\n`;
  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([player, score], index) => {
    let medal = '';
    if (index === 0) medal = '🏆';    // 1st place
    else if (index === 1) medal = '🥈'; // 2nd place
    else if (index === 2) medal = '🥉'; // 3rd place

    text += `${index + 1}. ${medal} ${player}: ${score} pts\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});


// /weeklyleaderboard
bot.onText(/\/weeklyleaderboard(@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  const scores = await getAllScores();
  const now = new Date();

  // Set Monday of this week
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Adjust for Monday start
  monday.setHours(0, 0, 0, 0);

  const leaderboard = {};

  for (const [date, player, score] of scores) {
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate >= monday && entryDate <= now) {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    }
  }

  let text = `📅 *This Week's Wordle Legends:*\n\n`;
  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    text += `No scores yet this week. Get Wordling! 🎯`;
  } else {
    sorted.forEach(([player, score], index) => {
      let medal = '';
      if (index === 0) medal = '🏆';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      text += `${index + 1}. ${medal} ${player}: ${score} pts\n`;
    });
  }

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});



// /myrank
bot.onText(/\/myrank(@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;
  const scores = await getAllScores();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const leaderboard = {};
  const streaks = {}; // { player: [currentStreak, maxStreak] }

  for (const [date, player, score, wordleNumber, attempts, currentStreak, maxStreak] of scores) {
    if (date === today) {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    }
    // Always record the latest streak info
    streaks[player] = [currentStreak, maxStreak];
  }

  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
  const user = msg.from.first_name;
  const rank = sorted.findIndex(([player]) => player === user);

  if (rank === -1) {
    bot.sendMessage(chatId, `😬 ${user}, you haven't even played yet! Are you even Wordling, bro? 🧠🎯`, { parse_mode: 'Markdown' });
  } else {
    const [player, score] = sorted[rank];
    const [currentStreak, maxStreak] = streaks[player] || [1, 1];
    bot.sendMessage(chatId, `🏅 ${player}, you're ranked #${rank + 1} with ${score} points today!\n🔥 Current Streak: ${currentStreak} days | Max Streak: ${maxStreak} days`, { parse_mode: 'Markdown' });
  }
});

// /monthlyleaderboard
bot.onText(/\/monthlyleaderboard(@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  const scores = await getAllScores();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const leaderboard = {};

  for (const [date, player, score] of scores) {
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate >= firstOfMonth && entryDate <= now) {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    }
  }

  let text = `📅 *This Month's Wordle Warriors:*\n\n`;
  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    text += `No scores recorded yet this month! Start Wordling! 🎯`;
  } else {
    const topScore = sorted[0][1];
    sorted.forEach(([player, score], index) => {
      let medal = '';
      if (index === 0) medal = '🏆';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      let closingIn = '';
      if (index !== 0 && topScore - score <= 30) {
        closingIn = ' 🔥 Closing in!';
      }

      text += `${index + 1}. ${medal} ${player}: ${score} pts${closingIn}\n`;
    });
  }

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});



// /rules
bot.onText(/\/rules(@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  const rules = `📜 *Wordle Wankers Official Rules:*\n\n`
    + `✅ Share your daily Wordle results \- no lurking! 👀\n`
    + `✅ Points: (6 - attempts) plus bonus points for greens 🟩 and yellows 🟨\n`
    + `✅ Double Points every Friday! 🎉\n`
    + `✅ Daily winner crowned at 9AM 👑\n`
    + `✅ Weekly champion announced every Monday 🏆\n`
    + `✅ Monthly champion announced on the 1st each month\n\n`
    + `Brag loudly \- lose gracefully \- Wordle fiercely! 🎯`;

  bot.sendMessage(chatId, rules, { parse_mode: 'Markdown' });
});

// /scoring
bot.onText(/\/scoring(@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  const scoringText = `🎯 *Wordle Scoring Explained!*\n\n`
    + `✅ Guess the word quicker = More points!\n`
    + `✅ Bonus points for green 🟩 and yellow 🟨 tiles.\n`
    + `✅ Friday = DOUBLE POINTS! 🎉\n\n`
    + `*Points per Solve:*\n`
    + `- 1st try: 50 pts 🚀\n`
    + `- 2nd try: 40 pts 🔥\n`
    + `- 3rd try: 30 pts 🎯\n`
    + `- 4th try: 20 pts 🎯\n`
    + `- 5th try: 10 pts 🎯\n`
    + `- 6th try: 5 pts 🎯\n\n`
    + `*Tile Bonus:*\n`
    + `- +1 point per 🟩\n`
    + `- +0.5 points per 🟨\n`
    + `(max +10 tile bonus)\n\n`
    + `🧠 Solve faster, earn glory!`;

  bot.sendMessage(chatId, scoringText, { parse_mode: 'Markdown' });
});



// /help
bot.onText(/\/help(@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  const helpText = `🤖 *Wordle Bot Commands:*\n\n`
    + `/ping - Check if I'm alive 🏓\n`
    + `/leaderboard - See today's scores 📈\n`
    + `/weeklyleaderboard - See this week's scores 📅\n`
    + `/myrank - See your current rank 🏅\n`
    + `/rules - View the game rules 📜\n`
    + `/scoring - See how points are awarded 🎯\n`
	+ `/monthlyleaderboard - See this month's top scorers 🏆\n`
    + `/help - List all commands 🆘\n`
    + `/about - Info about the bot ℹ️\n\n`
    + `Post your Wordle score anytime to compete! 🎯`;

  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// /about
bot.onText(/\/about(@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  const aboutText = `ℹ️ *About This Bot:*\n\n`
    + `Welcome to the legendary Wordle Workers group! 🎉\n\n`
    + `✅ Track your daily Wordle scores\n`
    + `✅ Battle for daily, weekly and monthly glory 🏆\n`
    + `✅ Celebrate DOUBLE POINTS FRIDAYS! 🎯\n\n`
    + `Built with 💪 by Colin \- with a little help from ChatGPT 🤖\n\n`
    + `Good luck \- and remember: one guess to rule them all! 🎯`;

  bot.sendMessage(chatId, aboutText, { parse_mode: 'Markdown' });
});


// New member welcome message
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;

  msg.new_chat_members.forEach((member) => {
    const welcomeMessage = `👋 Welcome, ${member.first_name}!\n\n`
      + `You have entered an elite Wordle arena.\n\n`
      + `✅ Post your daily Wordle score \- no hiding allowed 👀\n`
      + `✅ Outsmart your friends \- or die trying 🧠\n`
      + `✅ DOUBLE POINTS every Friday \- chaos guaranteed 🎉\n\n`
      + `Type /help if you need survival tips!\n\n`
      + `Good luck \- you\'re going to need it... 🎯`;

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });
});


// Daily top 3 announcement with accurate local-date filtering and streak tracking
cron.schedule('0 9 * * *', async () => {
  const scores = await getAllScores();

  const now = new Date();
  const yesterday = new Date(now);
  const dayBefore = new Date(now);
  const twoDaysBefore = new Date(now);

  yesterday.setDate(now.getDate() - 1);
  dayBefore.setDate(now.getDate() - 2);
  twoDaysBefore.setDate(now.getDate() - 3);

  // Normalize to midnight (local time)
  yesterday.setHours(0, 0, 0, 0);
  dayBefore.setHours(0, 0, 0, 0);
  twoDaysBefore.setHours(0, 0, 0, 0);

  const leaderboardYesterday = {};
  const leaderboardDayBefore = {};
  const leaderboardTwoDaysBefore = {};

  for (const [date, player, score] of scores) {
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0); // normalize for date-only compare

    if (entryDate.getTime() === yesterday.getTime()) {
      leaderboardYesterday[player] = (leaderboardYesterday[player] || 0) + parseInt(score);
    }
    if (entryDate.getTime() === dayBefore.getTime()) {
      leaderboardDayBefore[player] = (leaderboardDayBefore[player] || 0) + parseInt(score);
    }
    if (entryDate.getTime() === twoDaysBefore.getTime()) {
      leaderboardTwoDaysBefore[player] = (leaderboardTwoDaysBefore[player] || 0) + parseInt(score);
    }
  }

  if (Object.keys(leaderboardYesterday).length === 0) {
    return;
  }

  const sortedYesterday = Object.entries(leaderboardYesterday).sort((a, b) => b[1] - a[1]);
  const sortedDayBefore = Object.entries(leaderboardDayBefore).sort((a, b) => b[1] - a[1]);
  const sortedTwoDaysBefore = Object.entries(leaderboardTwoDaysBefore).sort((a, b) => b[1] - a[1]);

  const yesterdayWinner = sortedYesterday.length > 0 ? sortedYesterday[0][0] : null;
  const dayBeforeWinner = sortedDayBefore.length > 0 ? sortedDayBefore[0][0] : null;
  const twoDaysBeforeWinner = sortedTwoDaysBefore.length > 0 ? sortedTwoDaysBefore[0][0] : null;

  let text = `🌟 *Yesterday's Top Wordlers!* 🌟\n\n`;

  sortedYesterday.forEach(([player, score], index) => {
    let line = '';

    if (index === 0) {
      line += `🏆 1st: *${player}* with ${score} pts`;

      if (player === dayBeforeWinner && player === twoDaysBeforeWinner) {
        line += ` 🔥🔥 _Threepeat Champion!_`;
      } else if (player === dayBeforeWinner) {
        line += ` 🔥 _Back-to-Back Champion!_`;
      }

      line += `\n`;
    } else if (index === 1) {
      line += `🥈 2nd: *${player}* with ${score} pts\n`;
    } else if (index === 2) {
      line += `🥉 3rd: *${player}* with ${score} pts\n`;
    }

    text += line;
  });

  await bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });

  // Optional: Threepeat celebration meme
  if (yesterdayWinner === dayBeforeWinner && yesterdayWinner === twoDaysBeforeWinner) {
    const threepeatMemes = [
      "https://i.imgur.com/bN8BzAU.gif", // Fireworks
      "https://i.imgur.com/F1Yo5c5.gif", // Party time
      "https://i.imgur.com/XgPfUj7.gif", // Victory lap
    ];
    const gif = threepeatMemes[Math.floor(Math.random() * threepeatMemes.length)];
    await bot.sendAnimation(groupChatId, gif);
  }
});

  // Weekly champion announcement at Monday 10AM
cron.schedule('0 10 * * 1', async () => {
  const scores = await getAllScores();
  const now = new Date();
  const lastWeek = [];

  scores.forEach(([date, player, score]) => {
    const entryDate = new Date(date);
    const daysAgo = (now - entryDate) / (1000 * 60 * 60 * 24);
    if (daysAgo >= 7 && daysAgo < 14) {
      lastWeek.push([player, parseInt(score)]);
    }
  });

  if (lastWeek.length === 0) return;

  const leaderboard = {};
  lastWeek.forEach(([player, score]) => {
    leaderboard[player] = (leaderboard[player] || 0) + score;
  });

  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0];

  bot.sendMessage(groupChatId, `👑 *Last week's Champion:*\n\n${winner[0]} with ${winner[1]} points! Congratulations! 🎉`, { parse_mode: 'Markdown' });
});

// Friday Double Points announcement at 8AM
cron.schedule('0 7 * * 5', async () => {
  const meme = memes[Math.floor(Math.random() * memes.length)];
  
  const fridayMessage = `🎉 *DOUBLE POINTS FRIDAY IS LIVE!*\n\n`
    + `✅ Every green and yellow counts DOUBLE today!\n`
    + `✅ Outsmart, outguess, outplay your friends 🧠\n`
    + `✅ Bring your A-game \\- or prepare for humiliation 😬\n\n`
    + `Post your Wordle scores like your honor depends on it! 🎯`;

  await bot.sendMessage(groupChatId, fridayMessage, { parse_mode: 'Markdown' });
  await bot.sendAnimation(groupChatId, meme);
});

// Weekly leaderboard announcement every Sunday at 8PM
cron.schedule('0 20 * * 0', async () => {
  const scores = await getAllScores();
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  // Capture today's leaderboard
  const currentTime = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayScores = {};

  for (const [date, player, score] of scores) {
    if (date === today) {
      todayScores[player] = (todayScores[player] || 0) + parseInt(score);
    }
  }

  const sortedToday = Object.entries(todayScores).sort((a, b) => b[1] - a[1]);
  const todayTopPlayers = sortedToday.length > 0 ? sortedToday.filter(([_, score]) => score === sortedToday[0][1]).map(([player]) => player) : [];

  const leaderboard = {};

  for (const [date, player, score] of scores) {
    const entryDate = new Date(date);
    if (entryDate >= monday && entryDate <= now) {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    }
  }

  let text = `📢 *Weekly Wordle Legends!*\n\n`;
  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    text += `No scores recorded this week. Let's smash it next week! 🎯`;
  } else {
    sorted.forEach(([player, score], index) => {
      let medal = '';
      if (index === 0) medal = '🏆';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      let crown = todayTopPlayers.includes(player) ? ' 👑' : '';

      text += `${index + 1}. ${medal} ${player}${crown}: ${score} pts\n`;
    });
  }

  bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });
});

// Monthly champion announcement at 9AM on the 1st
cron.schedule('0 9 1 * *', async () => {
  const scores = await getAllScores();
  const now = new Date();

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const leaderboard = {};

  for (const [date, player, score] of scores) {
    const entryDate = new Date(date);
    if (entryDate >= lastMonth && entryDate < thisMonth) {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    }
  }

  if (Object.keys(leaderboard).length === 0) {
    await bot.sendMessage(groupChatId, `📅 No games played last month! Let's make this month legendary! 🎯`);
    return;
  }

  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
  const [winner, score] = sorted[0];

  await bot.sendMessage(groupChatId, `🎉 *Monthly Champion Announcement!* 🎉\n\n🏆 ${winner} is the Wordle Legend for last month with *${score} points*! 👑🎁\n\nCongratulations!`);

  // Save to MonthlyWinners tab
  const monthString = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'MonthlyWinners!A:B',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[monthString, winner]]
    }
  });

  // Optional: Celebration meme!
  const randomVictoryMeme = victoryMemes[Math.floor(Math.random() * victoryMemes.length)];
  await bot.sendAnimation(groupChatId, randomVictoryMeme);
});

// Mid-month reminder at 8AM on the 15th
cron.schedule('0 8 15 * *', async () => {
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[now.getMonth()];

  const message = `⏳ *Halfway through ${monthName}!* ⏳\n\n🏆 The race for Wordle glory is heating up!\n\nType /monthlyleaderboard to see who's leading the charge! 🎯`;

  await bot.sendMessage(groupChatId, message, { parse_mode: 'Markdown' });
});


// Startup confirmation
console.log("✅ Wordle Bot is running and ready to track scores!");

