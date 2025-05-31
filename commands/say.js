module.exports = function(bot, getAllScores, groupChatId) {
  const allowedUserIds = [7229240822]; // your Telegram user ID

  bot.onText(/\/say(?:@[\w_]+)? (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const message = match[1];

    if (String(chatId) !== String(groupChatId)) return;
    if (!allowedUserIds.includes(userId)) {
      bot.sendMessage(chatId, "⛔ You are not authorised to speak through me.");
      return;
    }

    // Delete the command message
    bot.deleteMessage(chatId, msg.message_id).catch(() => {
      console.warn("Couldn't delete the user's command message");
    });

    // Send the bot message
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
};

