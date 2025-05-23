const { getAllScores } = require('../utils');

module.exports = function streakLeaderboard(bot, groupChatId) {
  bot.onText(/\/streakleaderboard(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const streakMap = {};

    for (const row of scores) {
      const [date, player, , , , currentStreak, maxStreak] = row;
      const current = parseInt(currentStreak || 0);
      const max = parseInt(maxStreak || 0);
      if (!streakMap[player] || current > streakMap[player].current) {
        streakMap[player] = { current, max };
      }
    }

    const sorted = Object.entries(streakMap)
      .sort((a, b) => b[1].current - a[1].current)
      .slice(0, 10);

    let text = `🔥 *Top Wordle Streaks*\n\n`;
    sorted.forEach(([player, { current, max }], i) => {
      const emoji = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔥';
      text += `${i + 1}. ${emoji} ${player}: ${current} days (max: ${max})\n`;
    });

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};
