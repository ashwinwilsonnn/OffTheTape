// Responsive refinements, layered after the prototype stylesheet.
//
// Kept in its own file so a phone/tablet tweak is a 2KB change instead of re-transferring
// the 34KB stylesheet. Everything here overrides by source order, not by !important.
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
  .lead .ttl{font-size:22px}
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

/* The byline runs long on a phone once the photo credit is appended — let it breathe
   instead of crowding the headline. */
@media(max-width:480px){
  .abody .byl{line-height:1.7}
  .cols{gap:20px}
}
`;
