// GET /api/logo — two jobs in one function (Vercel Hobby caps a deployment at 12
// serverless functions, so the temporary audit rides inside the permanent proxy).
//
//   ?id=<team>            — PERMANENT: dark-mode variant for marks that vanish on #0A0A0A.
//     LOVB's team SVGs paint with `currentColor`, and inside an <img> tag currentColor
//     resolves to BLACK — every LOVB mark was black-on-black. The SF Signal glyph and the
//     PSU/TCU wordmarks hard-code near-black fills. Nobody hosts a white version at a
//     stable URL, so this fetches the official SVG and recolors it white — the treatment
//     those brands use on their own dark surfaces. No chips, no backgrounds. Known ids
//     only (not an open proxy), CDN-cached a week.
//
//   ?mode=audit-teams | audit-espn | audit-lovb [&ids=a,b] — TEMPORARY diagnostics used
//     to build and verify the logo fix (existence + visibility analysis, pure-Node PNG
//     decode, SVG fill analysis, ESPN dark-variant matching). Strip after the fix settles.
const zlib = require('zlib');
const { supaGet } = require('./_supa.js');

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

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; OffTheTapeBot/1.0; +https://off-the-tape.com)' };
const BG_L = lum([10, 10, 10]);

function lum(p) {
  const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
}
const contrast = p => (Math.max(lum(p), BG_L) + 0.05) / (Math.min(lum(p), BG_L) + 0.05);

// ---- minimal PNG reader: 8-bit color types 0/2/3/4/6, non-interlaced ----
function pngPixels(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let pos = 8, w, h, depth, ctype, interlace, pal = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') pal = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error(`unsupported png depth=${depth} interlace=${interlace}`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error(`unsupported ctype ${ctype}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      if (ft === 1) line[i] = (line[i] + a) & 255;
      else if (ft === 2) line[i] = (line[i] + b) & 255;
      else if (ft === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    prev = line;
    // sample a grid, not every pixel — enough for a verdict, cheap on CPU
    const step = Math.max(1, Math.floor(w / 96));
    for (let x = 0; x < w; x += step) {
      const i = x * ch;
      let px;
      if (ctype === 6) px = [line[i], line[i + 1], line[i + 2], line[i + 3]];
      else if (ctype === 2) px = [line[i], line[i + 1], line[i + 2], 255];
      else if (ctype === 0) px = [line[i], line[i], line[i], 255];
      else if (ctype === 4) px = [line[i], line[i], line[i], line[i + 1]];
      else { const j = line[i] * 3; px = [pal[j], pal[j + 1], pal[j + 2], trns && line[i] < trns.length ? trns[line[i]] : 255]; }
      out.push(px);
    }
  }
  return out;
}

function verdictFromPixels(pixels) {
  const op = pixels.filter(p => p[3] > 40);
  if (!op.length) return 'EMPTY all-transparent';
  const vis = op.filter(p => contrast(p) >= 1.9).length / op.length;
  const white = op.filter(p => lum(p) > 0.6).length / op.length;
  const v = vis < 0.35 ? 'DARK' : vis < 0.65 ? 'DIM' : 'OK';
  return `${v} visible=${(vis * 100) | 0}% lightpx=${(white * 100) | 0}% opaque=${op.length}`;
}

function svgColors(text) {
  const cols = {};
  const re = /(?:fill|stroke|stop-color)\s*[:=]\s*["']?(#[0-9a-fA-F]{3,8}|rgb[^;"')]*|[a-zA-Z]+)/g;
  let m; while ((m = re.exec(text))) { const c = m[1].toLowerCase(); if (c !== 'none' && c !== 'inherit') cols[c] = (cols[c] || 0) + 1; }
  const parse = c => {
    if (c[0] === '#') {
      const hx = c.length < 6 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    if (c === 'black') return [0, 0, 0]; if (c === 'white') return [255, 255, 255];
    if (c.startsWith('rgb')) { const n = c.match(/[\d.]+/g); return n ? n.slice(0, 3).map(Number) : null; }
    return null;
  };
  const entries = Object.entries(cols);
  let darkUses = 0, total = 0;
  for (const [c, n] of entries) { const p = parse(c); if (p) { total += n; if (contrast([...p, 255]) < 1.9) darkUses += n; } }
  const share = total ? darkUses / total : (text.includes('fill') ? 0 : 1); // no colors at all = default black fill
  const noColor = !entries.length;
  return `${noColor ? 'DARK default-black-fill' : share > 0.6 ? 'DARK' : share > 0.25 ? 'MIXED' : 'OK'} darkshare=${(share * 100) | 0}% colors=${entries.slice(0, 8).map(([c, n]) => `${c}x${n}`).join(',') || 'none'}`;
}

async function probe(url) {
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow' });
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, ct, buf };
  } catch (e) { return { status: 0, ct: '', buf: null, err: String(e && e.message || e).slice(0, 80) }; }
}

function analyze(p, url) {
  if (p.status !== 200) return `DEAD http=${p.status} ${p.err || ''}`;
  const head = p.buf.slice(0, 400).toString('utf8').toLowerCase();
  if (p.ct.includes('svg') || head.includes('<svg')) return 'svg ' + svgColors(p.buf.toString('utf8'));
  if (p.buf.readUInt32BE && p.buf.length > 8 && p.buf.readUInt32BE(0) === 0x89504e47) {
    try { return 'png ' + verdictFromPixels(pngPixels(p.buf)); }
    catch (e) { return `png UNANALYZED (${String(e.message).slice(0, 40)}) bytes=${p.buf.length}`; }
  }
  if (head.includes('<html')) return `DEAD html-not-image http=200`;
  return `other ct=${p.ct} bytes=${p.buf.length}`;
}

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

async function pool(items, fn, n) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function serveLogo(req, res) {
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
      .replace(/<svg\b/i, '<svg color="#FFFFFF"');
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
    res.status(200).send(svg);
  } catch (e) {
    // fail as an image error, not an error page — the <img> onerror fallback chip takes over
    res.status(502).send('');
  }
}

async function audit(req, res) {
  const mode = String(req.query.mode).replace('audit-', '');
  const only = req.query && req.query.ids ? String(req.query.ids).split(',') : null;
  const lines = [];
  try {
    let teams = await supaGet('teams?select=id,name,league,logo_url&order=league,id');
    if (only) teams = teams.filter(t => only.includes(t.id));
    if (mode === 'teams') {
      const rows = await pool(teams, async t => {
        const p = await probe(t.logo_url);
        return `${t.id}\t${t.league}\t${analyze(p, t.logo_url)}`;
      }, only ? 2 : 8);
      lines.push(...rows);
    } else if (mode === 'espn') {
      for (const [lg, path] of [['ncaaw', 'womens-college-volleyball'], ['ncaam', 'mens-college-volleyball']]) {
        try {
        // no custom UA here — ESPN's API serves plain fetches but bot-walls this UA string
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/volleyball/${path}/teams?limit=500`);
        const data = await r.json();
        const list = (((data.sports || [])[0] || {}).leagues || [])[0];
        const eteams = ((list && list.teams) || []).map(x => x.team);
        const idx = {};
        for (const e of eteams) for (const k of [e.location, e.displayName, e.shortDisplayName, e.abbreviation, e.nickname]) if (k) idx[norm(k)] = idx[norm(k)] || e.id;
        const ours = teams.filter(t => t.league === lg);
        const rows = await pool(ours, async t => {
          const eid = idx[norm(t.name)] || idx[norm(t.name.replace(/ʻ/g, ''))];
          if (!eid) return `${t.id}\t${lg}\tNO-ESPN-MATCH (${t.name})`;
          const dark = await probe(`https://a.espncdn.com/i/teamlogos/ncaa/500-dark/${eid}.png`);
          const reg = dark.status === 200 ? null : await probe(`https://a.espncdn.com/i/teamlogos/ncaa/500/${eid}.png`);
          const pick = dark.status === 200 ? { u: `500-dark/${eid}.png`, p: dark } : reg && reg.status === 200 ? { u: `500/${eid}.png`, p: reg } : null;
          return `${t.id}\t${lg}\tespn=${eid}\t${pick ? pick.u + ' ' + analyze(pick.p) : 'NO-CDN-LOGO'}`;
        }, 8);
        lines.push(...rows);
        } catch (e) { lines.push(`${lg}\tLEAGUE-FAIL ${String(e && e.message || e).slice(0, 120)}`); }
      }
    } else if (mode === 'lovb') {
      const lovb = teams.filter(t => t.league === 'lovb');
      for (const t of lovb) {
        lines.push(`${t.id}\tcurrent\t${analyze(await probe(t.logo_url), t.logo_url)}`);
        for (const cand of [
          t.logo_url.replace('black', 'white'),
          t.logo_url.replace('.svg', '-white.svg'),
          t.logo_url.replace('team-', 'team-white-')
        ]) if (cand !== t.logo_url) {
          const p = await probe(cand);
          if (p.status === 200) lines.push(`${t.id}\tCANDIDATE ${cand}\t${analyze(p, cand)}`);
        }
      }
      for (const cand of [
        'https://en.wikipedia.org/wiki/Special:FilePath/Dallas_Pulse_logo.png',
        'https://en.wikipedia.org/wiki/Special:FilePath/DallasPulse.png',
        'https://en.wikipedia.org/wiki/Special:FilePath/Dallas_Pulse.png'
      ]) { const p = await probe(cand); lines.push(`pulse-cand\t${cand}\thttp=${p.status} ${p.status === 200 ? analyze(p, cand) : ''}`); }
    }
  } catch (e) { lines.push('FATAL ' + String(e && e.message || e)); }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(lines.join('\n'));
};

module.exports = async (req, res) => {
  const mode = req.query && req.query.mode;
  if (mode && String(mode).startsWith('audit-')) return audit(req, res);
  return serveLogo(req, res);
};
module.exports.config = { maxDuration: 60 };
// test hooks (harmless in production)
module.exports._test = { pngPixels, verdictFromPixels, svgColors };
