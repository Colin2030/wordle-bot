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

    for (const [date, player, score] of scores) {
      const entryDate = new Date(date);
      if (entryDate >= monday && entryDate <= now) {
        leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
      }
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    let text = `📅 *This Week's Wordle Legends:*\n\n`;

    if (sorted.length === 0) {
      text += `No scores yet this week. Get Wordling! 🎯`;
    } else {
      sorted.forEach(([player, score], index) => {
        let medal = '';
        if (index === 0) medal = '🏆';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        text += `${index + 1}. ${medal} ${player}: ${score} pts\n`;
      });
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};
