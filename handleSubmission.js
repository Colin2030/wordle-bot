// handleSubmission.js — rivals + tie-break + robust streaks (anchored to today on submit)
// --------------------------------------------------------------------------------------
// Notes:
// - Rival = player one place above you on TODAY's leaderboard.
// - Tie-break: if totals are tied, the rival is the player whose latest post today is most recent.
// - Reaction receives `rival` for a cheeky nudge.
// - Streak calc here uses { anchorToday: true } so it matches the "post-submit" streak in the reply.

const {
  getAllScores,
  logScore,
  getLocalDateString,
  isMonthlyChampion,
} = require('./utils');

const { calculateCurrentAndMaxStreak } = require('./utils/streakUtils');
const { generateReaction } = require('./openaiReaction');
const { reactionThemes } = require('./fallbackreactions');
const playerProfiles = require('./playerProfiles');

const groupChatId = process.env.GROUP_CHAT_ID;

console.log('🧪 Scoring logic: Wordle Bot v2.0 with decimal scoring is active');

/* ----------------- Rival helpers ----------------- */

/**
 * Build today's leaderboard totals and remember "latest index" per player for tie-breaks.
 * We also support injecting the current player's just-computed score so the board reflects
 * their new total immediately (without re-reading the sheet).
 */
function buildTodayLeaderboard(allScores, today, injectPlayer = null, injectScore = 0) {
  const totals = new Map();  // player -> number
  const lastIdx = new Map(); // player -> last seen row index for today

  for (let i = 0; i < allScores.length; i++) {
    const [date, p, s] = allScores[i];
    if (date !== today) continue;
    const val = parseFloat(s);
    if (!Number.isFinite(val)) continue;
    totals.set(p, (totals.get(p) || 0) + val);
    lastIdx.set(p, i); // later i means more recent post
  }

  if (injectPlayer) {
    totals.set(injectPlayer, (totals.get(injectPlayer) || 0) + Number(injectScore));
    // Pretend this row is the newest possible for today
    lastIdx.set(injectPlayer, Number.MAX_SAFE_INTEGER);
  }

  // Sort: total desc, then lastIdx desc (most recent first)
  const sorted = [...totals.entries()].sort((a, b) => {
    if (b[1] !== a[1]()
