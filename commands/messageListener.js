const handleSubmission = require('../handleSubmission');

module.exports = function(bot, getAllScores, groupChatId) {
  bot.on('message', (msg) => {
    // Skip commands like /ping or /leaderboard
    if (msg.text && msg.text.startsWith('/')) return;

    // Delegate to handleSubmission logic
    handleSubmission(bot, msg);
  });
};