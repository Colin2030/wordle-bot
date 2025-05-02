const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateReaction(score, attempts, player) {
  const messages = [
    {
      role: "system",
      content: "You are a witty and fun commentator who delivers short, clever one-liners in response to Wordle game outcomes."
    },
    {
      role: "user",
      content: `Write a witty, clever one-liner reaction for a Wordle score of ${score} solved in ${attempts} tries by a player named ${player}. Keep it fun, unique, and under 25 words.`
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
