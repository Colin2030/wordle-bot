// handleSubmission.js — robust streaks (epoch-day math + UK today anchor) + rivals (today + weekly ranks)
// ------------------------------------------------------------------------------------------------------

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
const RIVAL_TOLERANCE = Number(process.env.RIVAL_TOLERANCE ?? 0.5);

console.log('🧪 Scoring logic: Wordle Bot v2.0 with decimal scoring is active');

/* ----------------- Date helpers (robust) ----------------- */

/**
 * Normalise incoming sheet "date" values to ISO YYYY-MM-DD
 * - Accepts ISO, Google Sheets serials, and other parseable strings.
 */
function isoDate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();

  // Already ISO?
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

  // Fallback: native parse
  const d = new Date(s);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ----------------- Rival / leaderboard helpers ----------------- */

/**
 * Build today's leaderboard totals with *normalised* dates.
 * Supports injecting the current player's score so the board reflects this submission.
 */
function buildTodayLeaderboard(allScores, todayIso, injectPlayer = null, injectScore = 0) {
  const totals = new Map();  // player -> number
  const lastIdx = new Map(); // player -> last seen row index for today

  for (let i = 0; i < allScores.length; i++) {
    const [dateRaw, p, s] = allScores[i];
    const dateIso = isoDate(dateRaw);
    if (dateIso !== todayIso) continue;

    const val = parseFloat(s);
    if (!Number.isFinite(val)) continue;
    totals.set(p, (totals.get(p) || 0) + val);
    lastIdx.set(p, i); // later i = more recent
  }

  if (injectPlayer) {
    totals.set(injectPlayer, (totals.get(injectPlayer) || 0) + Number(injectScore));
    lastIdx.set(injectPlayer, Number.MAX_SAFE_INTEGER); // pretend newest
  }

  // Sort: total desc, then lastIdx desc (most recent first)
  const sorted = [...totals.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return (lastIdx.get(b[0]) || 0) - (lastIdx.get(a[0]) || 0);
  });

  return { sorted, totals, lastIdx };
}

/** Monday 00:00:00 of this week (local server clock; fine for range slicing) */
function startOfThisWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon=0
  x.setDate(x.getDate() - diffToMonday);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Sunday 23:59:59.999 of this week */
function endOfThisWeek(d = new Date()) {
  const s = startOfThisWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

/**
 * Build weekly totals using *normalised* dates.
 * Only rows with parseable dates are considered.
 */
function buildWeeklyLeaderboard(allScores, start, end) {
  const totals = new Map(); // player -> total points
  for (const row of allScores) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const [dateRaw, p, s] = row;
    const iso = isoDate(dateRaw);
    if (!iso) continue;
    const dt = new Date(iso);
    if (!(dt >= start && dt <= end)) continue;

    const val = parseFloat(s);
    if (!Number.isFinite(val)) continue;
    totals.set(p, (totals.get(p) || 0) + val);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]); // [[player,total],...]
  return { sorted, totals };
}

/* ----------------- Main handler ----------------- */

module.exports = async function handleSubmission(bot, msg) {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;
  if (!msg.text) return;

  // Accept messages like: "Wordle 1062 3/6" or "Wordle 1062 X/6"
  const cleanText = msg.text.replace(/,/g, '').trim();
  const match = cleanText.match(/Wordle\s(\d+)\s([1-6X])\/6\*?/i);
  if (!match) return;

  const wordleNumber = parseInt(match[1], 10);
  const attempts = match[2]; // '1'..'6' or 'X'
  const player = msg.from.first_name || 'Unknown';

  const now = new Date();
  const isFriday = now.getDay() === 5;
  const numAttempts = attempts === 'X' ? 7 : parseInt(attempts, 10);
  const today = getLocalDateString(now); // UK-aligned "today"
  const isArchive = /archive/i.test(cleanText);

  const allScores = await getAllScores();

  // Prevent duplicate submission for today (non-archive), using normalised dates
  if (!isArchive) {
    const alreadySubmitted = allScores.some(([dateRaw, p]) => isoDate(dateRaw) === today && p === player);
    if (alreadySubmitted) {
      await bot.sendMessage(
        chatId,
        `🛑 ${player}, you've already submitted your Wordle for today. No cheating! 😜`
      );
      return;
    }
  }

  // Extract the emoji grid lines (5 tiles per row)
  const emojiTiles = Array.from(cleanText).filter((ch) =>
    ['⬛', '⬜', '🟨', '🟩'].includes(ch)
  );
  const gridLines = [];
  for (let i = 0; i < emojiTiles.length; i += 5) {
    gridLines.push(emojiTiles.slice(i, i + 5).join(''));
  }

  /* -------- Scoring -------- */
  let finalScore = 0;

  if (attempts !== 'X') {
    const baseScoreByAttempt = { 1: 60, 2: 50, 3: 40, 4: 30, 5: 20, 6: 10, 7: 0 };
    finalScore += baseScoreByAttempt[numAttempts] || 0;

    // Earlier rows are worth a bit more; later rows taper
    const lineValues = [
      { green: 2.5, yellow: 1.2, yellowToGreen: 1.5, bonus: 10, fullGrayPenalty: -1 },
      { green: 2.2, yellow: 1.0, yellowToGreen: 1.2, bonus: 8,  fullGrayPenalty: -1 },
      { green: 1.8, yellow: 0.8, yellowToGreen: 1.0, bonus: 6,  fullGrayPenalty: -0.5 },
      { green: 1.5, yellow: 0.6, yellowToGreen: 0.8, bonus: 4,  fullGrayPenalty: -0.5 },
      { green: 1.2, yellow: 0.4, yellowToGreen: 0.5, bonus: 2,  fullGrayPenalty: 0   },
      { green: 1.0, yellow: 0.2, yellowToGreen: 0.3, bonus: 0,  fullGrayPenalty: 0   },
    ];

    const seenYellows = new Set(); // positions that turned yellow once
    const seenGreens = new Set();  // positions that finally went green

    gridLines.forEach((line, i) => {
      const rule = lineValues[i] || lineValues[lineValues.length - 1];
      const tiles = Array.from(line.trim());
      let fullGray = true;

      tiles.forEach((tile, idx) => {
        const key = `${idx}`; // by column index

        if (tile === '🟩') {
          fullGray = false;
          if (!seenGreens.has(key)) {
            finalScore += rule.green;
            if (seenYellows.has(key)) finalScore += rule.yellowToGreen; // yellow → green conversion
            seenGreens.add(key);
          }
        } else if (tile === '🟨') {
          fullGray = false;
          if (!seenYellows.has(key) && !seenGreens.has(key)) {
            finalScore += rule.yellow; // first yellow at this position
            seenYellows.add(key);
          }
        }
      });

      // Row is fully green and not the final row → bonus
      if (tiles.every((t) => t === '🟩') && i < 5) finalScore += rule.bonus;
      if (fullGray) finalScore += rule.fullGrayPenalty;
    });

    if (isFriday) finalScore *= 2;
  }

  const formattedScore = Number(finalScore.toFixed(1));

  /* -------- Streaks (anchor to UK "today" for submission reply) -------- */
  // Build playedDates from sheet (completed games only), normalised to ISO
  const playedDates = [];
  for (const row of allScores) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const [dateRaw, p, scoreRaw, , aRaw] = row;
    if (p !== player) continue;

    const attemptsPrev = String(aRaw ?? '').trim().toUpperCase();
    const scorePrev = Number(scoreRaw);
    const completed = attemptsPrev !== 'X' || (Number.isFinite(scorePrev) && scorePrev > 0);
    if (!completed) continue;

    const iso = isoDate(dateRaw);
    if (iso) playedDates.push(iso);
  }

  // If this isn’t an Archive, add the UK 'today' explicitly so anchor can't miss
  if (!isArchive) {
    playedDates.push(today);
  }

  const { current: streak, max: maxStreak } = calculateCurrentAndMaxStreak(
    playedDates,
    { anchorToday: !isArchive, todayIso: today } // ← anchor against your UK date
  );

  // Log score unless it's an Archive run
  if (!isArchive) {
    await logScore(player, formattedScore, wordleNumber, attempts, streak, maxStreak);
  } else {
    await bot.sendMessage(
      chatId,
      `🗃️ Sorry ${player}, I will score your Archive Wordle but I can only log *today's* game to the leaderboard.`,
      { parse_mode: 'Markdown' }
    );
  }

  /* -------- Rival (today + weekly rank aware; all date-normalised) -------- */
  const { sorted: todaySorted, totals: todayTotals } =
    buildTodayLeaderboard(allScores, today, player, formattedScore);

  const idx = todaySorted.findIndex(([p]) => p === player);
  let rivalInfo = null;

  if (idx > 0) {
    const [rivalName, rivalTodayTotal] = todaySorted[idx - 1];
    const meTodayTotal = todayTotals.get(player) || 0;
    const delta = meTodayTotal - rivalTodayTotal; // +ve => you're ahead
    const relation = Math.abs(delta) < RIVAL_TOLERANCE ? 'tied' : (delta > 0 ? 'ahead' : 'behind');

    // Weekly ranks (Mon..Sun including any logged days this week)
    const weekStart = startOfThisWeek(now);
    const weekEnd = endOfThisWeek(now);
    const { sorted: weekSorted } = buildWeeklyLeaderboard(allScores, weekStart, weekEnd);

    const youRank = weekSorted.findIndex(([p]) => p === player);
    const rivalRank = weekSorted.findIndex(([p]) => p === rivalName);
    const fieldSize = weekSorted.length;

    rivalInfo = {
      name: rivalName,
      relation,
      delta,
      rank: (youRank !== -1 && rivalRank !== -1)
        ? { you: youRank + 1, rival: rivalRank + 1, size: fieldSize, period: 'weekly' }
        : undefined,
    };
  }

  /* -------- Reaction -------- */
  const pronouns = playerProfiles[player] || null;
  let reaction;

  try {
    const aiReaction = await generateReaction(
      formattedScore,
      attempts,
      player,
      streak,
      pronouns,
      rivalInfo // structured rival with relation + weekly rank
    );

    if (aiReaction) {
      reaction = aiReaction;
    } else {
      const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts, 10);
      const pool = reactionThemes[attemptKey] || [];
      reaction = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'Nice effort!';
    }
  } catch (e) {
    console.error('Failed to generate AI reaction:', e);
    const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts, 10);
    const pool = reactionThemes[attemptKey] || [];
    reaction = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'Nice try!';
  }

  /* -------- Badges, crowns, medals (date-normalised where needed) -------- */
  const isChampion = await isMonthlyChampion(player);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yestDate = getLocalDateString(yesterday);

  // Yesterday medals (🥇🥈🥉) with normalised dates
  const yestTotals = allScores
    .map(([dateRaw, p, s]) => [isoDate(dateRaw), p, s])
    .filter(([iso]) => iso === yestDate)
    .reduce((acc, [_, p, s]) => {
      const v = parseFloat(s);
      if (!Number.isFinite(v)) return acc;
      acc[p] = (acc[p] || 0) + v;
      return acc;
    }, {});

  const sortedYest = Object.entries(yestTotals).sort((a, b) => b[1] - a[1]);
  const [first, second, third] = sortedYest.map(([p]) => p);
  let dailyMedal = '';
  if (player === first) dailyMedal = ' 🥇';
  else if (player === second) dailyMedal = ' 🥈';
  else if (player === third) dailyMedal = ' 🥉';

  // Last week's crown (👑) with normalised dates
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const lastWeekTotals = allScores
    .map(([dateRaw, p, s]) => [isoDate(dateRaw), p, s])
    .filter(([iso]) => !!iso)
    .reduce((acc, [iso, p, s]) => {
      const d = new Date(iso);
      if (d >= lastMonday && d <= lastSunday) {
        const v = parseFloat(s);
        if (Number.isFinite(v)) acc[p] = (acc[p] || 0) + v;
      }
      return acc;
    }, {});

  const topWeekly = Object.entries(lastWeekTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weeklyCrown = topWeekly === player ? ' 👑' : '';
  const trophy = isChampion ? ' 🏆' : '';

  // Streak flair (based on the anchored streak above)
  let streakEmoji = '';
  if (streak === 1) streakEmoji = ' 💩';
  else if (streak >= 200) streakEmoji = ' 💥💥💥';
  else if (streak >= 150) streakEmoji = ' 💥💥';
  else if (streak >= 100) streakEmoji = ' 💥';
  else if (streak >= 75)  streakEmoji = ' 🔥🔥🔥🔥🔥';
  else if (streak >= 50)  streakEmoji = ' 🔥🔥🔥🔥';
  else if (streak >= 30)  streakEmoji = ' 🔥🔥🔥';
  else if (streak >= 20)  streakEmoji = ' 🔥🔥';
  else if (streak >= 10)  streakEmoji = ' 🔥';

  const streakText = ` (${streak}${streakEmoji})`;
  if (!reaction) reaction = 'Nice Wordle!';

  // Final announce line
  await bot.sendMessage(
    chatId,
    `${player}${streakText}${trophy}${weeklyCrown}${dailyMedal} scored ${formattedScore} points! ${reaction}`,
    { parse_mode: 'Markdown' }
  );

  /* -------- Optional: Milestone streak pings -------- */
  const milestones = {
    10: "🔥 You've hit a 10-day streak! Double digits!",
    20: '🔥🔥 Two blazing weeks — nice!',
    30: '🔥🔥🔥 One month strong. Respect.',
    50: '🔥🔥🔥🔥 50 days! Unreasonably committed.',
    75: '🔥🔥🔥🔥🔥 75 days — are you okay?',
    100: '💥 Century! Wordle royalty.',
    150: '💥💥 150 days — ridiculous stamina.',
    200: '💥💥💥 200 days — seek help (or a trophy).',
  };

  if (milestones[streak]) {
    await bot.sendMessage(chatId, milestones[streak]);
  }
};