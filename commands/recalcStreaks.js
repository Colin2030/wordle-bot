// /commands/recalcStreaks.js
// Admin-only: /recalcstreaks — recompute current/max for everyone (from raw rows) and post a table.

const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');

module.exports = function recalcStreaks(bot, getAllScores, groupChatId) {
  const admins = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  function isoDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const n = Number(s);
    if (Number.isFinite(n) && n > 25569 && n < 60000) {
      const ms = (n - 25569) * 86400000;
      const d = new Date(ms);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    }
    const d = new Date(s);
    if (isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  const escapeHtml = (t = '') =>
    String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  bot.onText(/\/recalcstreaks(?:@\w+)?$/i, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const username = (msg.from.username || '').toLowerCase();
    if (!admins.includes(username)) return;

    const rows = await getAllScores();

    // Build: player -> Set<ISO date> of completed plays
    const players = new Map();
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 5) continue;
      const [dateRaw, player, scoreRaw, , attemptsRaw] = row;
      if (!player || !dateRaw) continue;

      const dateIso = isoDate(dateRaw);
      if (!dateIso) continue;

      const attempts = String(attemptsRaw ?? '').trim().toUpperCase();
      const score = Number(scoreRaw);
      const completed = attempts !== 'X' || (Number.isFinite(score) && score > 0);
      if (!completed) continue;

      if (!players.has(player)) players.set(player, new Set());
      players.get(player).add(dateIso);
    }

    if (players.size === 0) {
      await bot.sendMessage(chatId, 'No valid streak data to recalc.', { parse_mode: 'HTML' });
      return;
    }

    const table = [];
    for (const [name, dates] of players.entries()) {
      const arr = Array.from(dates).sort();
      const { current, max } = calculateCurrentAndMaxStreak(arr);
      table.push({ name, current, max });
    }

    // Sort display: current desc, then max desc, then name
    table.sort((a, b) => {
      if (b.current !== a.current) return b.current - a.current;
      if (b.max !== a.max) return b.max - a.max;
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    });

    // Pretty text table (HTML <pre>)
    const rowsTxt = table.map((r, i) =>
      `${String(i + 1).padStart(2)}. ${r.name.padEnd(18)}  cur:${String(r.current).padStart(3)}  max:${String(r.max).padStart(3)}`
    ).join('\n');

    const header = '🧮 <b>Recalculated Streaks (dry run)</b>\n<pre>\n' + escapeHtml(rowsTxt) + '\n</pre>\n' +
      'No sheet changes were made. If this looks correct, I can wire write-back safely (per row) with Google Sheets API.';
    await bot.sendMessage(chatId, header, { parse_mode: 'HTML' });
  });
}
