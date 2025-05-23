module.exports = function about(bot, _, groupChatId) {
  bot.onText(/\/about(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const aboutText = `ℹ️ *About This Bot:*\n\n`
      + `Welcome to the Wordle Workers group! 🎉\n\n`
      + `✅ Tracks your daily Wordle scores\n`
      + `✅ Crowns daily, weekly, and monthly champions 🏆\n`
      + `✅ DOUBLE POINTS every Friday 🎯\n\n`
      + `Built with 💪 by Colin — and ChatGPT 🤖\n`
      + `Good luck — one guess to rule them all! 🎯`;

    bot.sendMessage(msg.chat.id, aboutText, { parse_mode: 'Markdown' });
  });
};
