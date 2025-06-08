// /leaderboard — show today's scores with decimal formatting

module.exports = function leaderboard(bot, getAllScores, groupChatId) {
  bot.onText(/\/leaderboard(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const leaderboard = {};

    for (const [date, player, score] of scores) {
      if (date === today) {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      }
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    let text = `📈 *Today's Leaderboard:*

`;

    if (sorted.length === 0) {
      text += `No scores submitted yet today! Don’t make me call HR. 😜`;
    } else {
      sorted.forEach(([player, score], index) => {
        const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        text += `${index + 1}. ${medal} ${player}: ${score.toFixed(1)} pts\n`;
      });
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};