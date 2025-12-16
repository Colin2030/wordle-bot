// commands/streakgraph.js — retired lightweight stub (no external deps)
module.exports = function streakGraph(bot, getAllScores, groupChatId) {
  bot.onText(/\/streakgraph(?:@\w+)?/i, (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    bot.sendMessage(
      chatId,
      "📉 The streak graph feature has been retired for now — the new Streak Saturday + leaderboard cover the essentials. If you want it back, shout and I’ll re-enable it with a lighter charting approach."
    );
  });
};
