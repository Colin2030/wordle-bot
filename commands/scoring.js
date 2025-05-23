module.exports = function scoring(bot, _, groupChatId) {
  bot.onText(/\/scoring(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const scoringText = `🎯 *Wordle Scoring Rules (New Edition!)*\n\n`
    + `✅ Your score is based on:\n`
    + `- How *quickly* you solved it\n`
    + `- How many *new* 🟩 and 🟨 you revealed\n`
    + `- Whether it's *Friday* (double points!)\n\n`

    + `*Base Score (by guess count):*\n`
    + `- 1st guess: 60 pts\n`
    + `- 2nd guess: 50 pts\n`
    + `- 3rd guess: 40 pts\n`
    + `- 4th guess: 30 pts\n`
    + `- 5th guess: 20 pts\n`
    + `- 6th guess: 10 pts\n`
    + `- Fail (X): 0 pts\n\n`

    + `*Per-Tile Bonus (only for new tiles):*\n`
    + `- Line 1: +10 per 🟩, +5 per 🟨, +50 if solved\n`
    + `- Line 2: +8 per 🟩, +4 per 🟨, +4 for 🟨→🟩, +40 if solved\n`
    + `- Line 3: +6 per 🟩, +3 per 🟨, +3 for 🟨→🟩, +30 if solved\n`
    + `- Line 4: +4 per 🟩, +2 per 🟨, +2 for 🟨→🟩, +20 if solved\n`
    + `- Line 5: +2 per 🟩, +1 per 🟨, +1 for 🟨→🟩, +10 if solved\n`
    + `- Line 6: +1 per 🟩 only (no 🟨 or bonus)\n\n`

    + `*Friday Bonus:*\n`
    + `- All your points are DOUBLED on Fridays! 🎉\n\n`

    + `🧠 Play smart. Solve early. Max those greens!`;

    bot.sendMessage(msg.chat.id, scoringText, { parse_mode: 'Markdown' });
  });
};
