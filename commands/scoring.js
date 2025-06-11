// commands/scoring.js — explains updated Wordle scoring system with decimal points

module.exports = function scoringCommand(bot, _, groupChatId) {
  bot.onText(/\/scoring(@\w+)?/, (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const text = `📊 *Updated Wordle Scoring System v2.0*

Scoring is now more nuanced and uses *decimal points* to reduce ties. Here’s how it works:

🎯 *Base Score by Attempt Count:*
- 1st guess: 60 pts
- 2nd: 50 pts
- 3rd: 40 pts
- 4th: 30 pts
- 5th: 20 pts
- 6th: 10 pts
- X (fail): 0 pts

🧠 *Bonus Points per Line:*
Each guess line earns points based on:
- 🟩 Green: 2.5 → 1.0 (scaling by line)
- 🟨 Yellow: 1.2 → 0.2
- Yellow ➡ Green transitions: +1.5 → +0.3
- All 🟩 (except final line): Bonus +10 → +0
- Full gray line: Penalty -1 → 0

🔥 *Friday Double Points:* All scores x2 on Fridays!

🧮 Final score is a *decimal*, shown like 46.6 pts, to reduce ties.

To view your actual grid score logic, use /debugscore (coming soon!)`;

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });
};