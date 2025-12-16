// schedules/streakSaturdayCron.js — recompute streaks, robust date+name normalisation, HTML safe
// Reports every Saturday at 10:00 as "Streak Saturday".
// Shows an "active" current streak ONLY if last play was within graceDays (today or yesterday).

const cron = require('node-cron');
const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');
const { getLocalDateString } = require('../utils');

module.exports = function streakSaturdayCron(bot, getAllScores, groupChatId) {
  const graceDays = Number(process.env.STREAK_RECENCY_DAYS ?? 1); // active if last play was today or yesterday

  // --- Helpers ---
  const escapeHtml = (t = '') =>
    String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function canonicalName(raw = '') {
    const display = String(raw).normalize('NFKC').replace(/\s+/g, ' ').trim();
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

    const d = new Date(s);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // timezone-safe day math in UTC
  function isoToEpochDays(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return NaN;
    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
    return Math.floor(Date.UTC(y, mo, d) / 86400000);
  }
  function daysBetweenISO(aIso, bIso) {
    return isoToEpochDays(bIso) - isoToEpochDays(aIso);
  }

  // Every Saturday at 10:00 (server time)
  cron.schedule('0 10 * * 6', async () => {
    console.log('📣 Streak Saturday cron triggered');

    try {
      const rows = await getAllScores();
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('ℹ️ Streak Saturday: no score rows.');
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

        const played = attempts !== 'X' || (Number.isFinite(score) && score > 0);
        if (!played) continue;

        const { key, display } = canonicalName(nameRaw);
        if (!players.has(key)) players.set(key, { display, dates: new Set() });
        players.get(key).dates.add(dateIso);
      }

      if (players.size === 0) {
        console.log('ℹ️ Streak Saturday: no valid streak data.');
        return;
      }

      const today = getLocalDateString(new Date()); // UK-aligned "today"

      const computed = [];
      for (const { display, dates } of players.values()) {
        const playedDates = Array.from(dates).sort();
        const lastPlayIso = playedDates[playedDates.length - 1];
        const { current, max } = calculateCurrentAndMaxStreak(playedDates);
        const gap = daysBetweenISO(lastPlayIso, today);
        const activeCurrent = gap <= graceDays ? current : 0;
        computed.push([display, { current: activeCurrent, max }]);
      }

      const top = computed
        .sort((a, b) => {
          const ca = a[1].current, cb = b[1].current;
          if (cb !== ca) return cb - ca;
          const ma = a[1].max, mb = b[1].max;
          if (mb !== ma) return mb - ma;
          return String(a[0]).localeCompare(String(b[0]), 'en', { sensitivity: 'base' });
        })
        .slice(0, 5);

      if (top.length === 0) {
        console.log('ℹ️ Streak Saturday: no players with active streaks.');
        return;
      }

      let text = '🔥 <b>Streak Saturday</b>\n\n';
      top.forEach(([name, { current, max }], i) => {
        const emoji = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔥';
        text += `${i + 1}. ${emoji} ${escapeHtml(name)}: ${current} days (max: ${max})\n`;
      });
      text += '\nKeep it rolling — play today to keep your fire alive! 🔥';

      await bot.sendMessage(groupChatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('🛑 Streak Saturday Cron Error:', err && err.stack ? err.stack : err);
    }
  });
};
