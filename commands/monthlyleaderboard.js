// /monthlyleaderboard — command showing monthly totals with decimal formatting
module.exports = function monthlyleaderboard(bot, getAllScores, groupChatId) {
  bot.onText(/\/monthlyleaderboard(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const leaderboard = {};

    for (const row of scores) {
      const [date, player, score] = row;

      // Skip if missing data or malformed
      if (!date || !player || isNaN(score)) continue;

      const entryDate = new Date(date);
      if (entryDate >= firstOfMonth && entryDate <= now) {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      }
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

    let text = `📅 *This Month's Wordle Warriors:*\n\n`;

    if (sorted.length === 0) {
      text += `No scores recorded yet this month! Start Wordling! 🎯`;
    } else {
      const topScore = sorted[0][1];
      sorted.forEach(([player, score], index) => {
        const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        const closingIn = index !== 0 && topScore - score <= 30 ? ' 🔥 Closing in!' : '';
        text += `${index + 1}. ${medal} ${player}: ${score.toFixed(1)} pts${closingIn}\n`;
      });
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};
