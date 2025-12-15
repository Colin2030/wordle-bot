// handleSubmission.js — rivals + tie-break + robust streaks (message-time aligned)
// ---------------------------------------------------------------------------------
// Changes:
// - Use Telegram's msg.date (UTC, seconds) as the source of time.
// - Grace hour is configurable via GRACE_HOUR (defaults to 3). Set to 0 to disable.
// - Use the effective day (getEffectiveToday(GRACE_HOUR, msgTime)) for *everything*:
//   duplicate check, streak push/anchor, logging, yesterday medals, weekly crown.

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

// Configurable grace (hours from local midnight). Example: GRACE_HOUR=0 to disable.
const GRACE_HOUR = Number(process.env.GRACE_HOUR || 3);

console.log('🧪 Scoring logic: Wordle Bot v2.2 (message-time + configurable grace)');

// Monday 00:00:00 of this week
function startOfThisWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon=0
  x.setDate(x.getDate() - diffToMonday);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfThisWeek(d = new Date()) {
  const s = startOfThisWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

// Build weekly totals from allScores within [start,end]
function buildWeeklyLeaderboard(allScores, start, end) {
  const totals = new Map(); // player -> total points
  for (const row of allScores) {
    const [dateIso, p, s] = row;
    const dt = new Date(dateIso);
    if (!(dt >= start && dt <= end)) continue;
    const val = parseFloat(s);
    if (!Number.isFinite(val)) continue;
    totals.set(p, (totals.get(p) || 0) + val);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]); // [[player,total],...]
  return { sorted, totals };
}

/* ----------------- Rival helpers ----------------- */

function buildTodayLeaderboard(allScores, todayKey, injectPlayer = null, injectScore = 0) {
  const totals = new Map();
  const lastIdx = new Map();

  for (let i = 0; i < allScores.length; i++) {
    const [date, p, s] = allScores[i];
    if (date !== todayKey) continue;
    const val = parseFloat(s);
    if (!Number.isFinite(val)) continue;
    totals.set(p, (totals.get(p) || 0) + val);
    lastIdx.set(p, i);
  }

  if (injectPlayer) {
    totals.set(injectPlayer, (totals.get(injectPlayer) || 0) + Number(injectScore));
    lastIdx.set(injectPlayer, Number.MAX_SAFE_INTEGER);
  }

  const sorted = [...totals.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return (lastIdx.get(b[0]) || 0) - (lastIdx.get(a[0]) || 0);
  });

  return { sorted, totals, lastIdx };
}

function rivalForPlayer(sortedBoard, player) {
  const idx = sortedBoard.findIndex(([p]) => p === player);
  if (idx <= 0) return null;
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

  // 🔒 Use Telegram's message timestamp (UTC seconds → Date) instead of server clock
  const msgTime = new Date(msg.date * 1000);

  // Effective "today" using configurable grace hour
  const effectiveDay = getEffectiveToday(GRACE_HOUR, msgTime);
  const effectiveDate = getLocalDateString(effectiveDay);

  // Friday double based on *effective* day
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

    const lineValues = [
      { green: 2.5, yellow: 1.2, yellowToGreen: 1.5, bonus: 10, fullGrayPenalty: -1 },
      { green: 2.2, yellow: 1.0, yellowToGreen: 1.2, bonus: 8,  fullGrayPenalty: -1 },
      { green: 1.8, yellow: 0.8, yellowToGreen: 1.0, bonus: 6,  fullGrayPenalty: -0.5 },
      { green: 1.5, yellow: 0.6, yellowToGreen: 0.8, bonus: 4,  fullGrayPenalty: -0.5 },
      { green: 1.2, yellow: 0.4, yellowToGreen: 0.5, bonus: 2,  fullGrayPenalty: 0   },
      { green: 1.0, yellow: 0.2, yellowToGreen: 0.3, bonus: 0,  fullGrayPenalty: 0   },
    ];

    const seenYellows = new Set();
    const seenGreens = new Set();

    gridLines.forEach((line, i) => {
      const rule = lineValues[i] || lineValues[lineValues.length - 1];
      const tiles = Array.from(line.trim());
      let fullGray = true;

      tiles.forEach((tile, idx) => {
        const key = `${idx}`;

        if (tile === '🟩') {
          fullGray = false;
          if (!seenGreens.has(key)) {
            finalScore += rule.green;
            if (seenYellows.has(key)) finalScore += rule.yellowToGreen;
            seenGreens.add(key);
          }
        } else if (tile === '🟨') {
          fullGray = false;
          if (!seenYellows.has(key) && !seenGreens.has(key)) {
            finalScore += rule.yellow;
            seenYellows.add(key);
          }
        }
      });

      if (tiles.every((t) => t === '🟩') && i < 5) finalScore += rule.bonus;
      if (fullGray) finalScore += rule.fullGrayPenalty;
    });

    if (isFriday) finalScore *= 2;
  }

  const formattedScore = Number(finalScore.toFixed(1));

  /* -------- Streaks (anchor to effective day) -------- */
  const playedDates = allScores
    .filter(([date, p, , , a]) => p === player && a !== 'X')
    .map(([date]) => date);

  if (!isArchive) {
    playedDates.push(effectiveDate);
  }

  const lastRowForPlayer = [...allScores].reverse().find(([, p]) => p === player);
  const priorMax = parseInt(lastRowForPlayer?.[6] || '0', 10);

  const { current: streakNow, max: rawMax } = calculateCurrentAndMaxStreak(playedDates, {
    anchorToday: !isArchive,
    graceHour: GRACE_HOUR,
    now: msgTime, // <- use Telegram message time for consistency
  });

  const streak = streakNow;
  const maxStreak = Math.max(rawMax, priorMax);

  // Log score unless it's an Archive run — write the *effective* date.
  if (!isArchive) {
    await logScore(player, formattedScore, wordleNumber, attempts, streak, maxStreak, effectiveDate);
  } else {
    await bot.sendMessage(
      chatId,
      `🗃️ Sorry ${player}, I will score your Archive Wordle but I can only log *today's* game to the leaderboard.`,
      { parse_mode: 'Markdown' }
    );
  }

 // --- Rival (today & weekly rank aware) ---
const { sorted: todaySorted, totals: todayTotals } =
  buildTodayLeaderboard(allScores, today, player, formattedScore);

// default: rival is the one just above you today
const idx = todaySorted.findIndex(([p]) => p === player);
let rivalInfo = null;

if (idx > 0) {
  const [rivalName, rivalTodayTotal] = todaySorted[idx - 1];
  const meTodayTotal = todayTotals.get(player) || 0;
  const delta = meTodayTotal - rivalTodayTotal; // +ve => you're ahead
  const relation = Math.abs(delta) < 0.5 ? 'tied' : (delta > 0 ? 'ahead' : 'behind');

  // Weekly ranks (Mon..Sun including today)
  const weekStart = startOfThisWeek(new Date());
  const weekEnd = endOfThisWeek(new Date());
  const { sorted: weekSorted, totals: weekTotals } = buildWeeklyLeaderboard(allScores, weekStart, weekEnd);

  const youWeeklyTotal = (weekTotals.get(player) || 0) + (relation !== 'behind' ? 0 : 0); // totals already include today's via sheet; we don't double-add
  const rivalWeeklyTotal = weekTotals.get(rivalName) || 0;

  const youRank = weekSorted.findIndex(([p]) => p === player) + 1 || null;
  const rivalRank = weekSorted.findIndex(([p]) => p === rivalName) + 1 || null;
  const fieldSize = weekSorted.length;

  rivalInfo = {
    name: rivalName,
    relation,
    delta,
    rank: (youRank && rivalRank)
      ? { you: youRank, rival: rivalRank, size: fieldSize, period: 'weekly' }
      : undefined,
  };
}

// --- Reaction (pass structured rival) ---
const pronouns = playerProfiles[player] || null;
let reaction;
try {
  const aiReaction = await generateReaction(
    formattedScore,
    attempts,
    player,
    streak,
    pronouns,
    rivalInfo // <— now an object with relation + rank
  );
  reaction = aiReaction || null;
} catch (e) {
  console.error('Failed to generate AI reaction:', e);
}
if (!reaction) {
  const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts, 10);
  const pool = reactionThemes[attemptKey] || [];
  reaction = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'Nice effort!';
}

  }

  /* -------- Badges, crowns, medals (all relative to effectiveDay) -------- */
  const isChampion = await isMonthlyChampion(player);

  const effYesterday = new Date(effectiveDay);
  effYesterday.setDate(effectiveDay.getDate() - 1);
  const yestDate = getLocalDateString(effYesterday);

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

  await bot.sendMessage(
    chatId,
    `${player}${streakText}${trophy}${weeklyCrown}${dailyMedal} scored ${formattedScore} points! ${reaction}`,
    { parse_mode: 'Markdown' }
  );

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