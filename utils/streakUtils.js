// utils/streakUtils.js — robust streak calculator
// - No weird defaults
// - Current streak ends at the most recent play (unless you opt-in to anchor to today)

function normalizeDate(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/**
 * Calculate current and max streaks from a list of date strings.
 * @param {string[]} dateStrings - dates the user played (one per day), any parseable format.
 * @param {{ anchorToday?: boolean }} [opts]
 *   - anchorToday=false (default): current streak ends at the most recent play, even if that was yesterday.
 *   - anchorToday=true: current streak counts only if the last play was today (matches your submission reply logic).
 */
function calculateCurrentAndMaxStreak(dateStrings, opts = {}) {
  const { anchorToday = false } = opts;

  if (!Array.isArray(dateStrings) || dateStrings.length === 0) {
    return { current: 0, max: 0 };
  }

  // Unique + normalized + sorted
  const unique = Array.from(new Set(dateStrings.map(String)));
  const sorted = unique.map(normalizeDate).sort((a, b) => a - b);

  // Max streak
  let maxStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (sorted[i] - sorted[i - 1]) / 86400000;
    if (diffDays === 1) {
      run++;
    } else if (diffDays > 1) {
      if (run > maxStreak) maxStreak = run;
      run = 1;
    }
  }
  if (run > maxStreak) maxStreak = run;

  // Current streak (ending at most recent play)
  let current = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const diffDays = (sorted[i] - sorted[i - 1]) / 86400000;
    if (diffDays === 1) current++;
    else if (diffDays > 1) break;
  }

  // Optional: anchor to *today* (used by submission reply)
  if (anchorToday) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastPlay = sorted[sorted.length - 1];
    if (lastPlay.getTime() !== today.getTime()) current = 0;
  }

  return { current, max: maxStreak };
}

module.exports = { calculateCurrentAndMaxStreak };
