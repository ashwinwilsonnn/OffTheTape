// GET /api/logo?id=<team> — dark-mode variants for the few marks whose official art
// disappears on the site's #0A0A0A background and that have no hosted dark version.
//
// Why this exists: LOVB's team SVGs paint with `currentColor`, and inside an <img> tag
// currentColor resolves to BLACK — every LOVB mark was black-on-black. The SF Signal glyph
// and a couple of college wordmarks hard-code near-black/navy fills. Nobody publishes a
// white version at a stable URL, so this proxy fetches the official SVG and recolors it
// white — the same treatment those brands use on their own dark surfaces. No backgrounds,
// no chips: the mark itself becomes the dark-mode variant, like every other logo on the site.
//
// Only ids in SRC are served (this is not an open proxy). Aggressively CDN-cached.
const SRC = {
  latl: { url: 'https://www.lovb.com/api/media/file/team-atlanta-256.svg' },
  laus: { url: 'https://www.lovb.com/api/media/file/team-austin-256.svg' },
  lhou: { url: 'https://www.lovb.com/api/media/file/team-houston-255.svg' },
  lmad: { url: 'https://www.lovb.com/api/media/file/team-madison-254.svg' },
  lneb: { url: 'https://www.lovb.com/api/media/file/team-nebraska-251.svg' },
  lslc: { url: 'https://www.lovb.com/api/media/file/team-salt-lake-253.svg' },
  lsf:  { url: 'https://www.lovb.com/api/media/file/sf_glyph_black_64.svg' },
  // college wordmarks whose only official file is a dark single color
  psu:  { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Penn_State_Athletics_wordmark.svg' },
  psum: { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Penn_State_Athletics_wordmark.svg' },
  tcu:  { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/TCU_Horned_Frogs_logo.svg' }
};
// every dark fill any of the sources use -> white
const DARK_FILLS = /#(212324|1a1a1a|001e44|041e42|4d1979|000000|000\b)/gi;

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '');
  const src = SRC[id];
  if (!src) { res.status(404).send('unknown id'); return; }
  try {
    const r = await fetch(src.url, { headers: { 'User-Agent': 'OffTheTape/1.0 (+https://off-the-tape.com)' }, redirect: 'follow' });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    let svg = await r.text();
    if (!/<svg/i.test(svg)) throw new Error('upstream is not svg');
    svg = svg
      .replace(DARK_FILLS, '#FFFFFF')
      .replace(/fill\s*=\s*"black"/gi, 'fill="#FFFFFF"')
      .replace(/stroke\s*=\s*"black"/gi, 'stroke="#FFFFFF"')
      // currentColor resolves against the `color` property; set it white at the root
      .replace(/<svg\b/i, '<svg color="#FFFFFF"');
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
    res.status(200).send(svg);
  } catch (e) {
    // fail as an image, not an error page — the <img> onerror fallback chip takes over
    res.status(502).send('');
  }
};
