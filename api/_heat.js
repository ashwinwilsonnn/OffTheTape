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

// A standing editorial preference, not a news judgement. The audience is American, so NCAA
// women is the spine of the site and gets a thumb on the scale for free. It is deliberately
// small: a rank of about 35 anywhere else clears it, so a genuinely bigger story from Turkey
// or the VNL still leads. This is a tiebreaker between comparable stories, never a ceiling.
const LEAGUE_WEIGHT = {
  ncaaw:   0.12,   // the core of the audience
  lovb:    0.05,   // US pro women
  recruit: 0.04,   // US, and it feeds ncaaw
  mlv:     0.04,   // US pro men
  ncaam:   0.03,
  beach:   0.03,   // AVP is American but niche
  intl:    0,      // baseline — has to earn the lead on rank
};

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
  const league = LEAGUE_WEIGHT[a.lg || a.league] || 0;
  return 1 / (1 + age / 24) + RANK_WORTH * rank + league;
}

// Ties fall back to recency, which is the whole point.
const byHeat = (a, b) => (heat(b) - heat(a)) || (ageHours(a) - ageHours(b));

module.exports = { SHELF, DEFAULT_SHELF, RANK_WORTH, LEAGUE_WEIGHT, shelfFor, heat, byHeat, ageHours };
