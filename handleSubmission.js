// handleSubmission.js — rivals + tie-break + robust streaks (effective-day everywhere)
// ------------------------------------------------------------------------------------
// Key changes:
// - Uses the *effective UK day* (getEffectiveToday(9, now)) for ALL date-related logic.
// - Prevents pre-09:00 submissions from showing streak=0 by aligning push/anchor/log dates.
// - Passes the effective date to logScore so the sheet matches the streak math.
// - Friday double is also based on the effective UK day (not raw calendar time).

const {
  getAllScores,
  logScore,
  getLocalDateString,
  isMonthlyChampion,
} = require('./utils');

const {
  calculateCurrentAndMaxStreak,
  getEffectiveToday,
} = require('./streakUtils');

const { generateReaction } = require('./openaiReaction');
const { reactionThemes } = require('./reactions');
const playerProfiles = require('./playerProfiles');

const groupChatId = process.env.GROUP_CHAT_ID;

console.log('🧪 Scoring logic: Wordle Bot v2.1 (effective-day + grace-hour aligned)');

/* ----------------- Rival helpers ----------------- */

/**
 * Build today's leaderboard totals (for the provided "today" key) and remember
 * "latest index" per player for tie-breaks. Supports injecting the current submission.
 */
function buildTodayLeaderboard(allScores, todayKey, injectPlayer = null, injectScore = 0) {
  const totals = new Map();  // player -> number
  const lastIdx = new Map(); // player -> last seen row index for todayKey

  for (let i = 0; i < allScores.length; i++) {
    const [date, p, s] = allScores[i];
    if (date !== todayKey) continue;
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
    if (b[1] !== a[1]) return b[1] - a[1];
    return (lastIdx.get(b[0]) || 0) - (lastIdx.get(a[0]) || 0);
  });

  return { sorted, totals, lastIdx };
}

/** Return the rival name given a pre-sorted board. */
function rivalForPlayer(sortedBoard, player) {
  const idx = sortedBoard.findIndex(([p]) => p === player);
  if (idx <= 0) return null; // top or not found
  return sortedBoard[idx - 1][0];
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
  // Effective "today" in UK with grace window (09:00)
  const effectiveDay = getEffectiveToday(9, now);
  const effectiveDate = getLocalDateString(effectiveDay);

  // Friday double based on effective-day (so pre-09:00 on Saturday still counts as Friday)
  const isFriday = effectiveDay.getDay() === 5;

  const numAttempts = attempts === 'X' ? 7 : parseInt(attempts, 10);
  const isArchive = /archive/i.test(cleanText);

  const allScores = await getAllScores();

  // Prevent duplicate submission for the effective day (non-archive)
  if (!isArchive) {
    const alreadySubmitted = allScores.some(([date, p]) => date === effectiveDate && p === player);
    if (alreadySubmitted) {
      await bot.sendMessage(
        chatId,
        `🛑 ${player}, you've already submitted your Wordle for ${effectiveDate}. No cheating! 😜`
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

  /* -------- Streaks (anchor to effective day for submission) -------- */
  // Build playedDates from sheet (attempts !== 'X'); push effectiveDate if this isn’t an Archive post.
  const playedDates = allScores
    .filter(([date, p, , , a]) => p === player && a !== 'X')
    .map(([date]) => date);

  if (!isArchive) {
    playedDates.push(effectiveDate); // ensure *effective-day* counts
  }

  // Carry forward prior max so trimming never reduces historical max
  const lastRowForPlayer = [...allScores].reverse().find(([ , p]) => p === player);
  const priorMax = parseInt(lastRowForPlayer?.[6] || '0', 10);

  const { current: streakNow, max: rawMax } = calculateCurrentAndMaxStreak(
    playedDates,
    {
      anchorToday: !isArchive, // anchor to the effective day for real submissions
      graceHour: 9,
      now,
    }
  );

  const streak = streakNow;
  const maxStreak = Math.max(rawMax, priorMax);

  // Log score unless it's an Archive run — write the *effective* date to the sheet.
  if (!isArchive) {
    // NOTE: logScore now accepts an optional date param; if your utils.js hasn't been updated,
    // this still works (extra args are ignored), but please update utils.js as advised.
    await logScore(player, formattedScore, wordleNumber, attempts, streak, maxStreak, effectiveDate);
  } else {
    await bot.sendMessage(
      chatId,
      `🗃️ Sorry ${player}, I will score your Archive Wordle but I can only log *today's* game to the leaderboard.`,
      { parse_mode: 'Markdown' }
    );
  }

  /* -------- Rival (effective-day) with tie-break by most-recent post -------- */
  // Build a "virtual" effective-day board that includes THIS submission immediately.
  const { sorted: todaySorted } = buildTodayLeaderboard(
    allScores,
    effectiveDate,
    player,
    formattedScore
  );
  const rival = rivalForPlayer(todaySorted, player);

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
      rival
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

  /* -------- Badges, crowns, medals -------- */
  const isChampion = await isMonthlyChampion(player);

  // "Yesterday" relative to the effective day
  const effYesterday = new Date(effectiveDay);
  effYesterday.setDate(effectiveDay.getDate() - 1);
  const yestDate = getLocalDateString(effYesterday);

  // Yesterday medals (🥇🥈🥉)
  const yestTotals = allScores
    .filter(([date]) => date === yestDate)
    .reduce((acc, [_, p, s]) => {
      acc[p] = (acc[p] || 0) + parseFloat(s);
      return acc;
    }, {});
  const sortedYest = Object.entries(yestTotals).sort((a, b) => b[1] - a[1]);
  const [first, second, third] = sortedYest.map(([p]) => p);
  let dailyMedal = '';
  if (player === first) dailyMedal = ' 🥇';
  else if (player === second) dailyMedal = ' 🥈';
  else if (player === third) dailyMedal = ' 🥉';

  // Last week's crown (👑) computed relative to the effective day
  const lastMonday = new Date(effectiveDay);
  lastMonday.setDate(effectiveDay.getDate() - ((effectiveDay.getDay() + 6) % 7) - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const lastWeekTotals = allScores
    .filter(([date]) => {
      const d = new Date(date);
      return d >= lastMonday && d <= lastSunday;
    })
    .reduce((acc, [_, p, s]) => {
      acc[p] = (acc[p] || 0) + parseFloat(s);
      return acc;
    }, {});
  const topWeekly = Object.entries(lastWeekTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weeklyCrown = topWeekly === player ? ' 👑' : '';
  const trophy = isChampion ? ' 🏆' : '';

  // Streak flair (based on the streak computed above)
  let streakEmoji = '';
  if (streak === 1) streakEmoji = ' 💩';
  else if (streak >= 365) streakEmoji = ' ⚡';
  else if (streak >= 250) streakEmoji = ' 💥💥💥💥';
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

  /* -------- Optional: Milestone streak pings (kept compact) -------- */
  const milestones = {
    10: "🔥 You've hit a 10-day streak! Double digits!",
    20: '🔥🔥 Two blazing weeks — nice!',
    30: '🔥🔥🔥 One month strong. Respect.',
    50: '🔥🔥🔥🔥 50 days! Unreasonably committed.',
    75: '🔥🔥🔥🔥🔥 75 days — are you okay?',
    100: '💥 Century! Wordle royalty.',
    150: '💥💥 150 days — ridiculous stamina.',
    200: '💥💥💥 200 days — seek help (or a trophy).',
    250: '💥💥💥💥 250 days — Are you human? Amazing!',
    365: '⚡ 365 days — A year of brilliance. Well done!',
  };

  if (milestones[streak]) {
    await bot.sendMessage(chatId, milestones[streak]);
  }
};
