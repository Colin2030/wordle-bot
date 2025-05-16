const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateReaction(score, attempts, player, streak = null) {
  let mood;
  if (score === 0) {
    mood = "mercilessly mocking, clever and funny — give them a roasting they'll remember";
  } else if (attempts === 'X') {
    mood = "savage and sarcastic, but still clever";
  } else {
    const num = parseInt(attempts);
    switch (num) {
      case 1: mood = "awe-struck and theatrical — like witnessing a miracle on grass"; break;
      case 2: mood = "over-the-top and giddy — imagine a pundit losing their mind at a screamer"; break;
      case 3: mood = "punchy and impressed — like a seasoned commentator spotting a rising star"; break;
      case 4: mood = "mildly impressed but withholding praise — classic British backhanded compliment"; break;
      case 5: mood = "deadpan, dry and eyebrow-raised — they just about scraped through"; break;
      case 6: mood = "mocking, exhausted and dramatic — like it was painful to witness"; break;
      default: mood = "bemused and eccentric — channel your inner Alan Partridge"; break;
    }
  }

  const personas = [
    "a Shakespearean bard delivering hot takes on wordplay",
    "a Premier League pundit in a post-match meltdown",
    "a very risque comedian, like Julian Clary, who loves a rude double entendre",
    "a camp 90s gameshow host hyped on sugar",
    "an over zealous childrens TV presenter",
    "a dour, middle aged man who is tired of life and only speaks in sarcasm. Not understanding the point of Wordle",
    "a cutting high-brow political journalist, very condesending",
    "an extremely posh Oxbridge don pretending to understand commoners",
    "a football manager trying to stay diplomatic",
    "a teenage esports streamer with way too much energy",
    "a sarcastic pub quiz host with a hangover",
    "a wrestling commentator who thinks Wordle is real combat"
  ];

  const persona = personas[Math.floor(Math.random() * personas.length)];
  const streakNote = streak ? ` They are on a Wordle streak of ${streak} days.` : "";

  const messages = [
    {
      role: "system",
      content: `You are ${persona}, reacting to Wordle scores. Your tone should be ${mood}. Use UK English. Be clever, keep it under 25 words. Emojis welcome.`
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

