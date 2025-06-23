// Mid-month leaderboard reminder — runs at 8AM on the 15th
cron.schedule('0 8 15 * *', async () => {
  const scores = await getAllScores();
  const now = new Date();

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const leaderboard = {};

  for (const row of scores) {
    const [date, player, score] = row;
    if (!date || !player || isNaN(score)) continue;

    const entryDate = new Date(date);
    if (entryDate >= firstOfMonth && entryDate <= now) {
      leaderboard[player] = (leaderboard[player] || 0) + parseFloat(score);
    }
  }

  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  let message = `📊 *Mid-Month Leaderboard Update!*\n\n`;

  if (sorted.length === 0) {
    message += `No scores logged yet this month. Time to sharpen your guesses! 🎯`;
  } else {
    message += `Here's how the top Wordlers are doing so far:\n\n`;
    const topScore = sorted[0][1];

    sorted.slice(0, 5).forEach(([player, score], index) => {
      const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const closingIn = index !== 0 && topScore - score <= 30 ? ' 🔥 Closing in!' : '';
      message += `${index + 1}. ${medal} ${player}: ${score.toFixed(1)} pts${closingIn}\n`;
    });
  }

  await bot.sendMessage(groupChatId, message, { parse_mode: 'Markdown' });
});
