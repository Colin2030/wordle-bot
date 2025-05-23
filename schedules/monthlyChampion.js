module.exports = function monthlyChampion(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');
  const { google } = require('googleapis');
  const fs = require('fs');

  const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

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

    const msg = `🎉 *Monthly Champion Announcement!* 🎉\n\n🏆 ${winner} is the Wordle Legend for last month with *${score} points*! 👑🎁\n\nCongratulations!`;
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
