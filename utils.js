// utils.js
const { google } = require('googleapis');
const fs = require('fs');

const sheetId = process.env.GOOGLE_SHEET_ID;

// Load Google creds: prefer env (B64), fallback to local file if it exists
let creds;
if (process.env.GOOGLE_CREDENTIALS_B64) {
  try {
    const json = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
    creds = JSON.parse(json);
  } catch (e) {
    throw new Error('GOOGLE_CREDENTIALS_B64 is set but invalid JSON/base64.');
  }
} else if (fs.existsSync('./credentials.json')) {
  creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
} else {
  throw new Error('Missing Google credentials. Set GOOGLE_CREDENTIALS_B64 or provide ./credentials.json');
}

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getAllScores() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1',
  });
  const rows = res.data.values || [];
  // drop header if present
  if (rows.length && /^date$/i.test(String(rows[0][0] || ''))) rows.shift();
  return rows;
}

// Write exactly the streaks you're given — don't recompute here.
async function logScore(player, score, wordleNumber, attempts, currentStreak, maxStreak) {
  const today = getLocalDateString(new Date());
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[today, player, score, wordleNumber, attempts, currentStreak, maxStreak]],
    },
  });
}

async function isMonthlyChampion(player) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'MonthlyWinners!A:B',
  });
  const rows = res.data.values || [];
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  return rows.some(([month, winner]) => month === monthKey && winner === player);
}

module.exports = {
  getAllScores,
  logScore,
  getLocalDateString,
  isMonthlyChampion,
};
