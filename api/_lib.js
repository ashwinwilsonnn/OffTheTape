// OFF THE TAPE — shared server lib: Supabase reads, the page shell, and the shared chrome.
// The chrome (header, teams dropdown, slide-in panel, newsletter popup, footer) is ported
// from the approved v6-warm prototype; page bodies live in _render.js.
const DATA = require('./_data.js');
const R = require('./_render.js');
const CSS = require('./_css.js');
const CSSM = require('./_css_mobile.js');   // responsive refinements, layered after
const UI = require('./_ui.js');
const { LEAGUES, TEAMS, CONF, CONFORDER, VNL, POLLW, POLLM, STAND_LOVB, STAND_MLV, VNLW, VNLM, CLASSBOARD, COMMITWIRE } = DATA;

const SUPA_URL = process.env.SUPABASE_URL || 'https://vnxbpijpurnizvyeezza.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_7nPuBBPSepoRVRmsEkF4pg_85fVHXUZ';
const SITE = process.env.SITE_URL || 'https://off-the-tape.com';
const LAUNCHED = process.env.LAUNCHED === '1';

async function supaGet(path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
async function supaWrite(path, method, body) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('service key not configured');
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`supabase write ${r.status}: ${await r.text()}`);
  return true;
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const attr = s => esc(s).replace(/'/g, '&#39;');

// A URL that is safe to put in href/src. esc() cannot help here: it leaves `javascript:` and
// `data:` completely intact, so an attacker-supplied source link or photo URL became script the
// moment a reader clicked it. Only http(s) and same-site paths survive; everything else becomes
// empty, which renders as a dead link rather than a live one.
// Every value that reaches an href, src, cite or data-*-permalink goes through this.
const safeUrl = u => {
  const v = String(u ?? '').trim();
  if (!v) return '';
  if (/^(https?:)?\/\//i.test(v)) return v;                 // absolute, or protocol-relative
  if (/^\/(?!\/)/.test(v) || /^[.#?]/.test(v)) return v;      // same-site path, hash or query
  return '';                                                 // javascript:, data:, vbscript:, mailto:…
};

// A colour that is safe to drop into a style attribute. Covers CSS injection through lgc/team
// colours, which land inside `background:linear-gradient(...)`.
const safeColor = c => /^#[0-9a-f]{3,8}$|^(rgb|hsl)a?\([\d\s.,%/]+\)$|^[a-z]{3,20}$/i.test(String(c ?? '').trim())
  ? String(c).trim() : '';

// JSON destined for an inline <script>. JSON.stringify does not escape `/` or `<`, so a headline
// containing `</script>` closed the tag and everything after it became markup. This is on every
// page (the search index) and on every article (the JSON-LD block).
const jsonForScript = v => JSON.stringify(v)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const stripEmoji = s => String(s || '').replace(/\s*\p{Extended_Pictographic}️?\s*$/u, '');
const die = "this.classList.add('dead')";

// ---------- articles: fetch + normalise into the shape the prototype renderers expect ----------
// Plain-text fields are escaped once here, so no renderer has to remember to do it.
// The unescaped headline survives as .hRaw for <title>, meta tags and JSON-LD.
const HEAT = require('./_heat.js');

// EVERY string from the database that reaches HTML is escaped HERE, once, at the boundary.
// Renderers never re-escape and never see raw database text.
//
// This used to cover only h/dek/chip/meta/src, which meant body paragraphs, section headings,
// source names and links, photo URLs and embeds all reached the page raw. Since the desks
// assemble articles out of pages they fetch from the open web, a hostile source page was a
// path to script execution on our own origin — and the editor could not have caught it,
// because the desk card escapes body text and the live renderer did not. What the reviewer
// read as text, the reader would have run.
//
// The *Raw fields are the unescaped originals, for <title>, meta tags, JSON-LD and the
// editor's textareas — anywhere that needs the real characters rather than the display form.
function escArticle(a) {
  const E = x => esc(x ?? '');
  const arr = x => Array.isArray(x) ? x : [];
  const bodyRaw = typeof a.body === 'string' ? JSON.parse(a.body) : a.body;
  const srcRaw = arr(a.sources);
  return {
    ...a,
    hRaw: a.h || '', dekRaw: a.dek || '', chipRaw: a.chip || '',
    bodyRaw: bodyRaw || null, sectionsRaw: a.sections || null, sourcesRaw: srcRaw.length ? srcRaw : null,
    h: esc(a.h), dek: a.dek ? esc(a.dek) : '', chip: esc(a.chip || ''), m: esc(a.meta || ''),
    src: a.src ? esc(a.src) : '',
    body: arr(bodyRaw).map(E),
    sections: a.sections ? arr(a.sections).map(x => ({ ...x, h2: x.h2 ? E(x.h2) : x.h2, paras: arr(x.paras).map(E) })) : null,
    sources: srcRaw.length ? srcRaw.map(x => ({ ...x, name: E(x.name), url: safeUrl(x.url) })) : null,
    pull: a.pull ? { ...a.pull, big: E(a.pull.big), label: E(a.pull.label) } : null,
    embeds: arr(a.embeds).map(e => ({ ...e, url: safeUrl(e && e.url), context: e && e.context ? E(e.context) : (e && e.context) })),
    num: a.num == null ? a.num : E(a.num),
    sets: a.sets ? arr(a.sets).map(E) : a.sets,
    ply: a.ply ? { ...a.ply, n: E(a.ply.n), l: E(a.ply.l), t: E(a.ply.t) } : null,
    lgc: safeColor(a.lgc) || null,
    photo_link: safeUrl(a.photo_link),
    lg: a.league,
    t1: a.t1 || null, t2: a.t2 || null,
    ph: a.photo_url ? { src: safeUrl(a.photo_url), cr: esc(a.photo_credit || ''), link: safeUrl(a.photo_link) } : null
  };
}

async function getArticles(status) {
  // Postgres hands back recency; _heat.js decides the running order. rank used to win
  // absolutely, which is how a GAMEDAY preview filed at rank 100 was still leading the site
  // 29 hours later, above the recaps of the matches it had previewed. Now rank is a thumb on
  // the scale that fades with the story instead of pinning it.
  const rows = await supaGet(`articles?select=*&status=eq.${status || 'published'}&order=published_at.desc.nullslast,created_at.desc`);
  return rows.map(escArticle).sort(HEAT.byHeat);
}
// Team identity lives in one place now — see _teamkey.js for why. The board used to key a
// match on `a_team || a_name`, which gave 'tamu' for a logo-linked copy and 'ta&m' for a
// text-only one, so the same fixture survived the dedupe twice.
const TK = require('./_teamkey.js');

async function getMatches() {
  const rows = await supaGet('matches?select=*&order=id.asc');
  // Same day + same two teams = one card. The row that knows the most wins:
  // a final score beats a scheduled time, logo-linked beats text-only, feed beats hand entry.
  const key = m => R.normDay(m.day_label).dk + '|' + [TK.teamKey(m.league_key, m.a_team, m.a_name), TK.teamKey(m.league_key, m.b_team, m.b_name)].sort().join('|');
  const rich = x => (x.status === 'FINAL' ? 8 : 0) + (x.a_team ? 2 : 0) + (x.b_team ? 2 : 0) + (x.source ? 1 : 0);
  const seen = new Map();
  for (const m of rows) { const k = key(m), prev = seen.get(k); if (!prev || rich(m) > rich(prev)) seen.set(k, m); }
  return [...seen.values()].map(R.toMatch).sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

// ---------- chrome ----------
const MARK = `<svg viewBox="0 0 100 100" width="34" height="34"><g stroke="#FFFFFF" stroke-width="7" fill="none"><path d="M8 30 V8 H30"/><path d="M70 8 H92 V30"/><path d="M92 70 V92 H70"/><path d="M30 92 H8 V70"/></g><circle cx="25" cy="50" r="11" fill="#FF1F3D"/><text x="41" y="62" fill="#FFFFFF" font-family="'Roboto Slab',serif" font-weight="900" font-size="34">TT</text></svg>`;
const MARK_BIG = MARK.replace('width="34" height="34"', 'width="58" height="58"');
const NAV = [['ncaaw', 'NCAA W'], ['ncaam', 'NCAA M'], ['lovb', 'LOVB'], ['mlv', 'MLV'], ['beach', 'AVP'], ['intl', 'VNL'], ['recruit', 'RECRUITING']];

function teamRows(k) {
  if (CONFORDER[k]) return CONFORDER[k].map(cf => {
    const tm = Object.values(TEAMS).filter(t => t.lg === k && CONF[t.id] === cf);
    if (!tm.length) return '';
    return `<div class="tddc"><div class="pconf">${cf}</div>${tm.map(t => `<a class="ptm" href="/team/${attr(t.id)}"><span class="plt">${R.tlogo(t, 18)}</span>${esc(t.n)}</a>`).join('')}</div>`;
  }).join('');
  if (k === 'intl') return `<div class="tddc"><div class="pconf">NATIONAL TEAMS · 2026 FIELDS</div>${VNL.map(([n, f]) => `<a class="ptm" href="/hub/intl/teams"><span class="plt"><img src="${attr(R.FP(f))}" alt="" onerror="${die}"><span class="mfb" style="font-size:8px">${esc(n.slice(0, 2).toUpperCase())}</span></span>${esc(n)}</a>`).join('')}</div>`;
  return '';
}
function tabsFor(k) {
  const L = LEAGUES[k];
  return k === 'recruit'
    ? [['', 'HOME'], ['portal', 'COMMITS + PORTAL'], ['rankings', 'CLASS RANKINGS']]
    : [['', 'HOME'], ['scores', 'SCORES'], ['rankings', 'RANKINGS'], ['portal', String(L.portal || 'Portal').toUpperCase()]];
}
// The nav switches context server-side: league bar on hub and team pages, site bar elsewhere.
//
// .qnt vs .qng marks which of those a phone may drop. Only ONE case is real navigation: on a
// hub the bar is the tab strip — Scores, Rankings, Teams — and losing it strands the reader.
// Everywhere else it is decoration. On the home page it is the hamburger panel's own first
// level printed twice; on an article or team page it is a league's tab strip offered to
// someone who is not browsing that league, which is the same duplication wearing a different
// label. Article pages were carrying 40px of it above every story.
function header(ctx) {
  ctx = ctx || {};
  const k = ctx.lg && LEAGUES[ctx.lg] ? ctx.lg : null;
  let nav, dd = '';
  if (!k) {
    nav = NAV.map(([kk, n]) => `<a href="/hub/${kk}" data-k="${kk}">${n}</a>`).join('');
  } else {
    const L = LEAGUES[k], tab = ctx.kind === 'hub' ? (ctx.tab || '') : '';
    const rows = teamRows(k);
    nav = `<a class="qlg" href="/hub/${k}">${L.img ? `<img src="${attr(L.img)}" alt="" onerror="${die}">` : ''}${esc(L.n)}</a>\n ${tabsFor(k).map(([u, n]) => `<a class="${ctx.kind === 'hub' && tab === u ? 'on' : ''}" href="/hub/${k}${u ? '/' + u : ''}">${n}</a>`).join('')}\n ${rows ? `<button id="tddbtn" onclick="tddToggle()">TEAMS <span style="font-size:8px">▾</span></button>` : ''}`;
    if (rows) dd = `<button class="tddx" onclick="tddClose()" aria-label="close">✕</button><div class="tddw">${rows}</div>`;
  }
  return `<header>
  <div class="hb">
    <button class="burger" id="bg" aria-label="menu"><span></span><span></span><span></span></button>
    <a href="/" class="brand" aria-label="Off The Tape home"><span class="bicon">${MARK}</span><span class="bword">OFF THE <span class="tp">TAPE<i></i></span></span></a>
    <span class="hsp"></span>
    <button class="schbtn" id="sb" aria-label="search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><circle cx="10.5" cy="10.5" r="7"/><path d="M16 16 L22 22"/></svg></button>
    <div class="schwrap" id="sw"><div class="schin"><input id="si" placeholder="SEARCH TEAMS, PLAYERS, LEAGUES…" autocomplete="off"></div><div class="schres" id="sr"></div></div>
  </div>
  <nav class="qn ${k && ctx.kind === 'hub' ? 'qnt' : 'qng'}" id="qn">${nav}</nav>
  <div class="tdd" id="tdd">${dd}</div>
</header>`;
}
function pIcon(L) {
  if (!L.img) return `<span class="plt">${R.STAR}</span>`;
  return `<span class="plt"><img src="${attr(L.img)}" alt="" onerror="${die}"><span class="mfb" style="font-size:9px">${esc(L.n[0])}</span></span>`;
}
// Both panel levels ship server-rendered — every team link is crawlable, and opening the
// panel is instant because nothing has to be built in the browser.
function panel() {
  const l1 = Object.keys(LEAGUES).map((k, i) => `<button class="pit" style="animation-delay:${i * 40}ms" onclick="pL2('${k}')">${pIcon(LEAGUES[k])}${esc(LEAGUES[k].n)}<span class="ar">›</span></button>`).join('');
  const l2 = Object.keys(LEAGUES).map(k => {
    const L = LEAGUES[k];
    const opts = tabsFor(k).map(([u, n]) => [u ? '/' + u : '', n[0] + n.slice(1).toLowerCase()]);
    const rows = teamRows(k);
    return `<div class="pl2" data-k="${k}" style="display:none">
   <button class="pback" onclick="pL1()">‹ ALL LEAGUES</button>
   <div class="pl2h">${pIcon(L)}<span>${esc(L.n)}</span></div>
   <div class="psub">${opts.map(([u, n], i) => `<a class="pit" style="animation-delay:${i * 30}ms" href="/hub/${k}${u}">${esc(n)}<span class="ar">›</span></a>`).join('')}</div>
   ${rows ? `<div class="ptmlbl">TEAMS</div>${rows}` : ''}</div>`;
  }).join('');
  return `<div class="ov" id="ov"></div>
<nav class="panel" id="panel" aria-label="site">
  <div class="ph"><span class="t">OFF THE TAPE · LEAGUES</span><button class="px" id="px">✕</button></div>
  <div class="pbody"><div class="plist" id="pl1">${l1}</div><div class="plist off-r" id="pl2">${l2}</div></div>
  <div class="pfoot"><a class="nlbtn" href="/newsletter">GET OUR NEWSLETTER</a>
  <div class="row"><a href="/legal/about">ABOUT</a><a href="/legal/corrections">CONTACT</a><a href="/scores">SCORES</a></div></div>
</nav>`;
}
function nlPopup() {
  return `<div class="nlov" id="nlov"><div class="nlpop">
  <button class="nlx" id="nlx" aria-label="close">✕</button>
  <div class="nlic">${MARK_BIG}</div>
  <div class="nlh">WANT EVERY SCORE, TRADE AND RUMOR IN YOUR INBOX? 📥</div>
  <div class="nls">Sign up for the OTT AM Newsletter 🤝</div>
  <input id="nlpe" type="email" placeholder="EMAIL ADDRESS" autocomplete="off">
  <button class="nlj" id="nlj">JOIN</button><br>
  <button class="nlno" id="nlno">No thanks</button>
  <div class="nlokp" id="nlokp"></div>
  <p class="nlfine">By entering your email address you agree to receive updates from Off The Tape and you accept our <a href="/legal/terms">Terms of Use</a> and <a href="/legal/privacy">Privacy Policy</a>. We currently have no affiliate or betting partners. Unsubscribe any time via the link in every email. You must be 13 or older to subscribe.</p>
</div></div>`;
}
function footer() {
  return `<footer><div class="fb">
  <div class="fl"><a href="/legal/terms">TERMS OF USE</a><a href="/legal/privacy">PRIVACY</a><a href="/legal/about">ABOUT</a><a href="/legal/corrections">CORRECTIONS</a><a href="/newsletter">NEWSLETTER</a></div>
  <span class="fcopy">© 2026 OFF THE TAPE · OFF THE TAPE USES AI-ASSISTED PRODUCTION; EVERY ARTICLE IS REVIEWED AND APPROVED BEFORE PUBLICATION · CORRECTIONS: ASHWIN@OFF-THE-TAPE.COM</span>
</div></footer>`;
}
function searchIndex(arts) {
  return {
    a: (arts || []).slice(0, 60).map(a => ({ i: a.id, h: a.hRaw, c: a.chipRaw || '' })),
    t: Object.keys(TEAMS).map(id => ({ i: id, n: TEAMS[id].n, l: (LEAGUES[TEAMS[id].lg] || {}).n || '' }))
  };
}

// ---------- page shell ----------
function page({ title, desc, canonical, ogImage, jsonld, body, ctx, matches, arts, extraHead = '', extraJs = '', noindex = false }) {
  const robots = noindex
    ? '<meta name="robots" content="noindex,nofollow,noarchive">'
    : (LAUNCHED ? '' : '<meta name="robots" content="noindex">');
  const tick = matches && matches.length ? `<div class="tick" id="tick"><div class="tktrack" id="tkt">${R.tickerHTML(matches)}</div></div>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc || 'Off The Tape — everything volleyball. Scores, news, rankings and recruiting across NCAA, LOVB, MLV, AVP and the international game.')}">
${robots}
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20100%20100%22%20width=%22100%22%20height=%22100%22%3E%3Crect%20width=%22100%22%20height=%22100%22%20rx=%2218%22%20fill=%22%2312100E%22/%3E%3Cg%20stroke=%22%23FFFFFF%22%20stroke-width=%2210%22%20stroke-linecap=%22square%22%20fill=%22none%22%3E%3Cpath%20d=%22M12%2042%20V12%20H42%22/%3E%3Cpath%20d=%22M58%2012%20H88%20V42%22/%3E%3Cpath%20d=%22M88%2058%20V88%20H58%22/%3E%3Cpath%20d=%22M42%2088%20H12%20V58%22/%3E%3C/g%3E%3Ccircle%20cx=%2250%22%20cy=%2250%22%20r=%2217%22%20fill=%22%23FF1F3D%22/%3E%3C/svg%3E"><link rel="alternate icon" type="image/svg+xml" href="/icon.svg"><meta name="theme-color" content="#12100E">
<link rel="canonical" href="${attr(canonical || SITE)}">
<meta property="og:site_name" content="OFF THE TAPE"><meta property="og:type" content="${jsonld && jsonld['@type'] === 'NewsArticle' ? 'article' : 'website'}">
<meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc || '')}">
${ogImage ? `<meta property="og:image" content="${attr(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${attr(ogImage)}">` : '<meta name="twitter:card" content="summary">'}
<meta property="og:url" content="${attr(canonical || SITE)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@900&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
${jsonld ? `<script type="application/ld+json">${jsonForScript(jsonld)}</script>` : ''}
${extraHead}<style>${CSS}${CSSM}</style></head><body>
${header(ctx)}
${tick}
${panel()}
<main id="main">${body}</main>
${nlPopup()}
${footer()}
<script>window.OTT={idx:${jsonForScript(searchIndex(arts))}};</script>
<script>${UI}${extraJs}</script>
</body></html>`;
}
function ok(res, html, maxAge, status) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // maxAge === 0 means "never store this". The old `maxAge || 60` quietly turned 0 into 60,
  // so the desk and its drafts were being held in the shared CDN cache for a minute at a time
  // even though the handler had already set no-store. Editor surfaces depend on this being right.
  res.setHeader('Cache-Control', maxAge === 0
    ? 'no-store, no-cache, must-revalidate, private'
    : `s-maxage=${maxAge || 60}, stale-while-revalidate=300`);
  res.status(status || 200).send(html);
}
function fail(res, e) {
  // The message can carry Supabase text and internal paths. It belongs in the Vercel log,
  // not on a stranger's screen.
  console.error('[ott]', (e && e.stack) || e);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(500).send(`<!doctype html><meta charset="utf-8"><title>OFF THE TAPE</title><body style="background:#171614;color:#E7E2D8;font-family:system-ui;padding:40px"><h1 style="color:#FF1F3D">OFF THE TAPE</h1><p>Something broke on our side — try again in a minute.</p></body>`);
}

module.exports = { safeUrl, safeColor, jsonForScript, escArticle,
  DATA, LEAGUES, TEAMS, CONF, CONFORDER, VNL, POLLW, POLLM, STAND_LOVB, STAND_MLV, VNLW, VNLM, CLASSBOARD, COMMITWIRE,
  R, HEAT, supaGet, supaWrite, esc, attr, stripEmoji, die, getArticles, getMatches,
  header, panel, footer, nlPopup, page, ok, fail, SITE, LAUNCHED
};
