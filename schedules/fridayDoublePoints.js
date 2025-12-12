// fridayDoublePoints.js — cycles Telegram image file_ids + optional OpenAI quip
// ---------------------------------------------------------------------------
// - Predictable weekly cycle based on ISO week number (no repeats week-to-week until wrap).
// - No GIFs, no themes, just your Wordle-bot images.
// - Slightly shuffles bullets so the text isn't identical every Friday.

module.exports = function fridayDoublePoints(bot, getAllScores, groupChatId) {
  const cron = require('node-cron');
  const { generateThemeQuip } = require('../openaiReaction');

  // ✅ Your 10 Telegram photo file_ids (in order)
  const DOUBLE_POINTS_IMAGE_FILE_IDS = [
    'AgACAgQAAxkBAANtaTxKfq38-ecFMsai8EhWlwmE4NQAAskMaxux3uBRPp5LVnEnJoABAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAANvaTxLF0bHIUobDS4S_DGB3v8ew4cAAssMaxux3uBRsmKxrse_wOgBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAANxaTxLHU4RLZL4JYrlUII84sOclW4AAswMaxux3uBRbnRNC9YxHpgBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAANzaTxLIUhtnjhzfnIauydNqUZZbYAAAs0Maxux3uBRf8ZSNP8RN-EBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAAN1aTxLJm9CEblw2hVLi9phwfMrTC8AAs4Maxux3uBRS3WnBQb6WBkBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAAN3aTxLKpV-GWIvA4TvvyNSIVooyUsAAs8Maxux3uBReE48QRPRBqkBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAAN5aTxLMNaUISQS8rh3fG82IP1zThUAAtAMaxux3uBRByyEli9RpfQBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAAN7aTxLNBoXo5NPveO1mgrcTRuempsAAtEMaxux3uBR0yWvfroJyRUBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAAN9aTxLOL9p-ud1ZMWNt37UHxXUWUkAAtIMaxux3uBRnsB-mBAugmYBAAMCAAN5AAM2BA',
    'AgACAgQAAxkBAAN_aTxLPgFuKaNtlvY1BcxNCbYAAc-_AALTDGsbsd7gUV5c2hv2zRvdAQADAgADeQADNgQ',
  ];

  // --- Helpers ---
  function isoWeekNumber(d = new Date()) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // Thursday decides ISO year
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function pickWeeklyFileId() {
    if (!DOUBLE_POINTS_IMAGE_FILE_IDS.length) return null;
    const week = isoWeekNumber(new Date());
    return DOUBLE_POINTS_IMAGE_FILE_IDS[week % DOUBLE_POINTS_IMAGE_FILE_IDS.length];
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
    const bullets = shuffle([
      'Every green and yellow **counts double** today.',
      'Outsmart, outguess, outplay your friends.',
      'Bring your A-game — or prepare for gentle humiliation.',
      'Post your board like your honour depends on it.',
    ]).slice(0, 3);

    const header = `🎉 *DOUBLE POINTS FRIDAY IS LIVE!*`;
    const body = bullets.map((b) => `• ${b}`).join('\n');

    // Optional: OpenAI quip (delete this whole block if you want it fully static)
    let quip = '';
    try {
      const q = await generateThemeQuip('friday');
      if (q) quip = `\n\n_${q}_`;
    } catch {
      // fail quietly
    }

    const msg = `${header}\n\n${body}${quip}`;

    // 1) send message
    await bot.sendMessage(groupChatId, msg, { parse_mode: 'Markdown' });

    // 2) send the weekly image
    const fileId = pickWeeklyFileId();
    if (fileId) {
      await bot.sendPhoto(groupChatId, fileId);
      // If you'd rather have a caption:
      // await bot.sendPhoto(groupChatId, fileId, { caption: '🎯 DOUBLE POINTS FRIDAY!', parse_mode: 'Markdown' });
    }
  });
};
