module.exports = function lastweekchamp(bot, getAllScores, groupChatId) {
  bot.onText(/\/lastweekchamp(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const now = new Date();

    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const leaderboard = {};
    for (const [date, player, score] of scores) {
      const entryDate = new Date(date);
      if (entryDate >= lastMonday && entryDate <= lastSunday) {
        leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
      }
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      bot.sendMessage(chatId, `🤷‍♂️ No scores were recorded last week. Slacking off, were we?`);
      return;
    }

    const [winnerName, winnerScore] = sorted[0];
    bot.sendMessage(chatId, `👑 *Last week's Champion:*\n\n${winnerName} with ${winnerScore} points! Congratulations! 🎉`, { parse_mode: 'Markdown' });
  });
};
