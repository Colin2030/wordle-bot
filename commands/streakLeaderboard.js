// /commands/streakLeaderboard.js
// Recomputes streaks from raw rows (like handleSubmission), HTML-safe output.

const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');

module.exports = function streakLeaderboard(bot, getAllScores, groupChatId) {
  // Minimal HTML escaper for Telegram HTML mode
  function escapeHtml(text = '') {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // /streakleaderboard (case-insensitive, with optional @mention)
  bot.onText(/\/streakleaderboard(?:@\w+)?/i, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    try {
      const rows = await getAllScores();
      if (!Array.isArray(rows) || rows.length === 0) {
        await bot.sendMessage(chatId, '🤷‍♂️ No data yet — play a few games and try again.');
        return;
      }

      // Build: player -> Set of dates they played (attempts !== 'X')
      // Row shape expected: [date, player, score, wordleNo, attempts, currentStreak, maxStreak]
      const datesByPlayer = new Map();
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const [date, player, , , attempts] = row;
        if (!player || !date) continue;
        if (String(attempts).toUpperCase() === 'X') continue; // don't count fails as "played"
        if (!datesByPlayer.has(player)) datesByPlayer.set(player, new Set());
        datesByPlayer.get(player).add(String(date));
      }

      if (datesByPlayer.size === 0) {
        await bot.sendMessage(chatId, '🤷‍♀️ No streaks found yet. Go solve some Wordles!');
        return;
      }

      // Recompute streaks just like handleSubmission does
      const computed = [];
      for (const [player, dateSet] of datesByPlayer.entries()) {
        const playedDates = Array.from(dateSet);
        const { current, max } = calculateCurrentAndMaxStreak(playedDates);
        computed.push([player, { current, max }]);
      }

      // Sort: current desc, then max desc, then name asc (case-insensitive)
      const sorted = computed
        .sort((a, b) => {
          const ca = a[1].current, cb = b[1].current;
          if (cb !== ca) return cb - ca;
          const ma = a[1].max, mb = b[1].max;
          if (mb !== ma) return mb - ma;
          return String(a[0]).localeCompare(String(b[0]), 'en', { sensitivity: 'base' });
        })
        .slice(0, 10);

      let text = '🔥 <b>Top Wordle Streaks</b>\n\n';
      sorted.forEach(([name, { current, max }], i) => {
        const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔥';
        text += `${i + 1}. ${medal} ${escapeHtml(name)}: ${current} days (max: ${max})\n`;
      });

      await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      try {
        console.error('Error in /streakleaderboard:', err && err.stack ? err.stack : err);
      } catch {}
      try {
        await bot.sendMessage(chatId, '⚠️ Couldn’t build the streak leaderboard just now. Try again shortly.');
      } catch {}
    }
  });
};
