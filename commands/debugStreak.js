// /commands/debugStreak.js
// Admin-only: /debugstreak <name|@mention> — prints last play dates + computed streaks

const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');
const { getLocalDateString } = require('../utils');

module.exports = function debugStreak(bot, getAllScores, groupChatId) {
  const admins = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const escapeHtml = (t = '') =>
    String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

  const isoToEpochDays = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return NaN;
    return Math.floor(Date.UTC(+m[1], +m[2]-1, +m[3]) / 86400000);
  };
  const daysBetweenISO = (a, b) => isoToEpochDays(b) - isoToEpochDays(a);

  bot.onText(/\/debugstreak(?:@\w+)?\s+(.+)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const username = (msg.from.username || '').toLowerCase();
    if (!admins.includes(username)) return; // hard admin gate

    const q = match[1].trim().replace(/^@/, '');
    const rows = await getAllScores();
    const today = getLocalDateString(new Date());

    // Collect dates where player completed (attempts != 'X' or positive score as fallback)
    const played = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 5) continue;
      const [dateRaw, player, scoreRaw, , attemptsRaw] = row;
      if (!player) continue;
      const name = String(player).trim();
      if (name.toLowerCase() !== q.toLowerCase()) continue;

      const dateIso = isoDate(dateRaw);
      if (!dateIso) continue;

      const attempts = String(attemptsRaw ?? '').trim().toUpperCase();
      const score = Number(scoreRaw);
      const completed = attempts !== 'X' || (Number.isFinite(score) && score > 0);
      if (completed) played.push(dateIso);
    }

    if (played.length === 0) {
      await bot.sendMessage(chatId, `No completed plays found for <b>${escapeHtml(q)}</b>.`, { parse_mode: 'HTML' });
      return;
    }

    played.sort();
    const lastPlay = played[played.length - 1];
    const { current, max } = calculateCurrentAndMaxStreak(played);
    const gap = daysBetweenISO(lastPlay, today);

    const tail = played.slice(-20).map(d => `• ${d}`).join('\n');
    const txt = [
      `🧪 <b>Debug Streak</b> — <b>${escapeHtml(q)}</b>`,
      `Current: <b>${current}</b> | Max: <b>${max}</b>`,
      `Last play: <b>${lastPlay}</b> | Gap to today: <b>${gap}</b> day(s)`,
      '',
      `<b>Recent dates</b> (latest 20):`,
      escapeHtml(tail) || '—',
    ].join('\n');

    await bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
  });
}
