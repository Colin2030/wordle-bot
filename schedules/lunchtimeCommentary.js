const cron = require('node-cron');
const { getAllScores } = require('../utils');

module.exports = function(bot, getAllScores, groupChatId) {
  const weekdayNudges = [
    "Not played yet? There’s still time to flex those braincells! 🧠",
    "Don’t let the leaderboard scare you — take your shot! 🎯",
    "Step away from your spreadsheet and Wordle it out. ⌨️🧠",
    "Lunch tastes better after a Wordle win. 🍽️🟩",
    "Brains need food *and* puzzles — feed yours. 🧠🥪",
    "Top scores still within reach — don’t let Trish win again. 😉",
    "Procrastinate productively: solve a Wordle. ✅",
    "Even guessing wildly is better than not playing. 🎲",
    "One guess to rule them all… will it be yours? 💍🟩",
    "We believe in you. Probably. Go Wordle! ✨"
  ];

  const fridayNudges = [
    "It's DOUBLE POINTS FRIDAY. If you're not Wordling, you're losing. 🔥",
    "Friday Wordles hit different — drop everything and flex. 🧠💪",
    "Still not posted? Your enemies thank you. 😏",
    "Don’t let Darren win again. Seriously. Do something. 😤",
    "Double points. Infinite regret if you forget. 🎯",
    "Big plays only. The leaderboard won’t humble itself. 👑",
    "This is your villain origin story if you skip today. 😈",
    "We are judging you. Silently. But fiercely. 🔍",
    "Fridays are for Wordle legends. Not lurkers. 🕶️🟩",
    "Show up. Guess big. Break streaks. Be epic. 💥"
  ];

  cron.schedule('0 13 * * *', () => {
    const delayMs = Math.floor(Math.random() * 300000); // up to 5 minutes

    setTimeout(async () => {
      const scores = await getAllScores();
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isFriday = now.getDay() === 5;

      const todayScores = scores.filter(([date]) => date === today);
      if (todayScores.length === 0) return;

      const leaderboard = {};
      todayScores.forEach(([_, player, score]) => {
        leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
      });

      const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

      let text = `🍽️ *Lunchtime Wordle Leaderboard:*\n\n`;
      sorted.forEach(([player, score], index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '✅';
        text += `${medal} ${player}: ${score.toFixed(1)} pts\n`;
      });

      const nudgePool = isFriday ? fridayNudges : weekdayNudges;
      const nudge = nudgePool[Math.floor(Math.random() * nudgePool.length)];

      text += `\n${nudge}`;

      await bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });
    }, delayMs);
  });
};
