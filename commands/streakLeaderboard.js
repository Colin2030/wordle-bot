// /commands/streakLeaderboard.js
// Recomputes streaks from raw rows (like handleSubmission), HTML-safe output.

const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');

module.exports = function streakLeaderboard(bot, getAllScores, groupChatId) {
  // --- Helpers ---
  const escapeHtml = (text = '') =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function canonicalName(raw = '') {
    const display = String(raw).normalize('NFKC').replace(/\s+/g, ' ').trim();
    const key = display.toLowerCase();
    return { key, display };
  }

  function isoDate(raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

      // Build: key -> { display, dates:Set }
      const players = new Map();

      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const [dateRaw, nameRaw, , , attempts] = row;
        if (!nameRaw || !dateRaw) continue;

        const date = isoDate(String(dateRaw));
        if (!date) continue; // skip unparseable dates
        if (String(attempts).toUpperCase() === 'X') continue; // X doesn't count as "played"

        const { key, display } = canonicalName(nameRaw);
        if (!players.has(key)) players.set(key, { display, dates: new Set() });
        players.get(key).dates.add(date);
      }

      if (players.size === 0) {
        await bot.sendMessage(chatId, '🤷‍♀️ No streaks found yet. Go solve some Wordles!');
        return;
      }

      // Recompute streaks just like handleSubmission does
      const computed = [];
      for (const { display, dates } of players.values()) {
        const playedDates = Array.from(dates);
        const { current, max } = calculateCurrentAndMaxStreak(playedDates);
        computed.push([display, { current, max }]);
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
