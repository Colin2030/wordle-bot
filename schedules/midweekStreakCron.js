const cron = require('node-cron');

module.exports = function midweekStreakCron(bot, groupChatId, getAllScores) {
  cron.schedule('0 10 * * 3', async () => {
    try {
      const scores = await getAllScores();
      const streakMap = {};

      for (const row of scores) {
        const [date, player, , , , currentStreak, maxStreak] = row;
        const current = parseInt(currentStreak || '0', 10);
        const max = parseInt(maxStreak || '0', 10);

        if (!streakMap[player] || current > streakMap[player].current) {
          streakMap[player] = { current, max };
        }
      }

      const sorted = Object.entries(streakMap)
        .sort((a, b) => b[1].current - a[1].current)
        .slice(0, 5);

      if (sorted.length === 0) return;

      let text = `🔥 *Midweek Wordle Streak Watch!*\n\n`;
      sorted.forEach(([player, { current, max }], i) => {
        const emoji = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔥';
        text += `${i + 1}. ${emoji} ${player}: ${current} days (max: ${max})\n`;
      });

      text += `\nKeep it going! Every day counts. 💪`;

      await bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error("🛑 Midweek Streak Cron Error:", err);
    }
  });
};
