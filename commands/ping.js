module.exports = function ping(bot, _, groupChatId) {
  bot.onText(/\/ping(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;
    bot.sendMessage(msg.chat.id, "🏓 Pong!");
  });
};
