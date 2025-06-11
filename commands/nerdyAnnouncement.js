module.exports = function nerdyAnnouncement(bot, _, groupChatId) {
  bot.onText(/\/announce(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const welcome = `👋 *Welcome, Eloise!* 🎉\n\n`
      + `You've just entered the Wordle Coliseum — where guesses are bold, scores are sacred, and bragging rights are earned daily.\n\n`
      + `📜 Quick rules:\n`
      + `• Post your Wordle score each day – no lurking!\n`
      + `• Fridays = DOUBLE POINTS. Strategy matters.\n`
      + `• Track your glory on the leaderboards.\n\n`
      + `Type /help to explore your new arsenal of commands.\n\n`
      + `Good luck, Eloise – the competition is *fierce*. 🔥\n\n`;

    const announcement = `🧠 *Scoring V2 is live!* 🧠\n\n`
      + `Heads up, forensic Wordlers! 🧬🔍\n\n`
      + `We’ve overhauled the scoring algorithm — and yes, it’s *finally deterministic*. Here's what's new:\n\n`
      + `🟩 Early greens now get higher weight — we reward front-loading your logic.\n`
      + `🟨 Yellows matter too (but no bonus for repeating evidence).\n`
      + `🟨➜🟩 transitions are now traceable and rewarded.\n`
      + `⬛ All-gray lines? Expect a minor penalty — no signal = no glory.\n`
      + `🎯 With scores down to 0.1 divisions, ties should now be rarer than a clean MD5 collision.\n\n`
      + `👀 All new submissions will be scored with version 2.0 of the truth engine™.\n\n`
      + `➤ Post your results\n`
      + `➤ Trust the output\n`
      + `➤ Respect the protocol 🧑‍💻`;

    bot.sendMessage(groupChatId, welcome + announcement, { parse_mode: 'Markdown' });
  });
};