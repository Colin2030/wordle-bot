// midweekStreakCron.js — recompute streaks + correct signature + HTML safe
const cron = require('node-cron');
const { calculateCurrentAndMaxStreak } = require('../utils/streakUtils');

/**
 * Signature matches your loader: (bot, getAllScores, groupChatId)
 */
module.exports = function midweekStreakCron(bot, getAllScores, groupChatId) {
  // Minimal HTML escaper for Telegram HTML mode
  const escapeHtml = (t = '') =>
    String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // Every Wednesday at 10:00 (server time)
  cron.schedule('0 10 * * 3', async () => {
    console.log('🕘 Midweek streak cron triggered');

    try {
      const rows = await getAllScores();
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('ℹ️ Midweek streak cron: no score rows.');
        return;
      }

      // Build player -> Set of dates they played (attempts !== 'X')
      // Row: [date, player, score, wordleNo, attempts, currentStreak, maxStreak]
      const datesByPlayer = new Map();
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const [date, player, , , attempts] = row;
        if (!player || !date) continue;
        if (String(attempts).toUpperCase() === 'X') continue; // only count completed games
        if (!datesByPlayer.has(player)) datesByPlayer.set(player, new Set());
        datesByPlayer.get(player).add(String(date));
      }

      if (datesByPlayer.size === 0) {
        console.log('ℹ️ Midweek streak cron: no valid streak data.');
        return;
      }

      // Recompute streaks like handleSubmission does
      const computed = [];
      for (const [player, dateSet] of datesByPlayer.entries()) {
        const playedDates = Array.from(dateSet);
        const { current, max } = calculateCurrentAndMaxStreak(playedDates);
        computed.push([player, { current, max }]);
      }

      // Take top 5: current desc, then max desc, then name asc
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
