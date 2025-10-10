// /commands/streakLeaderboard.js
// Recomputes streaks from raw rows, with robust date + name normalisation. HTML-safe output.

const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');

module.exports = function streakLeaderboard(bot, getAllScores, groupChatId) {
  // --- Helpers ---
  const escapeHtml = (text = '') =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function canonicalName(raw = '', dateIso = '0000-00-00') {
    const display = String(raw).normalize('NFKC').replace(/\s+/g, ' ').trim();
    // Strip emojis & punctuation for the *key* so “Alex”, “Alex 🤖”, “Alex-” group together.
    const key = display
      // remove most emojis
      .replace(/\p{Extended_Pictographic}/gu, '')
      // remove punctuation/symbols (keep letters/numbers/spaces)
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return { key: key || display.toLowerCase(), display, dateIso };
  }

  function isoDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();

    // Already ISO YYYY-MM-DD?
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Numeric Google Sheets serial date? (days since 1899-12-30)
    const n = Number(s);
    if (Number.isFinite(n) && n > 25569 && n < 60000) {
      const ms = (n - 25569) * 86400000; // convert to Unix ms
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // Fallback: Date() parse (handles 10/09/2025, "9 Oct 2025", etc.)
    const d = new Date(s);
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

      // Build: key -> { display, dates:Set, latestDateIso }
      const players = new Map();

      // Row shape: [date, player, score, wordleNo, attempts, currentStreak, maxStreak]
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const [dateRaw, nameRaw, scoreRaw, , attemptsRaw] = row;
        if (!nameRaw || !dateRaw) continue;

        const dateIso = isoDate(dateRaw);
        if (!dateIso) continue; // skip unparseable dates

        const attempts = String(attemptsRaw ?? '').trim();
        const score = Number(scoreRaw);

        // Consider "played" if attempts != 'X' OR score > 0 (covers any weird logging)
        const played = attempts.toUpperCase() !== 'X' || (Number.isFinite(score) && score > 0);
        if (!played) continue;

        const { key, display } = canonicalName(nameRaw, dateIso);
        if (!players.has(key)) players.set(key, { display, dates: new Set(), latestDateIso: '0000-00-00' });

        const entry = players.get(key);
        entry.dates.add(dateIso);
        if (dateIso > entry.latestDateIso) {
          entry.latestDateIso = dateIso;
          entry.display = display; // keep the most recent display name
        }
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
