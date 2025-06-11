module.exports = function nerdyAnnouncement(bot, _, groupChatId) {
  bot.onText(/\/announce(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const welcome = `👋 *Welcome, Eloise!* 🎉\n\n`
      + `You've just entered the Wordle Coliseum — where guesses are bold, scores are sacred, and bragging rights are earned daily.\n\n`
      + `📜 Quick rules:\n`
      + `• Post your Wordle score each day – no lurking!\n`
      + `• Fridays = DOUBLE POINTS. Strategy matters.\n`
      + `• Track your glory on the leaderboards.\n\n`
      + `Type /help to explore your new arsenal of commands.\n\n`
      + `Good luck, Eloise – the competition is *fierce*. 🔥\n\n`;

  bot.sendMessage(groupChatId, welcome + announcement, { parse_mode: 'Markdown' });
  });
};