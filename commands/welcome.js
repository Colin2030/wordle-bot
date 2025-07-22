// commands/welcome.js
function getWelcomeMessage(name = 'Wordler') {
  return `👋 *Welcome to Wordle Workers*, ${name}!\n\n`
    + `You've just entered the Wordle Coliseum — where guesses are bold, scores are sacred, and bragging rights are earned daily. 🧠\n\n`
    + `📜 *Quick Rules:*\n`
    + `• Post your Wordle score each day — no lurking!\n`
    + `• Fridays = *DOUBLE POINTS*. Bring your A-game.\n`
    + `• Compete for daily, weekly, and monthly leaderboards.\n\n`
    + `Type /help for all available commands.\n\n`
    + `Good luck — may your greens be many, and your grays be few. 🎯`;
}

module.exports = function welcomeCommand(bot, _, groupChatId) {
  // Auto welcome on new member join
  bot.on('new_chat_members', (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    msg.new_chat_members.forEach((member) => {
      const message = getWelcomeMessage(member.first_name);
      bot.sendMessage(groupChatId, message, { parse_mode: 'Markdown' });
    });
  });

  // Manual /welcome command
  bot.onText(/\/welcome(@\w+)?/, (msg) => {
    if (String(msg.chat.id) !== String(groupChatId)) return;

    const name = msg.from.first_name || 'Wordler';
    const message = getWelcomeMessage(name);
    bot.sendMessage(groupChatId, message, { parse_mode: 'Markdown' });
  });
};