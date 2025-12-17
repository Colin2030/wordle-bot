// utils/streakUtils.js — robust streaks with epoch-day math + optional todayIso anchoring

/**
 * Convert a variety of date inputs to an integer "epoch day" (days since 1970-01-01 UTC).
 * Supports:
 *  - ISO 'YYYY-MM-DD'
 *  - Google Sheets serial numbers (days since 1899-12-30)
 *  - Other parseable date strings (as a last resort)
 * Returns: number (integer epoch day) or null if unparseable.
 */
function toEpochDay(value) {
  if (value == null) return null;

  // Fast path: ISO YYYY-MM-DD
  if (typeof value === 'string') {
    const s = value.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const y = +m[1], mo = +m[2] - 1, d = +m[3];
      return Math.floor(Date.UTC(y, mo, d) / 86400000);
    }
  }

  // Google Sheets serial (numeric days since 1899-12-30)
  const n = Number(value);
  if (Number.isFinite(n) && n > 25569 && n < 60000) {
    // Convert serial to epoch-day directly: (serial - 25569) gives days since 1970-01-01
    return Math.floor(n - 25569);
  }

  // Last resort: native Date parse, then snap to UTC midnight
  const d = new Date(String(value));
  if (isNaN(d)) return null;
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/**
 * Calculate current and max streaks from a list of date values.
 * @param {Array<string|number|Date>} dateValues - Each entry is a day the user played.
 * @param {{ anchorToday?: boolean, todayIso?: string }} [opts]
 *   - anchorToday=false (default): current streak ends at most recent play day.
 *   - anchorToday=true: set current=0 unless the most recent play day equals todayIso (or system today if not provided).
 *   - todayIso: optional 'YYYY-MM-DD' to anchor with (use your UK helper!).
 */
function calculateCurrentAndMaxStreak(dateValues, opts = {}) {
  const { anchorToday = false, todayIso } = opts;

  if (!Array.isArray(dateValues) || dateValues.length === 0) {
    return { current: 0, max: 0 };
  }

  // Normalise → epoch days; drop invalids; unique; sort ascending
  const epochDays = Array.from(
    new Set(
      dateValues
        .map(toEpochDay)
        .filter((x) => Number.isInteger(x))
    )
  ).sort((a, b) => a - b);

  if (epochDays.length === 0) return { current: 0, max: 0 };

  // Max streak
  let maxStreak = 1;
  let run = 1;
  for (let i = 1; i < epochDays.length; i++) {
    const diff = epochDays[i] - epochDays[i - 1];
    if (diff === 1) {
      run++;
    } else if (diff > 1) {
      if (run > maxStreak) maxStreak = run;
      run = 1;
    }
  }
  if (run > maxStreak) maxStreak = run;

  // Current streak (ending at most recent play)
  let current = 1;
  for (let i = epochDays.length - 1; i > 0; i--) {
    const diff = epochDays[i] - epochDays[i - 1];
    if (diff === 1) current++;
    else if (diff > 1) break;
  }

  // Optional: anchor to "today"
  if (anchorToday) {
    let todayDay;
    if (typeof todayIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayIso)) {
      todayDay = toEpochDay(todayIso);
    } else {
      // Fallback: system "today" snapped to UTC midnight
      const now = new Date();
      todayDay = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    }

    const lastPlayDay = epochDays[epochDays.length - 1];
    if (todayDay !== lastPlayDay) current = 0;
  }

  return { current, max: maxStreak };
}

module.exports = { calculateCurrentAndMaxStreak, toEpochDay };