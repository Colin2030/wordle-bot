module.exports = function fridayDoublePoints(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');

  const memes = [
    "https://media.giphy.com/media/mIZ9rPeMKefm0/giphy.gif",
    "https://media.giphy.com/media/dUYddwtCVUOIpgXijq/giphy.gif",
    "https://media.giphy.com/media/IwAZ6dvvvaTtdI8SD5/giphy.gif",
    "https://media.giphy.com/media/opDRL3H2A9iLNuvbOv/giphy.gif",
    "https://media.giphy.com/media/xT0GqBJf5FNUGKoVrO/giphy.gif"
  ];

  cron.schedule('0 7 * * 5', async () => {
    const msg = `🎉 *DOUBLE POINTS FRIDAY IS LIVE!*\n\n`
      + `✅ Every green and yellow counts DOUBLE today!\n`
      + `✅ Outsmart, outguess, outplay your friends 🧠\n`
      + `✅ Bring your A-game \\- or prepare for humiliation 😬\n\n`
      + `Post your Wordle scores like your honor depends on it! 🎯`;

    const gif = memes[Math.floor(Math.random() * memes.length)];
    await bot.sendMessage(groupChatId, msg, { parse_mode: 'Markdown' });
    await bot.sendAnimation(groupChatId, gif);
  });
};
