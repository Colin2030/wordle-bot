// schedules/lunchtimeCommentary.js — simplified daily scoreboard with reminder

const cron = require('node-cron');
const { getAllScores } = require('../utils');

module.exports = function(bot, getAllScores, groupChatId) {
  cron.schedule('0 13 * * *', () => {
    const delayMs = Math.floor(Math.random() * 300000); // up to 5 minutes
    setTimeout(async () => {
      const scores = await getAllScores();
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const todayScores = scores.filter(([date]) => date === today);
      if (todayScores.length === 0) return;

      const leaderboard = {};
      todayScores.forEach(([_, player, score]) => {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      });

      const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

      let text = `🍽️ *Lunchtime Wordle Leaderboard:*

`;
      sorted.forEach(([player, score], index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '✅';
        text += `${medal} ${player}: ${score.toFixed(1)} pts\n`;
      });

      text += `\nNot played yet? There’s still time to flex those braincells! 🧠`;

      await bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });
    }, delayMs);
  });
};
