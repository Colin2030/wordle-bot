module.exports = function nerdyAnnouncement(bot, _, groupChatId) {
  bot.onText(/\/announce(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const announcement = `🧠 *Scoring Patch Incoming @ 23:59!* 🧠\n\n`
      + `Heads up, forensic Wordlers! 🧬🔍\n\n`
      + `We’ve overhauled the scoring algorithm — and yes, it’s *finally deterministic*. Here's what's changing:\n\n`
      + `🟩 Early greens now get higher weight — we reward front-loading your logic.\n`
      + `🟨 Yellows matter too (but no bonus for repeating evidence).\n`
      + `🟨➜🟩 transitions are now traceable and rewarded.\n`
      + `⬛ All-gray lines? Expect a minor penalty — no signal = no glory.\n`
      + `🎯 Tie scores should now be rarer than a clean MD5 collision.\n\n`
      + `👀 The new logic will deploy *tonight at 23:59* (BST). All tomorrow’s submissions will be scored with version 2.0 of the truth engine™.\n\n`
      + `➤ Post your results\n`
      + `➤ Trust the output\n`
      + `➤ Respect the protocol 🧑‍💻`;

    bot.sendMessage(groupChatId, announcement, { parse_mode: 'Markdown' });
  });
};
