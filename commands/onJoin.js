// commands/onJoin.js
module.exports = function handleNewChatMembers(bot, groupChatId) {
  bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;

    msg.new_chat_members.forEach((member) => {
      const welcomeMessage = `👋 *Welcome to Wordle Workers*, ${member.first_name}!\n\n`
        + `This is no ordinary group – it's a battlefield of wits and words. 🧠\n\n`
        + `Here’s what you need to know:\n`
        + `• Submit your Wordle score daily – or be forgotten. 🕳️\n`
        + `• Fridays = *DOUBLE POINTS*. Chaos reigns. 🔥\n`
        + `• Glory awaits at daily, weekly, and monthly levels. 👑\n\n`
        + `Type /help to see what you're up against.\n\n`
        + `Let's see if you’ve got what it takes... 🎯`;

      bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });
  });
};