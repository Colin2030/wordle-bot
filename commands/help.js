module.exports = function help(bot, _, groupChatId) {
  bot.onText(/\/help(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const helpText = `🤖 *Wordle Bot Commands:*

`
      + `/ping - Check if I'm alive 🏓\n`
      + `/leaderboard - Today's scores 📈\n`
      + `/weeklyleaderboard - This week's scores so far 📅\n`
      + `/monthlyleaderboard - Monthly legends 🏆\n`
      + `/top10 - All-time top scorers 🥇\n`
      + `/lastweekchamp - Last week's champion 👑\n`
      + `/myrank - See your stats 🏅\n`
      + `/streakleaderboard - See the top current streaks 🔥\n`
      + `/rules - The official Wordle creed 📜\n`
      + `/scoring - Scoring explained 🎯\n`
      + `/debugscore - Run a test score breakdown 🧪\n`
      + `/help - List all commands 🆘\n`
      + `/about - Info about this bot ℹ️\n\n`
      + `Post your Wordle score anytime to compete! 🎯`;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  });
};
