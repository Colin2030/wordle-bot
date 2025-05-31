const escapeMarkdown = (text) =>
  text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

module.exports = function(bot, getAllScores, groupChatId) {
  const allowedUserIds = [7229240822]; // 👈 Your Telegram user ID

  bot.onText(/\/say(?:@[\w_]+)? (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const message = match[1];

    // ✅ Authorisation
    if (!allowedUserIds.includes(userId)) {
      bot.sendMessage(msg.chat.id, "⛔ You are not authorised to speak through me.");
      return;
    }

    // ✅ Always delete the original command if possible (optional)
    if (msg.chat.type !== 'private') {
      bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
    }

    // ✅ Send only to the group
    const safeMessage = escapeMarkdown(message);
    bot.sendMessage(groupChatId, safeMessage, { parse_mode: 'MarkdownV2' });
  });
};


