// openaiReaction.js — smart rivals (ahead/behind/tied) + compliment/acerbic tuning
const { OpenAI } = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- anti-repeat ring buffer (per-process) ---
const RECENT_MAX = 120;
const recent = [];
const hashOf = (t) => crypto.createHash('md5').update(String(t).toLowerCase()).digest('hex');
const pushRecent = (text) => { recent.push(hashOf(text)); if (recent.length > RECENT_MAX) recent.shift(); };
const isRepeat = (text) => recent.includes(hashOf(text));

// --- personas & moods (unchanged) ---
const PERSONAS = {
  brutal: [
    "a weary stand-up comic at the late slot in Soho",
    "a sardonic pub landlord who’s seen it all and liked none of it",
    "a tabloid columnist with too much caffeine and not enough empathy",
    "a scathing quiz-show chaser on a sugar crash",
  ],
  cheerful: [
    "a camp 90s gameshow host hyped on jelly babies",
    "an over-zealous children’s TV presenter clapping at everything",
    "a glitter-cannon talent-show judge with zero restraint",
    "a teenage esports streamer narrating at 1.5x speed",
  ],
  posh: [
    "an absurdly posh Oxbridge don pretending to understand commoners",
    "a Radio 4 arts critic appalled by your taste yet fascinated",
    "a royal correspondent reporting from a very serious anagram",
  ],
  highbrow: [
    "a cutting political journalist who thinks Wordle is policy failure",
    "a sceptical data journalist squinting at your sample size of one",
  ],
  niche: [
    "a PE teacher doing ‘character building’ with phonemes",
    "a weary GP delivering your diagnosis: chronic vowel misuse",
    "a British wrestling commentator calling a chair shot from the dictionary",
  ],
};

const MOODS = {
  zero: ["merciless", "withering", "snark-heavy", "gloriously petty"],
  fail: ["savage", "acidic", "dry", "arch"],
  one: ["genuinely complimentary", "awe-struck", "warm", "celebratory"],
  two: ["complimentary", "effusive", "smug-on-your-behalf"],
  three: ["impressed", "warmly sardonic", "crisply approving"],
  four: ["backhanded", "guarded", "polite-but-judgy"],
  five: ["deadpan", "tut-forward", "tight-lipped approval"],
  six: ["mocking", "exasperated", "dramatic sighing"],
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
  switch (n) {
    case 1: return MOODS.one;
    case 2: return MOODS.two;
    case 3: return MOODS.three;
    case 4: return MOODS.four;
    case 5: return MOODS.five;
    case 6: return MOODS.six;
    default: return MOODS.default;
  }
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
  if (n === 1 || n === 2) {
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

function spice(mode = 'default') {
  const POSITIVE = [
    "use one sly British idiom",
    "include a faux-dramatic aside — in dashes",
    "drop one mock-epic metaphor",
    "include exactly one emoji",
    "include exactly two emojis",
  ];
  const DEFAULT = [
    "use one sly British idiom",
    "include a faux-dramatic aside — in dashes",
    "drop one mock-epic metaphor",
    "end with a tiny wink of menace",
    "add a posh tut or sigh in quotes",
    "use one tasteful double entendre",
    "include exactly one emoji",
    "include exactly two emojis",
    "no emoji — make it cutting",
  ];
  const pool = mode === 'positive' ? POSITIVE : DEFAULT;
  return pool[Math.floor(Math.random() * pool.length)];
}

const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// --- rival helper: accepts string OR object with { name, relation, delta, rank?: { you, rival, size, period } } ---
function rivalInstruction(rival, isQuickWin) {
  if (!rival) return "";

  // Back-compat: plain string
  if (typeof rival === "string") {
    return isQuickWin
      ? ` If it fits, add a light, friendly aside about ${rival}.`
      : ` If it fits, nudge about rival ${rival} in a short cheeky clause.`;
  }

  const { name, relation, delta, rank } = rival || {};
  if (!name || !relation) return "";

  const gap =
    typeof delta === "number" && isFinite(delta)
      ? ` (gap: ${Math.abs(Math.round(delta))} pts)`
      : "";

  const rankBit = rank && Number.isInteger(rank.you) && Number.isInteger(rank.rival)
    ? ` Weekly ranks — you: ${rank.you}/${rank.size}, ${name}: ${rank.rival}/${rank.size}.`
    : "";

  if (relation === "ahead") {
    // player is AHEAD of rival
    return isQuickWin
      ? ` Add a warm, modest flex about being ahead of ${name}${gap}.${rankBit}`
      : ` Include a sly note that they're ahead of ${name}${gap}.${rankBit} Keep it cheeky, not nasty.`;
  }
  if (relation === "behind") {
    // player is BEHIND rival
    return isQuickWin
      ? ` Add a friendly chase note about catching ${name}${gap}.${rankBit}`
      : ` Include a cheeky prod about chasing ${name}${gap}.${rankBit}`;
  }
  // tied
  return isQuickWin
    ? ` Add a light aside that they're neck-and-neck with ${name}.${rankBit}`
    : ` Include a cheeky note that it's neck-and-neck with ${name}.${rankBit}`;
}


/**
 * Generate a varied UK-English one-liner about a Wordle result.
 * Compliments for 1–3; acerbic for 4–6/X. Rival mention is directionally correct.
 */
async function generateReaction(score, attempts, player, streak = null, pronouns = null, rival = null) {
  const n = attempts === 'X' ? 7 : parseInt(attempts, 10);
  const isQuickWin = (n >= 1 && n <= 3) && score > 0;

  const persona = personaFor(attempts, score);
  const tone = moodFor(attempts, score);
  const styleNote = spice(isQuickWin ? 'positive' : 'default');

  const streakNote = (score > 0 && streak) ? ` They are on a streak of ${streak} day(s).` : "";
  const pronounNote = pronouns ? ` When referring to ${player}, use "${pronouns.pronoun}" and "${pronouns.possessive}".` : "";

  const rivalNote = rivalInstruction(rival, isQuickWin);

  const wordLimit = randInt(12, 26);
  const emojiLimit = /emoji/.test(styleNote) ? (styleNote.includes('two') ? 2 : 1) : (isQuickWin ? 1 : 0);

  const policy = isQuickWin
    ? `Be clearly complimentary and celebratory. Praise the *play* without undercutting it. Keep wit warm, not snarky.`
    : `Acerbic is fine; roast the *play*, not the person. Keep it witty, not abusive.`;

  const collapseRule = isQuickWin ? `` : `If attempts is 'X' or score is 0: assume a collapse — go harder, still witty.`;

  const system = [
    `You are ${persona}.`,
    `Tone: one or two of ${tone.join(", ")}; UK English.`,
    policy,
    `Keep it under ${wordLimit} words.`,
    `At most ${emojiLimit} emoji.`,
    `Avoid overused lines.`,
    `Vary rhythm (clauses, dashes, asides).`,
    collapseRule,
    styleNote,
    pronounNote,
    rivalNote,
  ].filter(Boolean).join(' ');

  const user = `Player ${player} completed today's Wordle in ${attempts} attempt(s) with a score of ${score}.${streakNote} Write a single one-liner reaction.`;

  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  for (let i = 0; i < 3; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_REACTIONS_MODEL || "gpt-4o-mini",
        messages,
        max_tokens: 70,
        temperature: isQuickWin ? 0.85 : 0.95,
        top_p: 0.9,
        frequency_penalty: 0.35,
        presence_penalty: 0.6,
      });
      const text = (response.choices?.[0]?.message?.content || "").trim();
      if (!text) throw new Error("Empty completion");
      if (isRepeat(text)) {
        messages[0].content += " Switch angle and phrasing entirely.";
        continue;
      }
      pushRecent(text);
      return text;
    } catch (err) {
      if (i === 2) {
        return isQuickWin
          ? "That’s slick. Like threading a five-letter needle before breakfast. 🎯"
          : "That was… a choice. The dictionary would like a word back.";
      }
    }
  }
}

/**
 * Short hype/roast quips for announcements (Friday/weekly/monthly).
 */
async function generateThemeQuip(theme, context = "") {
  const persona = pickWeighted([
    { weight: 3, list: PERSONAS.brutal },
    { weight: 3, list: PERSONAS.cheerful },
    { weight: 2, list: PERSONAS.posh },
    { weight: 2, list: PERSONAS.highbrow },
  ]);

  const limits = {
    friday: { words: 18, emojiMax: 2, tone: "chaotic, gleefully competitive, slightly menacing" },
    weekly: { words: 22, emojiMax: 1, tone: "dry, celebratory, backhanded where apt" },
    monthly: { words: 24, emojiMax: 1, tone: "mock-epic, ceremonial, faintly ridiculous" },
  }[theme] || { words: 20, emojiMax: 1, tone: "witty and acerbic" };

  const messages = [
    { role: "system", content: `You are ${persona}. UK English. Keep it under ${limits.words} words. At most ${limits.emojiMax} emoji. Tone: ${limits.tone}. Roast the play, not the person. Be fresh, not generic.` },
    { role: "user", content: `Write one quip for a ${theme} announcement. Context: ${context}` }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_REACTIONS_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 60,
      temperature: 0.9,
      frequency_penalty: 0.25,
      presence_penalty: 0.5,
    });
    const text = (response.choices?.[0]?.message?.content || "").trim();
    return text || "";
  } catch {
    return "";
  }
}

module.exports = { generateReaction, generateThemeQuip };
