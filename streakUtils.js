// utils/streakUtils.js — robust, grace-aware streaks
function atLocalMidnight(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function getLocalDateString(date = new Date()) {
  const d = atLocalMidnight(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Before `graceHour` local time, treat submissions as the previous calendar day.
function getEffectiveToday(graceHour = 9, now = new Date()) {
  const local = new Date(now);
  if (local.getHours() < graceHour) {
    local.setDate(local.getDate() - 1);
  }
  return atLocalMidnight(local);
}

function normalizeDateAny(value) {
  // Accepts ISO ('2025-10-27'), 'dd/mm/yyyy', or Date-like input
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return atLocalMidnight(value);
    const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yyyy = parseInt(m[3], 10);
      return atLocalMidnight(new Date(yyyy, mm - 1, dd));
    }
    // Fallback to Date parsing
    const d = new Date(value);
    if (!isNaN(d)) return atLocalMidnight(d);
  } else {
    const d = new Date(value);
    if (!isNaN(d)) return atLocalMidnight(d);
  }
  // Unparseable → never matches
  return null;
}

/**
 * Calculate current/max streak from a list of play dates.
 * dateStrings: array of dates the player *actually solved* (exclude 'X')
 * opts:
 *  - anchorToday: if true, current streak counts only if last play is the effective today.
 *  - graceHour: hour boundary for "effective today" (default 9).
 *  - now: injection point for testing
 */
function calculateCurrentAndMaxStreak(dateStrings, opts = {}) {
  const { anchorToday = false, graceHour = 9, now = new Date() } = opts;

  if (!Array.isArray(dateStrings) || dateStrings.length === 0) {
    return { current: 0, max: 0 };
  }

  // Unique, normalized, sorted
  const normalized = Array.from(new Set(dateStrings.map(String)))
    .map(normalizeDateAny)
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (normalized.length === 0) return { current: 0, max: 0 };

  // Max streak
  let maxStreak = 1;
  let run = 1;
  for (let i = 1; i < normalized.length; i++) {
    const diffDays = Math.round((normalized[i] - normalized[i - 1]) / 86400000);
    if (diffDays === 1) run++;
    else if (diffDays > 1) {
      if (run > maxStreak) maxStreak = run;
      run = 1;
    }
  }
  if (run > maxStreak) maxStreak = run;

  // Current streak ends at most recent play
  let current = 1;
  for (let i = normalized.length - 1; i > 0; i--) {
    const diffDays = Math.round((normalized[i] - normalized[i - 1]) / 86400000);
    if (diffDays === 1) current++;
    else if (diffDays > 1) break;
  }

  // Optionally enforce that last play must be "effective today"
  if (anchorToday) {
    const effToday = getEffectiveToday(graceHour, now).getTime();
    const last = normalized[normalized.length - 1].getTime();
    if (last !== effToday) current = 0;
  }

  return { current, max: maxStreak };
}

module.exports = {
  calculateCurrentAndMaxStreak,
  getLocalDateString,
  getEffectiveToday,
};
