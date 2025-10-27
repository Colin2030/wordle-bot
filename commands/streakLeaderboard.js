// /commands/streakLeaderboard.js
// Recomputes streaks from raw rows, robust date+name normalisation, HTML-safe output.
// Shows an "active" current streak ONLY if last play was within graceDays (today or yesterday).

const { calculateCurrentAndMaxStreak } = require('../streakUtils');

module.exports = function streakLeaderboard(bot, getAllScores, groupChatId) {
  // --- Config ---
  const graceDays = 1; // treat streak as active if last play was within 1 day

  // --- Helpers ---
  const escapeHtml = (text = '') =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function canonicalName(raw = '') {
    const display = String(raw).normalize('NFKC').replace(/\s+/g, ' ').trim();
    // Strip emojis & punctuation for the *key* so “Alex”, “Alex 🤖”, “Alex-” group together.
    const key = display
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return { key: key || display.toLowerCase(), display };
  }

  function isoDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();

    // Already ISO YYYY-MM-DD?
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Google Sheets serial (days since 1899-12-30)
    const n = Number(s);
    if (Number.isFinite(n) && n > 25569 && n < 60000) {
      const ms = (n - 25569) * 86400000;
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // Fallback parse
    const d = new Date(s);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function daysBetweenISO(aIso, bIso) {
    const a = new Date(aIso); a.setHours(0,0,0,0);
    const b = new Date(bIso); b.setHours(0,0,0,0);
    return Math.round((b - a) / 86400000);
  }

  function todayISO() {
    const d = new Date();
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

      // Row: [date, player, score, wordleNo, attempts, currentStreak, maxStreak]
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const [dateRaw, nameRaw, scoreRaw, , attemptsRaw] = row;
        if (!nameRaw || !dateRaw) continue;

        const dateIso = isoDate(dateRaw);
        if (!dateIso) continue;

        const attempts = String(attemptsRaw ?? '').trim().toUpperCase();
        const score = Number(scoreRaw);

        // Consider "played" only when an actual game was completed:
        // - attempts != 'X' (completed), OR
        // - score > 0 (belt-and-braces for any legacy rows)
        const played = attempts !== 'X' || (Number.isFinite(score) && score > 0);
        if (!played) continue;

        const { key, display } = canonicalName(nameRaw);
        if (!players.has(key)) players.set(key, { display, dates: new Set() });
        players.get(key).dates.add(dateIso);
      }

      if (players.size === 0) {
        await bot.sendMessage(chatId, '🤷‍♀️ No streaks found yet. Go solve some Wordles!');
        return;
      }

      const today = todayISO();

      // Recompute streaks and apply recency gate for "active current"
      const computed = [];
      for (const { display, dates } of players.values()) {
        const playedDates = Array.from(dates).sort();       // ISO sorts lexicographically = chronologically
        const lastPlayIso = playedDates[playedDates.length - 1]; // derive last play from the actual set
        const { current, max } = calculateCurrentAndMaxStreak(playedDates);
        const gap = daysBetweenISO(lastPlayIso, today);
        const activeCurrent = gap <= graceDays ? current : 0;    // gate by recency (today or yesterday)
        computed.push([display, { current: activeCurrent, max }]);
      }

      // Sort: current desc, then max desc, then name asc
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
