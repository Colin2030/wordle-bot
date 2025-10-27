// /monthlyChampion — announces and logs last month's champion with decimal scores
module.exports = function monthlyChampion(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');
  const { google } = require('googleapis');
  const fs = require('fs');

  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Load Google credentials: prefer env (B64), fallback to local file if it exists
  let creds;
  if (process.env.GOOGLE_CREDENTIALS_B64) {
    try {
      creds = JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
      );
    } catch (e) {
      throw new Error('GOOGLE_CREDENTIALS_B64 is set but invalid JSON/base64');
    }
  } else if (fs.existsSync('./credentials.json')) {
    creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
  } else {
    throw new Error('Missing Google credentials: set GOOGLE_CREDENTIALS_B64 or include ./credentials.json');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 09:00 on the 1st of each month, Europe/London (TZ set in your env / process.env.TZ)
  cron.schedule('0 9 1 * *', async () => {
    const scores = await getAllScores();
    const now = new Date();

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const leaderboard = {};
    for (const [date, player, score] of scores) {
      const entryDate = new Date(date);
      if (entryDate >= lastMonth && entryDate < thisMonth) {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      }
    }

    if (Object.keys(leaderboard).length === 0) {
      await bot.sendMessage(
        groupChatId,
        `📅 No games played last month! Let's make this month legendary! 🎯`
      );
      return;
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    const [winner, total] = sorted[0];

    const msg =
      `🎉 *Monthly Champion Announcement!* 🎉\n\n` +
      `🏆 ${winner} is the Wordle Legend for last month with *${total.toFixed(1)} points*! 👑🎁\n\n` +
      `Congratulations!`;
    await bot.sendMessage(groupChatId, msg, { parse_mode: 'Markdown' });

    const monthString = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'MonthlyWinners!A:B',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[monthString, winner]] }
    });
  });
};
