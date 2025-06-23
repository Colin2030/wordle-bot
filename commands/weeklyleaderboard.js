// /weeklyleaderboard — shows this week’s scores with decimal precision
module.exports = function weeklyleaderboard(bot, getAllScores, groupChatId) {
  bot.onText(/\/weeklyleaderboard(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const now = new Date();

    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const leaderboard = {};

    for (const row of scores) {
      const [date, player, score] = row;
      if (!date || !player || isNaN(score)) continue;

      const entryDate = new Date(date);
      if (entryDate >= monday && entryDate <= now) {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      }
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    let text = `📅 *This Week's Wordle Legends:*\n\n`;

    if (sorted.length === 0) {
      text += `No scores yet this week. Get Wordling! 🎯`;
    } else {
      sorted.forEach(([player, score], index) => {
        const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        text += `${index + 1}. ${medal} ${player}: ${score.toFixed(1)} pts\n`;
      });
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};
