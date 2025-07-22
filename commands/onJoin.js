// commands/onJoin.js

function getWelcomeMessage(name, username, includeName = true) {
  const displayName = username ? `@${username}` : name || 'Wordler';

  return `👋 *Welcome to Wordle Workers*${includeName ? `, ${displayName}` : ''}! 🎉\n\n`
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
      const message = getWelcomeMessage(member.first_name, member.username, true);
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  });

  // Manual /welcome command with optional @username
  bot.onText(/\/welcome(?:\s+(@\w+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    const mentionedUsername = match[1]; // will be undefined if not provided
    const message = mentionedUsername
      ? getWelcomeMessage('', mentionedUsername.replace('@', ''), true)
      : getWelcomeMessage('', '', false);

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
};
