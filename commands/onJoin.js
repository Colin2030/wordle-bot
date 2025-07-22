// commands/onJoin.js

function getWelcomeMessage(namesList = []) {
  const namesText = namesList.length > 0 ? namesList.join(', ') : 'Wordlers';

  return `👋 *Welcome to Wordle W🧠kers*, ${namesText}! 🎉\n\n`
    + `This is no ordinary group – it's a battlefield of wits and words. 🧠\n\n`
    + `📜 *Quick Rules:*\n`
    + `• Submit your Wordle score daily — no lurking!\n`
    + `• Fridays = *DOUBLE POINTS*. Chaos reigns. 🔥\n`
    + `• Compete for daily, weekly, and monthly glory. 👑\n\n`
    + `Type /help to explore commands.\n\n`
    + `Good luck — let's see if you've got what it takes... 🎯`;
}

module.exports = function handleNewChatMembers(bot, _, groupChatId) {
  // Automatic welcome on joining
  bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    msg.new_chat_members.forEach((member) => {
      const name = member.first_name;
      const username = member.username ? `@${member.username}` : name;
      const message = getWelcomeMessage([username]);
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  });

  // Manual /welcome command with multiple @usernames
  bot.onText(/\/welcome\s*((?:@\w+\s*)+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const mentionsRaw = match[1] || '';
    const mentions = mentionsRaw.match(/@\w+/g) || [];

    const message = mentions.length > 0
      ? getWelcomeMessage(mentions)
      : getWelcomeMessage();

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
};
