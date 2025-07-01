// Updated handleSubmission.js — now uses robust streak logic
const { getAllScores, logScore, getLocalDateString, isMonthlyChampion } = require('./utils');
const { calculateCurrentAndMaxStreak } = require('./utils/streakUtils');
const { generateReaction } = require('./openaiReaction');
const { reactionThemes } = require('./fallbackreactions');
const playerProfiles = require('./playerProfiles');
const groupChatId = process.env.GROUP_CHAT_ID;

console.log("🧪 Scoring logic: Wordle Bot v2.0 with decimal scoring is active");

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
  const isArchive = /archive/i.test(cleanText);

  const allScores = await getAllScores();

  if (!isArchive) {
    const alreadySubmitted = allScores.some(([date, p]) => date === today && p === player);
    if (alreadySubmitted) {
      bot.sendMessage(chatId, `🛑 ${player}, you've already submitted your Wordle for today. No cheating! 😜`);
      return;
    }
  }

  const emojiChars = Array.from(cleanText).filter(char => ['⬛', '⬜', '🟨', '🟩'].includes(char));
  let gridLines = [];
  for (let i = 0; i < emojiChars.length; i += 5) {
    gridLines.push(emojiChars.slice(i, i + 5).join(''));
  }

  let finalScore = 0;
  if (attempts !== 'X') {
    const baseScoreByAttempt = {
      1: 60,
      2: 50,
      3: 40,
      4: 30,
      5: 20,
      6: 10,
      7: 0
    };
    finalScore += baseScoreByAttempt[numAttempts] || 0;

    const lineValues = [
      { green: 2.5, yellow: 1.2, yellowToGreen: 1.5, bonus: 10, fullGrayPenalty: -1 },
      { green: 2.2, yellow: 1.0, yellowToGreen: 1.2, bonus: 8, fullGrayPenalty: -1 },
      { green: 1.8, yellow: 0.8, yellowToGreen: 1.0, bonus: 6, fullGrayPenalty: -0.5 },
      { green: 1.5, yellow: 0.6, yellowToGreen: 0.8, bonus: 4, fullGrayPenalty: -0.5 },
      { green: 1.2, yellow: 0.4, yellowToGreen: 0.5, bonus: 2, fullGrayPenalty: 0 },
      { green: 1.0, yellow: 0.2, yellowToGreen: 0.3, bonus: 0, fullGrayPenalty: 0 }
    ];

    const seenYellows = new Set();
    const seenGreens = new Set();

    gridLines.forEach((line, i) => {
      const rule = lineValues[i] || lineValues[5];
      const tiles = [...line.trim()];
      let fullGray = true;

      tiles.forEach((tile, idx) => {
        const key = `${idx}`;

        if (tile === '🟩') {
          fullGray = false;
          if (!seenGreens.has(key)) {
            finalScore += rule.green;
            if (seenYellows.has(key)) {
              finalScore += rule.yellowToGreen;
            }
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

      if (tiles.every(t => t === '🟩') && i < 5) {
        finalScore += rule.bonus;
      }

      if (fullGray) {
        finalScore += rule.fullGrayPenalty;
      }
    });

    if (isFriday) finalScore *= 2;
  }

  const formattedScore = finalScore.toFixed(1);

  const playedDates = allScores
    .filter(([date, p, , , a]) => p === player && a !== 'X')
    .map(([date]) => date);

  if (!isArchive) {
    playedDates.push(today);
  }

  const { current: streak, max: maxStreak } = calculateCurrentAndMaxStreak(playedDates);

  if (!isArchive) {
    await logScore(player, formattedScore, wordleNumber, attempts, streak, maxStreak);
  } else {
    await bot.sendMessage(chatId,
      `🗃️ Sorry ${player}, I will score your Archive Wordle but I can only log *today's* game to the leaderboard.`,
      { parse_mode: 'Markdown' }
    );
  }

  const pronouns = playerProfiles[player] || null;
  let reaction;
  try {
    const aiReaction = await generateReaction(formattedScore, attempts, player, streak, pronouns);
    if (aiReaction) {
      reaction = aiReaction;
    } else {
      const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts);
      reaction = reactionThemes[attemptKey]?.[Math.floor(Math.random() * reactionThemes[attemptKey].length)] || "Nice effort!";
    }
  } catch (e) {
    console.error("Failed to generate AI reaction:", e);
    const attemptKey = attempts === 'X' ? 'X' : parseInt(attempts);
    reaction = reactionThemes[attemptKey]?.[Math.floor(Math.random() * reactionThemes[attemptKey].length)] || "Nice try!";
  }

  const isChampion = await isMonthlyChampion(player);

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yestDate = getLocalDateString(yesterday);
  const yestScores = allScores.filter(([date]) => date === yestDate);
  const yestTop = yestScores.reduce((acc, [_, p, s]) => {
    acc[p] = (acc[p] || 0) + parseFloat(s);
    return acc;
  }, {});
  const sortedYest = Object.entries(yestTop).sort((a, b) => b[1] - a[1]);
  const [first, second, third] = sortedYest.map(([p]) => p);
  let dailyMedal = '';
  if (player === first) dailyMedal = ' 🥇';
  else if (player === second) dailyMedal = ' 🥈';
  else if (player === third) dailyMedal = ' 🥉';

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
    acc[p] = (acc[p] || 0) + parseFloat(s);
    return acc;
  }, {});
  const topWeekly = Object.entries(weeklyTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weeklyCrown = topWeekly === player ? ' 👑' : '';
  const trophy = isChampion ? ' 🏆' : '';

  let streakEmoji = '';
  if (streak === 1) streakEmoji = ' 💩';
  else if (streak >= 100) streakEmoji = ' 💥';
  else if (streak >= 75) streakEmoji = ' 🔥🔥🔥🔥🔥';
  else if (streak >= 50) streakEmoji = ' 🔥🔥🔥🔥';
  else if (streak >= 30) streakEmoji = ' 🔥🔥🔥';
  else if (streak >= 20) streakEmoji = ' 🔥🔥';
  else if (streak >= 10) streakEmoji = ' 🔥';

  const streakText = ` (${streak}${streakEmoji})`;
  if (!reaction) reaction = "Nice Wordle!";

  try {
    await bot.sendMessage(chatId,
      `${player}${streakText}${trophy}${weeklyCrown}${dailyMedal} scored ${formattedScore} points! ${reaction}`,
      { parse_mode: 'Markdown' }
    );
	
// 🎉 Milestone Streak Announcements
const milestoneMessages = {
  10: "🔥 You've hit a 10-day streak! Double digits, baby!",
  20: "🔥🔥 You're on fire! 20-day streak achieved!",
  30: "🔥🔥🔥 One month strong! That's dedication!",
  50: "🔥🔥🔥🔥 50 days?! You're a Wordle warrior!",
  75: "🔥🔥🔥🔥🔥 You're unstoppable. 75-day streak!",
  100: "💥 You've reached 100! Amazing dedication!"
};

if (milestoneMessages[streak]) {
  await bot.sendMessage(chatId,
    `🎉 *Streak Milestone for ${player}!* 🎉\n\n${milestoneMessages[streak]}`,
    { parse_mode: 'Markdown' }
  );
}

  } catch (e) {
    console.error("❌ Failed to send Wordle reply message:", e);
  }
};
