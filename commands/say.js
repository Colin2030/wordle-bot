module.exports = function(bot, getAllScores, groupChatId) {
  const allowedUserIds = [7229240822]; // Replace with your actual Telegram user ID

  bot.onText(/\/say(?:@[\w_]+)? (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const message = match[1];

    if (String(chatId) !== String(groupChatId)) return;
    if (!allowedUserIds.includes(userId)) {
      bot.sendMessage(chatId, "⛔ You are not authorised to speak through me.");
      return;
    }

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
};
