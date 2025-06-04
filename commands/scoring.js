module.exports = function scoring(bot, _, groupChatId) {
  bot.onText(/\/scoring(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const scoringText = `🎯 *Wordle Scoring 2.0!*\n\n`
    + `✅ Your score is based on:\n`
    + `- How *quickly* you solved it\n`
    + `- *New* 🟩 and 🟨 tiles (duplicates don't count)\n`
    + `- 🟨 ➜ 🟩 transitions (bonus!)\n`
    + `- Penalised full-gray lines\n`
    + `- *Friday = DOUBLE POINTS!*\n\n`

    + `*Base Score:*\n`
    + `- 1st guess: 60 pts\n`
    + `- 2nd: 50 pts\n`
    + `- 3rd: 40 pts\n`
    + `- 4th: 30 pts\n`
    + `- 5th: 20 pts\n`
    + `- 6th: 10 pts\n`
    + `- X (fail): 0 pts\n\n`

    + `*Per-Tile Bonus by Row (🟩/🟨/🟨➜🟩):*\n`
    + `- Row 1: +2.5 / +1.2 / +1.5 | +10 if all green\n`
    + `- Row 2: +2.2 / +1.0 / +1.2 | +8 bonus\n`
    + `- Row 3: +1.8 / +0.8 / +1.0 | +6 bonus\n`
    + `- Row 4: +1.5 / +0.6 / +0.8 | +4 bonus\n`
    + `- Row 5: +1.2 / +0.4 / +0.5 | +2 bonus\n`
    + `- Row 6: +1.0 for 🟩 only | no bonus\n\n`

    + `⬛ *Penalty:* -1 point for each fully gray line (⬛⬛⬛⬛⬛)\n`
    + `🎉 *Friday Bonus:* Double your final score\n\n`
    + `🧠 It's forensic. It's precise. It's hard to understand - like Load Files`;

    bot.sendMessage(msg.chat.id, scoringText, { parse_mode: 'Markdown' });
  });
};

