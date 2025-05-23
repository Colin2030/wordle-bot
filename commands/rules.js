module.exports = function rules(bot, _, groupChatId) {
  bot.onText(/\/rules(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const rules = `📜 *Wordle Workers Official Rules:*\n\n`
      + `✅ Share your daily Wordle results \- no lurking! 👀\n`
      + `✅ Points: (60 - attempts) plus bonus points for 🟩 and 🟨\n`
      + `✅ Double Points every Friday! 🎉\n`
      + `✅ Daily winner crowned at 9AM 👑\n`
      + `✅ Weekly champion announced every Monday 🏆\n`
      + `✅ Monthly champion announced on the 1st 🗓️\n\n`
      + `Brag loudly \- lose gracefully \- Wordle fiercely! 🎯`;

    bot.sendMessage(msg.chat.id, rules, { parse_mode: 'Markdown' });
  });
};
