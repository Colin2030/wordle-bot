// streakLeaderboard.js — current streaks (latest row), HTML-safe, tidy sorting
// Signature matches your other commands: (bot, getAllScores, groupChatId)
module.exports = function streakLeaderboard(bot, getAllScores, groupChatId) {
  // Minimal HTML escaper for Telegram HTML mode
  function escapeHtml(text = '') {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // support /streakleaderboard and bot mentions (case-insensitive)
  bot.onText(/\/streakleaderboard(?:@\w+)?/i, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    try {
      const rows = await getAllScores();
      if (!rows || !rows.length) {
        await bot.sendMessage(chatId, '🤷‍♂️ No data yet — play a few games and try again.');
        return;
      }

      // Build latest-by-player map: { player -> { date, current, max } }
      const latest = new Map();
      for (const row of rows) {
        // Expected shape: [date, player, score, wordleNo, attempts, current, max]
        const [date, player, , , , currentStreak, maxStreak] = row;
        if (!player || !date) continue;

        // Keep the newest date per player (rows may not be sorted)
        const prev = latest.get(player);
        if (!prev || date > prev.date) {
          const current = Number.parseInt(currentStreak, 10) || 0;
          const max = Number.parseInt(maxStreak, 10) || 0;
          latest.set(player, { date, current, max });
        }
      }

      if (latest.size === 0) {
        await bot.sendMessage(chatId, '🤷‍♀️ No streaks found yet. Go solve some Wordles!');
        return;
      }

      // Sort: current desc, then max desc, then name asc
      const sorted = [...latest.entries()]
        .sort((a, b) => {
          const ca = a[1].current, cb = b[1].current;
          if (cb !== ca) return cb - ca;
          const ma = a[1].max, mb = b[1].max;
          if (mb !== ma) return mb - ma;
          return a[0].localeCompare(b[0], 'en', { sensitivity: 'base' });
        })
        .slice(0, 10);

      let text = '🔥 <b>Top Wordle Streaks</b>\n\n';
      sorted.forEach(([name, { current, max }], i) => {
        const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔥';
        text += `${i + 1}. ${medal} ${escapeHtml(name)}: ${current} days (max: ${max})\n`;
      });

      await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('Error in /streakleaderboard:', err);
      await bot.sendMessage(
        chatId,
        '⚠️ Couldn’t build the streak leaderboard just now. Try again shortly.'
      );
    }
  });
};
