module.exports = function sundaySummary(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');

  cron.schedule('0 20 * * 0', async () => {
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

    let text = `📢 *Weekly Wordle Legends!*\n\n`;

    if (sorted.length === 0) {
      text += `No scores recorded this week. Let's smash it next week! 🎯`;
    } else {
      sorted.forEach(([player, score], index) => {
        let medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        text += `${index + 1}. ${medal} ${player}: ${score} pts\n`;
      });
    }

    bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });
  });
};
