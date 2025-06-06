module.exports = function debugscore(bot, _, groupChatId) {
  bot.onText(/\/debugscore(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const sampleGrid = [
      "⬜⬜🟩⬜⬜",
      "⬜⬜🟩🟨🟨",
      "🟩🟩🟩🟩🟩"
    ];

    const numAttempts = sampleGrid.length;
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

    sampleGrid.forEach((line, i) => {
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

    bot.sendMessage(msg.chat.id, `🧪 *Debug Score Test:*
Attempts: ${numAttempts}
Friday: ${isFriday ? 'Yes 🎉' : 'No'}
Score: ${finalScore.toFixed(2)} pts`, {
      parse_mode: 'Markdown'
    });
  });
};
