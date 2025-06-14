// /philosophy — explains the rationale behind the scoring system
module.exports = function philosophy(bot, _, groupChatId) {
  bot.onText(/\/philosophy(@\w+)?/, async (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const text = `🎓 *Wordle Scoring Philosophy*

Our scoring system rewards *reasoned deduction* over *blind luck*:

- 🟨 Yellows = info gained: spot the letter, find its home.
- 🟩 Greens = correct placement — but only rewarded once!
- 🟨 ➡ 🟩 = bonus for repositioning smartly.
- 🟥 All-gray lines = slight penalty for inefficient guesses.
- 🧠 Clean early solves with lots of greens are impressive — but lucky hits don’t get extra points for being lucky.

The aim: reward thoughtful, skillful play, not just fast luck.

Want to see how it works? Try /scoring or /debugscore! 🧪`;

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });
};