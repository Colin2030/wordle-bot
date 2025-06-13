// utils/streakUtils.js

function parseDateString(dateStr) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

function calculateCurrentAndMaxStreak(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) {
    return { current: 1, max: 1 };
  }

  const uniqueDates = [...new Set(dateStrings)];
  const sortedDates = uniqueDates
    .map(parseDateString)
    .sort((a, b) => a - b);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let maxStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      tempStreak++;
    } else if (diff > 1) {
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 1;
    }
  }

  maxStreak = Math.max(maxStreak, tempStreak);

  today.setHours(0, 0, 0, 0); // ✅ reuse existing 'today'

// Walk backward from today
let currentStreak = 1;
for (let i = sortedDates.length - 1; i > 0; i--) {
  const curr = sortedDates[i];
  const prev = sortedDates[i - 1];
  const diff = (curr - prev) / (1000 * 60 * 60 * 24);
  if (diff === 1) {
    currentStreak++;
  } else if (diff > 1) {
    break;
  }
}

// Check: was today played?
const lastPlay = sortedDates[sortedDates.length - 1];
if (lastPlay.getTime() !== today.getTime()) {
  currentStreak = 0; // only count streaks ending today
}

  return { current: currentStreak, max: maxStreak };
}

module.exports = { calculateCurrentAndMaxStreak };
