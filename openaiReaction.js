// openaiReaction.js — Abacus RouteLLM edition
// Rivals: standings computed from scores (not pre-set strings)
// Reduced nonsense: tighter temperatures, simplified prompt stacking
const { OpenAI } = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({
  apiKey: process.env.ABACUS_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
});

const MODEL = process.env.ABACUS_REACTIONS_MODEL || 'route-llm';

// --- anti-repeat ring buffer ---
const RECENT_MAX = 120;
const recent = [];
const hashOf = (t) => crypto.createHash('md5').update(String(t).toLowerCase()).digest('hex');
const pushRecent = (text) => { recent.push(hashOf(text)); if (recent.length > RECENT_MAX) recent.shift(); };
const isRepeat = (text) => recent.includes(hashOf(text));

// --- personas ---
const PERSONAS = {
  brutal: [
    "a weary stand-up comic at the late slot in Soho",
    "a sardonic pub landlord who's seen it all and liked none of it",
    "a tabloid columnist with too much caffeine and not enough empathy",
    "a scathing quiz-show chaser on a sugar crash",
  ],
  cheerful: [
    "a camp 90s gameshow host hyped on jelly babies",
    "an over-zealous children's TV presenter clapping at everything",
    "a glitter-cannon talent-show judge with zero restraint",
    "a teenage esports streamer narrating at 1.5x speed",
  ],
  posh: [
    "an absurdly posh Oxbridge don pretending to understand commoners",
    "a Radio 4 arts critic appalled by your taste yet fascinated",
    "a royal correspondent reporting from a very serious event",
  ],
  highbrow: [
    "a cutting political journalist who thinks Wordle is policy failure",
    "a sceptical data journalist",
  ],
  niche: [
    "a PE teacher doing 'character building' with phonemes",
    "a weary GP delivering your diagnosis: chronic vowel misuse",
    "a British wrestling commentator",
  ],
};

const MOODS = {
  zero:    ["merciless", "withering", "snark-heavy", "gloriously petty"],
  fail:    ["savage", "acidic", "dry", "arch"],
  one:     ["genuinely complimentary", "awe-struck", "warm", "celebratory"],
  two:     ["complimentary", "effusive", "smug-on-your-behalf"],
  three:   ["impressed", "warmly sardonic", "crisply approving"],
  four:    ["backhanded", "guarded", "polite-but-judgy"],
  five:    ["deadpan", "tut-forward", "tight-lipped approval"],
  six:     ["mocking", "exasperated", "dramatic sighing"],
  default: ["bemused", "eccentric", "Partridge-adjacent"],
};

function pickWeighted(groups) {
  const total = groups.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (const g of groups) {
    r -= g.weight;
    if (r <= 0) return g.list[Math.floor(Math.random() * g.list.length)];
  }
  const flat = groups.flatMap(g => g.list);
  return flat[Math.floor(Math.random() * flat.length)];
}

function moodFor(attempts, score) {
  if (score === 0) return MOODS.zero;
  if (attempts === 'X') return MOODS.fail;
  const n = parseInt(attempts, 10);
  return MOODS[['one','two','three','four','five','six'][n - 1]] || MOODS.default;
}

function personaFor(attempts, score) {
  const n = attempts === 'X' ? 7 : parseInt(attempts, 10);
  if (score === 0 || attempts === 'X' || n === 6) {
    return pickWeighted([
      { weight: 5, list: PERSONAS.brutal },
      { weight: 2, list: PERSONAS.highbrow },
      { weight: 1, list: PERSONAS.niche },
    ]);
  }
  if (n <= 2) {
    return pickWeighted([
      { weight: 6, list: PERSONAS.cheerful },
      { weight: 3, list: PERSONAS.posh },
      { weight: 1, list: PERSONAS.highbrow },
    ]);
  }
  if (n === 3) {
    return pickWeighted([
      { weight: 4, list: PERSONAS.posh },
      { weight: 3, list: PERSONAS.cheerful },
      { weight: 2, list: PERSONAS.highbrow },
      { weight: 1, list: PERSONAS.niche },
    ]);
  }
  return pickWeighted([
    { weight: 3, list: PERSONAS.posh },
    { weight: 3, list: PERSONAS.highbrow },
    { weight: 2, list: PERSONAS.brutal },
    { weight: 2, list: PERSONAS.cheerful },
    { weight: 1, list: PERSONAS.niche },
  ]);
}

// Pick ONE style flourish — kept simple to avoid prompt overload
function spice(isQuickWin) {
  const POSITIVE = [
    "use one sly British idiom",
    "include a faux-dramatic aside — in dashes",
    "drop one mock-epic metaphor",
    "include exactly one emoji",
  ];
  const DEFAULT = [
    "use one sly British idiom",
    "include a faux-dramatic aside — in dashes",
    "end with a tiny wink of menace",
    "add a posh tut or sigh in quotes",
    "include exactly one emoji",
    "no emoji — make it cutting",
  ];
  const pool = isQuickWin ? POSITIVE : DEFAULT;
  return pool[Math.floor(Math.random() * pool.length)];
}

const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// --- rival helper ---
// Pass { name, playerScore, rivalScore, rank?: { you, rival, size } }
// relation is always computed here from scores — never trust a pre-set string
function rivalInstruction(rival, isQuickWin) {
  if (!rival) return "";

  // Back-compat: plain string
  if (typeof rival === "string") {
    return isQuickWin
      ? ` Briefly mention rival ${rival} in a warm, modest aside.`
      : ` Briefly nudge about rival ${rival} in a cheeky clause.`;
  }

  const { name, playerScore, rivalScore, rank } = rival;
  if (!name) return "";

  // Compute relation from actual scores
  let relation = "tied";
  if (typeof playerScore === "number" && typeof rivalScore === "number") {
    if (playerScore > rivalScore) relation = "ahead";
    else if (playerScore < rivalScore) relation = "behind";
  } else if (rival.relation) {
    relation = rival.relation; // legacy fallback
  }

  const delta = (typeof playerScore === "number" && typeof rivalScore === "number")
    ? Math.abs(Math.round(playerScore - rivalScore))
    : (typeof rival.delta === "number" ? Math.abs(Math.round(rival.delta)) : null);

  const gap = delta !== null && delta > 0 ? ` (${delta} pts)` : "";

  const rankBit = rank && Number.isInteger(rank.you) && Number.isInteger(rank.rival)
    ? ` Leaderboard: you ${rank.you}/${rank.size}, ${name} ${rank.rival}/${rank.size}.`
    : "";

  if (relation === "ahead") {
    return isQuickWin
      ? ` Add a warm, modest flex: they're ahead of ${name}${gap}.${rankBit}`
      : ` Sly note: they're ahead of ${name}${gap}.${rankBit} Cheeky, not nasty.`;
  }
  if (relation === "behind") {
    return isQuickWin
      ? ` Friendly chase note: catching up to ${name}${gap}.${rankBit}`
      : ` Cheeky prod: still chasing ${name}${gap}.${rankBit}`;
  }
  return isQuickWin
    ? ` Light aside: neck-and-neck with ${name}.${rankBit}`
    : ` Cheeky note: neck-and-neck with ${name}.${rankBit}`;
}

/**
 * Generate a UK-English one-liner reaction to a Wordle result.
 *
 * @param {number} score
 * @param {string|number} attempts  - number 1–6 or 'X'
 * @param {string} player
 * @param {number|null} streak
 * @param {{pronoun: string, possessive: string}|null} pronouns
 * @param {{name: string, playerScore: number, rivalScore: number, rank?: object}|string|null} rival
 */
async function generateReaction(score, attempts, player, streak = null, pronouns = null, rival = null) {
  const n = attempts === 'X' ? 7 : parseInt(attempts, 10);
  const isQuickWin = n >= 1 && n <= 3 && score > 0;

  const persona  = personaFor(attempts, score);
  const tone     = moodFor(attempts, score);
  const styleNote = spice(isQuickWin);
  const wordLimit = randInt(12, 24); // tightened upper bound slightly

  const streakNote  = score > 0 && streak ? ` Streak: ${streak} day(s).` : "";
  const pronounNote = pronouns ? ` Refer to ${player} as "${pronouns.pronoun}"/"${pronouns.possessive}".` : "";
  const rivalNote   = rivalInstruction(rival, isQuickWin);

  // Kept to 4–5 clear rules to avoid prompt overload causing nonsense
  const system = [
    `You are ${persona}. UK English only.`,
    `Tone: ${tone.slice(0, 2).join(" and ")}.`,
    isQuickWin
      ? "Be genuinely complimentary. Praise the play — warm wit, not snarky."
      : "Be acerbic. Roast the play, not the person. Witty, not abusive.",
    attempts === 'X' || score === 0 ? "They failed — go harder, still witty." : "",
    `One sentence, under ${wordLimit} words. Style: ${styleNote}.`,
    pronounNote,
    rivalNote,
  ].filter(Boolean).join(' ');

  const user = `${player} solved Wordle in ${attempts} attempt(s), score ${score}.${streakNote} One-liner reaction:`;

  const messages = [
    { role: "system", content: system },
    { role: "user",   content: user },
  ];

  for (let i = 0; i < 3; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 100,
        temperature: isQuickWin ? 0.7 : 0.8,  // tighter = less nonsense
        top_p: 0.9,
        frequency_penalty: 0.4,
        presence_penalty: 0.4,
      });
      const text = (response.choices?.[0]?.message?.content || "").trim();
      if (!text) throw new Error("Empty completion");
      if (isRepeat(text)) {
        messages[0].content += " Completely different angle and phrasing.";
        continue;
      }
      pushRecent(text);
      return text;
    } catch (err) {
      if (i === 2) {
        return isQuickWin
          ? "That's slick. Like threading a five-letter needle before breakfast. 🎯"
          : "That was… a choice. The dictionary would like a word back.";
      }
    }
  }
}

/**
 * Short quip for Friday/weekly/monthly announcements.
 */
async function generateThemeQuip(theme, context = "") {
  const persona = pickWeighted([
    { weight: 3, list: PERSONAS.brutal },
    { weight: 3, list: PERSONAS.cheerful },
    { weight: 2, list: PERSONAS.posh },
    { weight: 2, list: PERSONAS.highbrow },
  ]);

  const limits = {
    friday:  { words: 18, emojiMax: 2, tone: "chaotic, gleefully competitive, slightly menacing" },
    weekly:  { words: 22, emojiMax: 1, tone: "dry, celebratory, backhanded where apt" },
    monthly: { words: 24, emojiMax: 1, tone: "mock-epic, ceremonial, faintly ridiculous" },
  }[theme] || { words: 20, emojiMax: 1, tone: "witty and acerbic" };

  const messages = [
    {
      role: "system",
      content: `You are ${persona}. UK English. Under ${limits.words} words. Max ${limits.emojiMax} emoji. Tone: ${limits.tone}. Roast the play, not the person. Be fresh.`,
    },
    { role: "user", content: `One quip for a ${theme} Wordle announcement. Context: ${context}` },
  ];

  for (let i = 0; i < 3; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 70,
        temperature: 0.8,
        frequency_penalty: 0.3,
        presence_penalty: 0.4,
      });
      const text = (response.choices?.[0]?.message?.content || "").trim();
      if (!text) throw new Error("Empty completion");
      if (isRepeat(text)) {
        messages[0].content += " Completely different angle.";
        continue;
      }
      pushRecent(text);
      return text;
    } catch {
      if (i === 2) return "";
    }
  }
  return "";
}

module.exports = { generateReaction, generateThemeQuip };