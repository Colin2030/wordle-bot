const escapeMarkdown = (text) =>
  text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

module.exports = function(bot, getAllScores, groupChatId) {
  const allowedUserIds = [7229240822]; // Replace with your Telegram user ID

  bot.onText(/\/say(?:@[\w_]+)? (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const rawMessage = match[1];

    if (String(chatId) !== String(groupChatId)) return;
    if (!allowedUserIds.includes(userId)) {
      bot.sendMessage(chatId, "⛔ You are not authorised to speak through me.");
      return;
    }

    // Delete the user's command message
    bot.deleteMessage(chatId, msg.message_id).catch(() => {
      console.warn("Couldn't delete the user's /say command message");
    });

    // Escape unsafe Markdown characters
    const safeMessage = escapeMarkdown(rawMessage);

    // Send the cleaned message with formatting
    bot.sendMessage(chatId, safeMessage, { parse_mode: 'MarkdownV2' });
  });
};

