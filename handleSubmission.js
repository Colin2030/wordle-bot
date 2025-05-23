const { getAllScores, logScore, getLocalDateString, isMonthlyChampion } = require('./utils');
const { generateReaction } = require('./openaiReaction');
const { reactionThemes } = require('./reactions');
const { playerProfiles } = require('./phrases');
const groupChatId = process.env.GROUP_CHAT_ID;

module.exports = async function handleSubmission(bot, msg) {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(groupChatId)) return;
  if (!msg.text) return;

  const cleanText = msg.text.replace(/,/g, '').trim();
  const match = cleanText.match(/Wordle\s(\d+)\s([1-6X])\/6\*?/);
  if (!match) return;

  const wordleNumber = parseInt(match[1]);
  const attempts = match[2];
  const player = msg.from.first_name || 'Unknown';
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const numAttempts = attempts === 'X' ? 7 : parseInt(attempts);
  const today = getLocalDateString(now);

  const allScores = await getAllScores();
  const alreadySubmitted = allScores.some(([date, p]) => date === today && p === player);
  if (alreadySubmitted) {
    bot.sendMessage(chatId, `🛑 ${player}, you've already submitted your Wordle for today. No cheating! 😜`);
    return;
  }

  const gridRegex = /([⬛⬜🟨🟩]{5}\n?)+/g;
  const gridMatch = cleanText.match(gridRegex);

  let finalScore = 0;
  if (attempts !== 'X') {
    const base = [0, 60, 45, 30, 20, 10, 0];
    finalScore += base[numAttempts];

    if (gridMatch) {
      const gridText = gridMatch.join('');
      const greens = (gridText.match(/🟩/g) || []).length;
      const yellows = (gridText.match(/🟨/g) || []).length;
      const adjustedGreens = Math.max(greens - 5, 0);
      const tileBonus = Math.min(adjustedGreens * 1 + yellows * 0.5, 10);
      finalScore += tileBonus;
    }

    if (isFriday) finalScore *= 2;
  }

  const playerEntries = allScores
    .filter(([date, p, , , a]) => p === player && a !== 'X')
    .map(([date]) => new Date(date))
    .sort((a, b) => a - b);
  playerEntries.push(new Date(today));

  let streak = 1;
  for (let i = playerEntries.length - 1; i > 0; i--) {
    const prev = playerEntries[i - 1];
    const curr = playerEntries[i];
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  await logScore(player, Math.round(finalScore), wordleNumber, attempts);

  const pronouns = playerProfiles[player] || null;
  let reaction;
  try {
    const aiReaction = await generateReaction(Math.round(finalScore), attempts, player, streak, pronouns);
    if (aiReaction) {
      reaction = aiReaction;
    } else {
      const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts);
      reaction = reactionThemes[attemptKey]
        ? reactionThemes[attemptKey][Math.floor(Math.random() * reactionThemes[attemptKey].length)]
        : "Nice effort!";
    }
  } catch (e) {
    console.error("Failed to generate AI reaction:", e);
    const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts);
    reaction = reactionThemes[attemptKey]
      ? reactionThemes[attemptKey][Math.floor(Math.random() * reactionThemes[attemptKey].length)]
      : "Nice try!";
  }

  const isChampion = await isMonthlyChampion(player);

  // Medal logic (🥇 🥈 🥉)
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yestDate = getLocalDateString(yesterday);
  const yestScores = allScores.filter(([date]) => date === yestDate);
  const yestTop = yestScores.reduce((acc, [_, p, s]) => {
    acc[p] = (acc[p] || 0) + parseInt(s);
    return acc;
  }, {});
  const sortedYest = Object.entries(yestTop).sort((a, b) => b[1] - a[1]);
  const [first, second, third] = sortedYest.map(([p]) => p);
  let dailyMedal = '';
  if (player === first) dailyMedal = ' 🥇';
  else if (player === second) dailyMedal = ' 🥈';
  else if (player === third) dailyMedal = ' 🥉';

  // Weekly champion
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const lastWeekScores = allScores.filter(([date]) => {
    const entryDate = new Date(date);
    return entryDate >= lastMonday && entryDate <= lastSunday;
  });
  const weeklyTotals = lastWeekScores.reduce((acc, [_, p, s]) => {
    acc[p] = (acc[p] || 0) + parseInt(s);
    return acc;
  }, {});
  const topWeekly = Object.entries(weeklyTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weeklyCrown = topWeekly === player ? ' 👑' : '';

  const trophy = isChampion ? ' 🏆' : '';

  let streakEmoji = '';
  if (streak === 1) streakEmoji = ' 💩';
  else if (streak >= 100) streakEmoji = ' 🔥🔥🔥🔥🔥';
  else if (streak >= 50) streakEmoji = ' 🔥🔥🔥🔥';
  else if (streak >= 30) streakEmoji = ' 🔥🔥🔥';
  else if (streak >= 20) streakEmoji = ' 🔥🔥';
  else if (streak >= 10) streakEmoji = ' 🔥';

  const streakText = ` (${streak}${streakEmoji})`;

bot.sendMessage(chatId,
  `${player}${streakText}${trophy}${weeklyCrown}${dailyMedal} scored ${Math.round(finalScore)} points! ${reaction}`
);
}

