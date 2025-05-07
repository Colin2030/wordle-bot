const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateReaction(score, attempts, player) {
  let mood = "fun and witty";

  if (attempts === 'X') {
    mood = "savage and sarcastic, but still clever and light-hearted";
  } else {
    const num = parseInt(attempts);
    if (num >= 6) mood = "brutally honest and teasing, but not mean";
    else if (num >= 4) mood = "a bit cheeky or snarky";
    else mood = "light, positive, and celebratory";
  }

  const messages = [
    {
      role: "system",
      content: `You are a ${mood} British commentator reacting to Wordle scores. Write in UK English. Keep it clever, under 25 words. Emojis welcome.`
    },
    {
      role: "user",
      content: `Player ${player} just completed today's Wordle in ${attempts} attempts. Give a one-line reaction based on that performance.`
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      messages,
      model: "gpt-3.5-turbo",
      max_tokens: 60
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI API error:", err);
    return null;
  }
}

module.exports = { generateReaction };

