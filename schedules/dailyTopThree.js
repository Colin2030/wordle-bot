module.exports = function dailyTopThree(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');

  cron.schedule('0 8 * * *', async () => {
    const scores = await getAllScores();

    const now = new Date();
    const yesterday = new Date(now);
    const dayBefore = new Date(now);
    const twoDaysBefore = new Date(now);

    yesterday.setDate(now.getDate() - 1);
    dayBefore.setDate(now.getDate() - 2);
    twoDaysBefore.setDate(now.getDate() - 3);

    // Normalize to midnight
    [yesterday, dayBefore, twoDaysBefore].forEach(d => d.setHours(0, 0, 0, 0));

    const boards = { yesterday: {}, dayBefore: {}, twoDaysBefore: {} };

    for (const [date, player, score] of scores) {
      const entry = new Date(date);
      entry.setHours(0, 0, 0, 0);
      const pts = parseInt(score);

      if (entry.getTime() === yesterday.getTime()) {
        boards.yesterday[player] = (boards.yesterday[player] || 0) + pts;
      }
      if (entry.getTime() === dayBefore.getTime()) {
        boards.dayBefore[player] = (boards.dayBefore[player] || 0) + pts;
      }
      if (entry.getTime() === twoDaysBefore.getTime()) {
        boards.twoDaysBefore[player] = (boards.twoDaysBefore[player] || 0) + pts;
      }
    }

    const sorted = Object.entries(boards.yesterday).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return;

    const yesterdayWinner = sorted[0][0];
    const dayBeforeWinner = Object.entries(boards.dayBefore)[0]?.[0];
    const twoDaysBeforeWinner = Object.entries(boards.twoDaysBefore)[0]?.[0];

    let text = `🌟 *Yesterday's Top Wordlers!* 🌟\n\n`;

    sorted.forEach(([player, score], i) => {
      let label = '';
      if (i === 0) {
        label = `🏆 1st: *${player}* with ${score} pts`;

        const isBackToBack = player === dayBeforeWinner;
        const isThreepeat = isBackToBack && player === twoDaysBeforeWinner;

        if (isThreepeat) label += ` 🔥🔥 _Threepeat Champion!_`;
        else if (isBackToBack) label += ` 🔥 _Back-to-Back Champion!_`;

        text += `${label}\n`;
      } else if (i === 1) {
        text += `🥈 2nd: *${player}* with ${score} pts\n`;
      } else if (i === 2) {
        text += `🥉 3rd: *${player}* with ${score} pts\n`;
      }
    });

    await bot.sendMessage(groupChatId, text, { parse_mode: 'Markdown' });

    if (yesterdayWinner === dayBeforeWinner && yesterdayWinner === twoDaysBeforeWinner) {
      const threepeatMemes = [
        "https://i.imgur.com/bN8BzAU.gif", // Fireworks
        "https://i.imgur.com/F1Yo5c5.gif", // Party time
        "https://i.imgur.com/XgPfUj7.gif", // Victory lap
      ];
      const gif = threepeatMemes[Math.floor(Math.random() * threepeatMemes.length)];
      await bot.sendAnimation(groupChatId, gif);
    }
  });
};
