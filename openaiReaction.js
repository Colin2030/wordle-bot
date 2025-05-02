
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateReaction(score, attempts, player) {
  const prompt = `Write a witty, clever one-liner reaction for a Wordle score of ${score} solved in ${attempts} tries by a player named ${player}. Keep it fun, unique, and under 25 words.`;

  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      max_tokens: 60,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI API error:", err);
    return null;
  }
}

module.exports = { generateReaction };
