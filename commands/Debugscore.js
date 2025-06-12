// /debugscore — simulate and display score breakdown for a test grid
module.exports = function debugscore(bot, getAllScores, groupChatId) {
  bot.onText(/\/debugscore(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const testGrid = [
      '⬜⬜⬜⬜🟩',
      '⬜🟨🟩⬜🟩',
      '⬜⬜🟩🟨🟩',
      '🟩🟩🟩🟩🟩'
    ];
    const numAttempts = 4;
    const isFriday = new Date().getDay() === 5;

    const baseScoreByAttempt = {
      1: 60,
      2: 50,
      3: 40,
      4: 30,
      5: 20,
      6: 10,
      7: 0
    };

    const lineValues = [
      { green: 2.5, yellow: 1.2, yellowToGreen: 1.5, bonus: 10, fullGrayPenalty: -1 },
      { green: 2.2, yellow: 1.0, yellowToGreen: 1.2, bonus: 8, fullGrayPenalty: -1 },
      { green: 1.8, yellow: 0.8, yellowToGreen: 1.0, bonus: 6, fullGrayPenalty: -0.5 },
      { green: 1.5, yellow: 0.6, yellowToGreen: 0.8, bonus: 4, fullGrayPenalty: -0.5 },
      { green: 1.2, yellow: 0.4, yellowToGreen: 0.5, bonus: 2, fullGrayPenalty: 0 },
      { green: 1.0, yellow: 0.2, yellowToGreen: 0.3, bonus: 0, fullGrayPenalty: 0 }
    ];

    let finalScore = baseScoreByAttempt[numAttempts];
    const seenYellows = new Set();
    const seenGreens = new Set();
    let logLines = [`🧪 *Debug Scoring for Grid:* \n\`${testGrid.join('\n')}\``];

    testGrid.forEach((line, i) => {
      const rule = lineValues[i] || lineValues[5];
      const tiles = [...line.trim()];
      let fullGray = true;
      let lineScore = 0;

      tiles.forEach((tile, idx) => {
        const key = `${idx}`;
        if (tile === '🟩') {
          fullGray = false;
          if (!seenGreens.has(key)) {
            lineScore += rule.green;
            if (seenYellows.has(key)) {
              lineScore += rule.yellowToGreen;
            }
            seenGreens.add(key);
          }
        } else if (tile === '🟨') {
          fullGray = false;
          if (!seenYellows.has(key) && !seenGreens.has(key)) {
            lineScore += rule.yellow;
            seenYellows.add(key);
          }
        }
      });

      if (tiles.every(t => t === '🟩') && i < 5) lineScore += rule.bonus;
      if (fullGray) lineScore += rule.fullGrayPenalty;

      logLines.push(`Line ${i + 1}: ${lineScore.toFixed(1)} pts`);
      finalScore += lineScore;
    });

    if (isFriday) {
      finalScore *= 2;
      logLines.push(`🔥 Friday bonus applied!`);
    }

    logLines.push(`\n*Final Score:* ${finalScore.toFixed(1)} pts`);

    await bot.sendMessage(chatId, logLines.join('\n'), { parse_mode: 'Markdown' });
  });
};
