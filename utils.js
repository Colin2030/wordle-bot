const fs = require('fs');
const { google } = require('googleapis');

// Write credentials.json from env variable if needed
if (process.env.GOOGLE_CREDENTIALS_B64 && !fs.existsSync('./credentials.json')) {
  fs.writeFileSync(
    './credentials.json',
    Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64')
  );
}

const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: 'v4', auth });

const sheetId = process.env.GOOGLE_SHEET_ID;

function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function getAllScores() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1'
  });
  const rows = res.data.values;
  rows.shift(); // remove header
  return rows;
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
    maxStreak = parseInt(lastEntry[6] || '1');
    if (yesterdayEntry) {
      currentStreak = parseInt(lastEntry[5] || '1') + 1;
    } else {
      currentStreak = 1;
    }
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[today, player, score, wordleNumber, attempts, currentStreak, maxStreak]]
    }
  });
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

module.exports = {
  getLocalDateString,
  getAllScores,
  logScore,
  isMonthlyChampion
};