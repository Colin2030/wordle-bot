module.exports = function scoring(bot, _, groupChatId) {
  bot.onText(/\/scoring(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const scoringText = `🎯 *Wordle Scoring Explained!*\n\n`
      + `✅ Fewer guesses = More points!\n`
      + `✅ Bonus for extra 🟩 and 🟨 (excluding final row)\n`
      + `✅ Friday = DOUBLE POINTS! 🎉\n\n`
      + `*Points per Solve:*\n`
      + `- 1st try: 60 pts 🚀\n`
      + `- 2nd try: 45 pts 🔥\n`
      + `- 3rd try: 30 pts 🎯\n`
      + `- 4th try: 20 pts 🎯\n`
      + `- 5th try: 10 pts 🎯\n`
      + `- 6th try: 0 pts 😬\n\n`
      + `*Tile Bonus:*\n`
      + `- +1 per 🟩 (after first row)\n`
      + `- +0.5 per 🟨\n(max +10 bonus)\n\n`
      + `🧠 Solve smarter, score higher!`;

    bot.sendMessage(msg.chat.id, scoringText, { parse_mode: 'Markdown' });
  });
};
