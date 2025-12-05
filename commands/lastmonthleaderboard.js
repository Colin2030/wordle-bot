// /lastmonthleaderboard — totals for the *previous* calendar month
module.exports = function lastMonthLeaderboard(bot, getAllScores, groupChatId) {
  bot.onText(/\/lastmonthleaderboard(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const now = new Date();

    // Start of this month (exclusive upper bound)
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfThisMonth.setHours(0, 0, 0, 0);

    // Start of last month (inclusive lower bound)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startOfLastMonth.setHours(0, 0, 0, 0);

    const leaderboard = {};

    for (const row of scores) {
      const [date, player, score] = row;

      // Skip if missing data or malformed
      if (!date || !player || isNaN(score)) continue;

      const entryDate = new Date(date);
      entryDate.setHours(0, 0, 0, 0);

      // Only include scores from last month
      if (entryDate >= startOfLastMonth && entryDate < startOfThisMonth) {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      }
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

    let text = `📅 *Last Month's Leaderboard:*\n\n`;

    if (sorted.length === 0) {
      text += `No scores recorded last month. Fresh start this month! 🎯`;
    } else {
      const topScore = sorted[0][1];

      sorted.forEach(([player, totalScore,], index) => {
        const medal =
          index === 0 ? '🏆' :
          index === 1 ? '🥈' :
          index === 2 ? '🥉' : '';

        const closingIn =
          index !== 0 && topScore - totalScore <= 30 ? ' 🔥 Closing in!' : '';

        text += `${index + 1}. ${medal} ${player}: ${totalScore.toFixed(1)} pts${closingIn}\n`;
      });
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};
