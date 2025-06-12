// /top10 — shows all-time top 10 scorers with decimal precision
module.exports = function top10Leaderboard(bot, getAllScores, groupChatId) {
  bot.onText(/\/top10(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const leaderboard = {};

    for (const [date, player, score] of scores) {
      leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let text = `🏅 *Top 10 All-Time Wordlers:*

`;

    if (sorted.length === 0) {
      text += `No data yet! Let the games begin! 🎯`;
    } else {
      sorted.forEach(([player, score], index) => {
        const badge = index === 0 ? '👑' : index < 3 ? '🌟' : '✅';
        text += `${index + 1}. ${badge} ${player}: ${score.toFixed(1)} pts\n`;
      });
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};
