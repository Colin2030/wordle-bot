const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateReaction(score, attempts, player, streak = null) {
  let mood = "fun and witty";

  if (attempts === 'X') {
    mood = "savage and sarcastic, but still clever and light-hearted";
  } else {
    const num = parseInt(attempts);
    if (num >= 6) mood = "brutally honest and teasing, but not mean";
    else if (num >= 4) mood = "a bit cheeky or snarky";
    else mood = "light, positive, and celebratory";
  }

  let streakNote = streak ? ` They are on a Wordle streak of ${streak} days.` : "";

  const messages = [
    {
      role: "system",
      content: `You are a ${mood} British commentator reacting to Wordle scores. Use UK English. Be clever, keep it under 25 words. Emojis welcome.`
    },
    {
      role: "user",
      content: `Player ${player} completed today's Wordle in ${attempts} attempts with a score of ${score}.${streakNote} Write a one-liner reaction.`
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
