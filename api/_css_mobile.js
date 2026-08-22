// The override layer, appended after the prototype stylesheet.
//
// Started as responsive-only and now also carries type decisions that apply at every width —
// the filename is a fossil. Kept separate because a change here is a 3KB transfer instead of
// re-sending the 33KB stylesheet, which is worth more than a tidy name. Everything overrides
// by source order at equal specificity, not by !important.
//
// Measured in real 390px and 820px viewports, not guessed.
module.exports = `
/* ---- iPad portrait ----
   The signature modules (lead + headlines rail, big-card + stack, recruiting) all collapse
   to one column at 860px. An iPad portrait is 820px, so it was falling into the phone
   layout: one 788px-wide cover per story and TOP HEADLINES pushed far below the fold.
   Between 761 and 860 the two-column rhythm holds, just tighter. */
@media(min-width:761px) and (max-width:860px){
  .cols{grid-template-columns:1.85fr 1fr;gap:22px}
  .secmod{grid-template-columns:1.5fr 1fr;gap:18px}
  .secmod.rev{grid-template-columns:1fr 1.5fr}
  .secmod.rev .stack{order:0}
  .reclay{grid-template-columns:1.1fr 1fr;gap:20px}
}

/* ---- touch ----
   The MOST READ row is a swipe on a touch screen; the arrow buttons are desktop furniture
   and just take up header room. */
@media(max-width:760px){
  .arrows{display:none}
  .sect{align-items:center}
}

/* Footer links were 9px type in a ~14px tap target. Give thumbs something to hit. */
@media(max-width:760px){
  .fl{gap:2px 14px;flex-wrap:wrap}
  .fl a{padding:9px 0;display:inline-block;font-size:9.5px}
}

/* ---- ticker on a phone ----
   At 218px a card and 19px of side padding, a 390px screen showed 1.8 cards: you could never
   see a matchup and the next one at the same time. Tighter cards fit ~2.5, and 8px off the
   height is 8px given back to the story above the fold. */
@media(max-width:600px){
  .tick{height:62px}
  .tkc{min-width:152px;padding:7px 12px;gap:3px}
  .tkc .tl{gap:8px}
  .tkbody{gap:8px}
  .tkdayl{font-size:7.5px}
  .tklead{font-size:7.5px}
}

/* The byline runs long on a phone once the photo credit is appended — let it breathe
   instead of crowding the headline. */
@media(max-width:480px){
  .abody .byl{line-height:1.7}
  .cols{gap:20px}
}

/* ---- ticker motion on touch ----
   The crawl is a transform on the track, so the container must stop being a scroller —
   two things moving the same strip would fight each other. touch-action:pan-y hands
   vertical swipes back to the page and keeps horizontal ones for the ticker. */
.tick.tkmove{overflow:hidden;touch-action:pan-y;cursor:auto;-webkit-overflow-scrolling:auto}
.tick.tkmove .tktrack{will-change:transform;transform:translate3d(0,0,0)}

/* ---- headlines in mixed case ----
   When every headline shouts, none of them do. The copy was always written in mixed case in
   the database — the caps were a stylesheet decision layered on top — so this is just a matter
   of letting the words through. Section labels, chips, the ticker and the wordmark keep their
   caps: that is furniture, and small caps still do real work there.
   Mixed case reads smaller than caps at the same size, so the type steps up to compensate, and
   slab at display size wants its tracking pulled in slightly. */
.acard .ttl{text-transform:none;font-size:17px;letter-spacing:-.01em;line-height:1.2}
.acard.sm .ttl{font-size:15px}
/* This clamp lands at ~22px across the iPad band, which is what the flat .lead .ttl override
   in the iPad block above used to set — media queries add no specificity, so that rule was
   being overridden by this one anyway. Removed it rather than leave a line that does nothing. */
.lead .ttl{font-size:clamp(20px,2.7vw,27px);line-height:1.14}
.rail a .h{text-transform:none;font-size:14.5px;letter-spacing:-.005em;line-height:1.22}
.abody h1{text-transform:none;letter-spacing:-.015em}
.abody h2{text-transform:none;letter-spacing:-.01em}
.cv .hl{text-transform:none;letter-spacing:-.01em}

/* ---- phone: less chrome standing between the reader and the first story ----
   The global league row is the hamburger panel's own first level, printed a second time. On a
   hub the same element is the tab bar — Scores, Rankings, Teams — which is real navigation, so
   only the duplicate goes: .qng is the league list, .qnt is the tabs.
   The home tagline goes with it. Together they are ~73px, which on a 390px phone is the
   difference between meeting the lead story above the fold and scrolling to find it. */
@media(max-width:760px){
  .qng{display:none}
  .kickhome{display:none}
}

/* ---- covers: actually round the photo ----
   .cv carries border-radius:10px but never had overflow:hidden, and .cvph has no radius of
   its own — so every photographed card has been drawing square photo corners through a
   rounded frame. It also clips the decorative SVG in the fallback cover, which was drawing a
   line 18px past its own box. */
.cv{overflow:hidden}

/* ---- tables on a touch screen ----
   The AVCA poll is 25 rows of team links and each anchor was about 22px tall — a quarter of
   an inch. The cell had the padding; the link, which is the thing you actually hit, did not. */
@media(max-width:820px){
  .tb td{padding:6px 10px}
  .tb .tmc{padding:9px 0}
  .tb .rk{font-variant-numeric:tabular-nums}
}

/* ---- the tagline goes at every width ----
   "THE HOME OF EVERYTHING VOLLEYBALL" ran above the lead story on every visit, at every
   size. It is the site talking about itself in the one place the reader came for a story.
   No masthead we compared against carries a tagline on any page. */
.kickhome{display:none}

/* ---- tablets get the phone's cuts ----
   Keyed on touch rather than width, so it catches an iPad in both orientations and never
   catches a laptop. The league row is the hamburger panel's first level printed twice and
   the panel is right there; the MOST READ arrows are mouse furniture on a strip you swipe. */
@media (hover:none) and (pointer:coarse){
  .qng{display:none}
  .arrows{display:none}
}

/* ---- article: things a thumb has to hit ----
   A well-sourced article prints eight source links at 9.5px in a 19px row, stacked — the
   hardest thing on the site to tap and the easiest to mis-tap into the wrong publisher.
   The tag row was 26px. Neither had anything to do with how they look; only how they sit. */
@media (hover:none) and (pointer:coarse){
  .srcs{padding:2px 0 2px 12px}
  .srcs a{padding:8px 0;font-size:10.5px}
  .tagrow{gap:9px}
  .tagrow a{padding:9px 12px}
}
`;
