// midweekStreakCron.js — recompute streaks, robust date+name normalisation, HTML safe
const cron = require('node-cron');
const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');

module.exports = function midweekStreakCron(bot, getAllScores, groupChatId) {
  const escapeHtml = (t = '') =>
    String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function canonicalName(raw = '', dateIso = '0000-00-00') {
    const display = String(raw).normalize('NFKC').replace(/\s+/g, ' ').trim();
    const key = display
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return { key: key || display.toLowerCase(), display, dateIso };
  }

  function isoDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
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

  // Every Wednesday at 10:00 (server time)
  cron.schedule('0 10 * * 3', async () => {
    console.log('🕘 Midweek streak cron triggered');

    try {
      const rows = await getAllScores();
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('ℹ️ Midweek streak cron: no score rows.');
        return;
      }

      const players = new Map();

      // Row: [date, player, score, wordleNo, attempts, currentStreak, maxStreak]
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const [dateRaw, nameRaw, scoreRaw, , attemptsRaw] = row;
        if (!nameRaw || !dateRaw) continue;

        const dateIso = isoDate(dateRaw);
        if (!dateIso) continue;

        const attempts = String(attemptsRaw ?? '').trim();
        const score = Number(scoreRaw);
        const played = attempts.toUpperCase() !== 'X' || (Number.isFinite(score) && score > 0);
        if (!played) continue;

        const { key, display } = canonicalName(nameRaw, dateIso);
        if (!players.has(key)) players.set(key, { display, dates: new Set(), latestDateIso: '0000-00-00' });

        const entry = players.get(key);
        entry.dates.add(dateIso);
        if (dateIso > entry.latestDateIso) {
          entry.latestDateIso = dateIso;
          entry.display = display;
        }
      }

      if (players.size === 0) {
        console.log('ℹ️ Midweek streak cron: no valid streak data.');
        return;
      }

      const computed = [];
      for (const { display, dates } of players.values()) {
        const playedDates = Array.from(dates);
        const { current, max } = calculateCurrentAndMaxStreak(playedDates);
        computed.push([display, { current, max }]);
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
        console.log('ℹ️ Midweek streak cron: no players with streaks > 0.');
        return;
      }

      let text = '🔥 <b>Midweek Wordle Streak Watch</b>\n\n';
      top.forEach(([name, { current, max }], i) => {
        const emoji = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔥';
        text += `${i + 1}. ${emoji} ${escapeHtml(name)}: ${current} days (max: ${max})\n`;
      });
      text += '\nKeep it going — every day counts. 💪';

      await bot.sendMessage(groupChatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('🛑 Midweek Streak Cron Error:', err && err.stack ? err.stack : err);
    }
  });
};
