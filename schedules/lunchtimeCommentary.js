const cron = require('node-cron');
const { getAllScores } = require('../utils');

module.exports = function(bot, getAllScores, groupChatId) {
  const weekdayNudges = [
  "Oh look, another day to pretend you’re good at Wordle. Prove it. 🧠",
  "Leaderboard looking a bit… intimidating? Fix that. 🎯",
  "You’ve spent longer deciding lunch. Just play already. 🍔🟩",
  "No entry yet? Bold strategy. Let’s see how that works out. 😏",
  "Your future self would like one (1) Wordle victory, please. ⏳",
  "Someone worse than you has already posted. Think about that. 💀",
  "It’s literally five guesses. You’ve done harder things. Probably. 🤷",
  "Stop lurking. Start guessing. Minimal effort, maximum smugness. 😌",
  "You miss 100% of the Wordles you don’t play. – Someone wise-ish 🎤",
  "Go on, give the leaderboard something to talk about. 👀"
];

const fridayNudges = [
  "DOUBLE POINTS FRIDAY and you’re still hesitating? Embarrassing. 🔥",
  "This is where legends rise and excuses quietly log off. 🧠👑",
  "Skip today and we *will* remember. Not fondly. 😌",
  "Double points means double the glory… or double the shame. Your call. 🎯",
  "If you’re not playing today, you’re basically donating points. 💸",
  "Main character energy only. Don’t fumble it now. 🎬",
  "This leaderboard isn’t going to climb itself. Move. 🧗",
  "Imagine not capitalising on double points. Couldn’t be you… right? 😬",
  "Big talk all week just to ghost on Friday? Yikes. 😏",
  "Go make it hurt for everyone else. That’s the spirit. 💥"
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
