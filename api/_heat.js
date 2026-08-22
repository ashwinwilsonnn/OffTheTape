// Running order: what is hot, not what the desk once decided was important.
//
// The old order was `rank DESC, published_at DESC`, and rank won absolutely. That is why a
// GAMEDAY preview filed at rank 100 was still leading the site 29 hours later, above the
// recaps of the matches it had previewed. A number typed once cannot know the match has
// since been played.
//
// Two ideas, kept separate on purpose:
//
//   1. SHELF LIFE decides whether a story is still alive. It does not order live stories.
//      A gameday preview is worthless the moment the first serve lands; an argument piece is
//      still worth reading on Thursday. Anything past its shelf life drops below everything
//      that is still alive, ordered by how far past it is.
//
//   2. Among live stories the order is RECENCY, with rank as a thumb on the scale. Rank 100
//      is worth about a day of freshness — enough for the biggest story in the sport to hold
//      the lead through the afternoon, not enough to hold it through the week.
//
// Keeping them separate is what stops a long shelf life from quietly promoting a slow story
// over a fast one filed the same hour.

// Hours a kind of story stays alive. First pattern to match wins, so specific comes first.
// Matched against the part of the chip after the league.
const SHELF = [
  [/GAMEDAY|PREVIEW|DAY ONE|TONIGHT|TIP-?OFF|FIRST SERVE/, 16],   // dead once they play
  [/CHAMPIONSHIP|TITLE|CHAMPIONS\b/,                       72],   // a title outlives a result
  [/RECAP|FINAL|RESULT|SWEEP|WINNERS|SCOREBOARD|DAY \d/,   30],   // last night's news
  [/BREAKING|COMMIT|PORTAL|INJURY|TRANSFER|SIGNING|HIRE|FRONT OFFICE|EXPANSION/, 48],
  [/RANKINGS|POLL|CLASS OF|THE BOARD|BRACKET/,             96],   // weekly cadence — holds to the next one
  [/ARGUMENT|ANALYSIS|TREND|PLAYER|FILM|BUSINESS|OFFSEASON|SCHEDULE|FEATURE|ROSTER|SEASON ONE|EXPLAINER|WHY /, 110],
];
const DEFAULT_SHELF = 36;
const RANK_WORTH = 0.35;   // rank 100 ≈ one day of freshness

function shelfFor(chip) {
  const s = String(chip || '').toUpperCase();
  // Chips read "LEAGUE · KIND". The league half is never the story type, so drop it.
  const kind = s.includes('·') ? s.slice(s.indexOf('·') + 1) : s;
  for (const [re, hrs] of SHELF) if (re.test(kind)) return hrs;
  return DEFAULT_SHELF;
}

const ageHours = a => {
  const t = new Date(a.published_at || a.created_at).getTime();
  return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 36e5) : 0;
};

function heat(a) {
  const age = ageHours(a);
  const spent = age / shelfFor(a.chip);
  // Past its shelf life: out of the running, ordered by how far past. Always below zero,
  // so a live story always wins however dull it is.
  if (spent >= 1) return -spent;
  // Alive: newest first. 1.0 at publish, 0.5 at a day old, 0.25 at three days.
  const rank = Math.max(0, Math.min(Number(a.rank) || 0, 100)) / 100;
  return 1 / (1 + age / 24) + RANK_WORTH * rank;
}

// Ties fall back to recency, which is the whole point.
const byHeat = (a, b) => (heat(b) - heat(a)) || (ageHours(a) - ageHours(b));

module.exports = { SHELF, DEFAULT_SHELF, RANK_WORTH, shelfFor, heat, byHeat, ageHours };
