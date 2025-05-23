module.exports = function help(bot, _, groupChatId) {
  bot.onText(/\/help(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const helpText = `🤖 *Wordle Bot Commands:*\n\n`
      + `/ping - Check if I'm alive 🏓\n`
      + `/leaderboard - Today's scores 📈\n`
      + `/weeklyleaderboard - This week's scores 📅\n`
      + `/monthlyleaderboard - Monthly legends 🏆\n`
      + `/lastweekchamp - Last week's champ 👑\n`
      + `/myrank - See your stats 🏅\n`
      + `/rules - The official Wordle creed 📜\n`
      + `/scoring - Scoring explained 🎯\n`
      + `/help - List all commands 🆘\n`
      + `/about - Info about this bot ℹ️\n\n`
      + `Post your Wordle score anytime to compete! 🎯`;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  });
};
