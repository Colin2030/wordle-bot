// fridayDoublePoints.js — dynamic weekly themes + OpenAI quip
// -----------------------------------------------------------
// - Rotates GIF theme by ISO week number (predictable, no repeats week-to-week).
// - Pulls a fresh quip from openaiReaction.generateThemeQuip('friday').
// - Slightly shuffles bullets so the text isn't the same every Friday.

module.exports = function fridayDoublePoints(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');
  const { generateThemeQuip } = require('../openaiReaction');

  // --- Helpers ---
  function isoWeekNumber(d = new Date()) {
    // ISO week number (Mon=1..Sun=7; week 1 is the one with Jan 4th)
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Thursday in current week decides the year.
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }

  const THEMES = {
    wrestling: [
      // wrestling is allowed (per your preference)
      "https://media.giphy.com/media/9DavVitIZ26jH5vJb2/giphy.gif",
      "https://media.giphy.com/media/3o7btP7T1mQyG1t8q8/giphy.gif",
      "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
      "https://media.giphy.com/media/SVCS7mX4kki2Y/giphy.gif",
    ],
    confetti: [
      "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
      "https://media.giphy.com/media/3ohhwf34cGDoFFhRfy/giphy.gif",
      "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
      "https://media.giphy.com/media/26u4nJPf0JtQPdStq/giphy.gif",
    ],
    fireworks: [
      "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif",
      "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
      "https://media.giphy.com/media/l3q2R8O4YdS3JXJJK/giphy.gif",
      "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
    ],
    keyboard: [
      "https://media.giphy.com/media/l0Exk8EUzSLsrErEQ/giphy.gif",
      "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
      "https://media.giphy.com/media/3o7TKr4kqG1JfYKywI/giphy.gif",
      "https://media.giphy.com/media/3o7aD4V2b2kxK1x4ve/giphy.gif",
    ],
    dramatic: [
      "https://media.giphy.com/media/3o7TKCw5vM2z9Y1ucs/giphy.gif",
      "https://media.giphy.com/media/l0IydH3Z4V8oYtU5q/giphy.gif",
      "https://media.giphy.com/media/3oKIPo8G0a8s7Xqf6c/giphy.gif",
      "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
    ],
    cat_chaos: [
      "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
      "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
      "https://media.giphy.com/media/12HZukMBlutpoQ/giphy.gif",
      "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif",
    ],
  };

  const THEME_KEYS = Object.keys(THEMES);

  function pickThemeGif() {
    const week = isoWeekNumber(new Date());
    const themeKey = THEME_KEYS[week % THEME_KEYS.length];
    const gifs = THEMES[themeKey];
    const gif = gifs[week % gifs.length];
    return { themeKey, gif };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  cron.schedule('0 7 * * 5', async () => {
    // Build a slightly varied bullet list each week
    const bullets = shuffle([
      'Every green and yellow **counts double** today.',
      'Outsmart, outguess, outplay your friends.',
      'Bring your A-game — or prepare for gentle humiliation.',
      'Post your board like your honour depends on it.',
    ]).slice(0, 3);

    const header = `🎉 *DOUBLE POINTS FRIDAY IS LIVE!*`;
    const body = bullets.map(b => `• ${b}`).join('\n');

    // Fresh OpenAI quip to keep things spicy
    let quip = '';
    try {
      quip = await generateThemeQuip('friday');
      if (quip) quip = `\n\n_${quip}_`;
    } catch {
      // fail quietly — announcement still goes out
    }

    const msg = `${header}\n\n${body}${quip}`;

    const { themeKey, gif } = pickThemeGif();

    await bot.sendMessage(groupChatId, msg, { parse_mode: 'Markdown' });
    // Send the themed GIF for this week
    await bot.sendAnimation(groupChatId, gif, {
      caption: `Theme this week: *${themeKey.replace('_', ' ')}*`,
      parse_mode: 'Markdown',
    });
  });
};
