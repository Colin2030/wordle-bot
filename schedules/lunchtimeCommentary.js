// schedules/lunchtimeCommentary.js

const cron = require('node-cron');
const { getAllScores } = require('../utils');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = function(bot, getAllScores, groupChatId) {
  cron.schedule('0 13 * * *', async () => {
    const scores = await getAllScores();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isFriday = now.getDay() === 5;

    const todayScores = scores.filter(([date]) => date === today);
    if (todayScores.length === 0) return;

    const leaderboard = {};
    todayScores.forEach(([_, player, score]) => {
      leaderboard[player] = (leaderboard[player] || 0) + parseInt(score);
    });

    const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

    if (sorted.length < 3) return; // Require at least 3 players to trigger commentary

    const summaryList = sorted.map(([player, score]) => `${player}: ${score}`).join('\n');
    const basePrompt = `Here are the Wordle scores so far today:\n${summaryList}\n\nWrite a witty, cheeky lunchtime commentary in the style of a sarcastic UK football pundit. Keep it under 50 words. Use UK English. Emojis welcome. Don’t include scores, just reactions.`;
    const sassyPrompt = `It's Friday. Be sassier and more theatrical with your commentary. Still keep it under 50 words.`;

    const prompt = isFriday ? `${basePrompt}\n\n${sassyPrompt}` : basePrompt;

    try {
      const response = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a cheeky football commentator reacting to daily Wordle scores with short witty banter.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'gpt-3.5-turbo',
        max_tokens: 100
      });

      const commentary = response.choices[0].message.content.trim();

      await bot.sendMessage(groupChatId, `🎙️ *Lunchtime Wordle Update:*

${commentary}` , {
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error('Failed to generate lunchtime commentary:', err);
    }
  });
};
