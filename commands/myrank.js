module.exports = function myrank(bot, getAllScores, groupChatId) {
  bot.onText(/\/myrank(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const scores = await getAllScores();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const leaderboard = {};
    const streaks = {}; // { player: [currentStreak, maxStreak] }

    for (const [date, player, score, , , currentStreak, maxStreak] of scores) {
      if (date === today) {
        leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
      }
      streaks[player] = [parseInt(currentStreak || 1), parseInt(maxStreak || 1)];
    }

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
    const user = msg.from.first_name;
    const rank = sorted.findIndex(([player]) => player === user);

    if (rank === -1) {
      bot.sendMessage(chatId, `😬 ${user}, you haven't even played yet! Are you even Wordling, bro? 🧠🎯`, { parse_mode: 'Markdown' });
    } else {
      const [player, score] = sorted[rank];
      const [currentStreak, maxStreak] = streaks[player] || [1, 1];

      let streakEmoji = '';
      if (currentStreak === 1) streakEmoji = '💩';
      else if (currentStreak >= 100) streakEmoji = '🔥🔥🔥🔥🔥';
      else if (currentStreak >= 50) streakEmoji = '🔥🔥🔥🔥';
      else if (currentStreak >= 30) streakEmoji = '🔥🔥🔥';
      else if (currentStreak >= 20) streakEmoji = '🔥🔥';
      else if (currentStreak >= 10) streakEmoji = '🔥';

      bot.sendMessage(chatId,
        `🏅 ${player}, you're ranked #${rank + 1} with ${score} points today!\n${streakEmoji} Current Streak: ${currentStreak} days | Max Streak: ${maxStreak} days`,
        { parse_mode: 'Markdown' }
      );
    }
  });
};
