// OFF THE TAPE — shared server lib: data, Supabase, and SSR renderers (warm grade)
const DATA = require('./_data.js');
const { LEAGUES, TEAMS, CONF, CONFORDER, POLLW, POLLM, STAND_LOVB, STAND_MLV, VNLW, VNLM, CLASSBOARD, COMMITWIRE } = DATA;

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
const stripEmoji = s => String(s || '').replace(/\s*\p{Extended_Pictographic}️?\s*$/u, '');
const die = "this.classList.add('dead')";

// ---------- articles: fetch + normalize ----------
async function getArticles(status) {
  const rows = await supaGet(`articles?select=*&status=eq.${status || 'published'}&order=created_at.desc`);
  return rows.map(a => ({ ...a,
    body: typeof a.body === 'string' ? JSON.parse(a.body) : a.body,
    lg: a.league, m: a.meta,
    t1: a.t1 || null, t2: a.t2 || null,
    ph: a.photo_url ? { src: a.photo_url, cr: a.photo_credit || '', link: a.photo_link || null } : null
  }));
}
async function getMatches() {
  const rows = await supaGet('matches?select=*&order=id.asc');
  // dedupe: prefer rows with team ids over feed rows for the same day + teams
  const key = m => m.day_label + '|' + [(m.a_team || m.a_name || '').toLowerCase().slice(0, 4), (m.b_team || m.b_name || '').toLowerCase().slice(0, 4)].sort().join('|');
  const seen = new Map();
  for (const m of rows) {
    const k = key(m); const prev = seen.get(k);
    if (!prev) { seen.set(k, m); continue; }
    const rich = (x) => (x.a_team ? 1 : 0) + (x.b_team ? 1 : 0);
    if (rich(m) > rich(prev)) seen.set(k, m);
  }
  return [...seen.values()];
}

// ---------- covers ----------
function photoCov(a, lead) {
  const t = a.t1 ? TEAMS[a.t1] : null; const c = t ? t.c1 : (a.lgc || '#201E1B');
  const img = `<img class="cvph" src="${attr(a.ph.src)}" alt="${attr(stripEmoji(a.h))}" loading="lazy" onerror="${die}">`;
  return `<div class="cv" style="background:linear-gradient(135deg,${c},#171614 170%)">${img}<div class="cvscrim"></div><div class="chip">${esc(a.chip)}</div><div class="cvcred">${esc(a.ph.cr)}</div><div class="gdbar"><div class="m">${esc(a.m)}</div></div></div>`;
}
function cov(a, lead) {
  if (a.ph) return photoCov(a, lead);
  const F = a.fam;
  if (F === '07a' && a.t1 && a.t2) { const A = TEAMS[a.t1], B = TEAMS[a.t2];
    const half = (T, x, home) => `
    <img src="${attr(T.img)}" alt="" style="position:absolute;left:${x};top:37%;transform:translate(-50%,-50%);max-height:34%;max-width:27%;object-fit:contain;z-index:3" onerror="${die}">
    <div style="position:absolute;left:${x};top:63%;transform:translateX(-50%);text-align:center;z-index:3;white-space:nowrap">
      <div style="font-family:'Roboto Slab',serif;font-weight:900;font-size:${lead ? 14 : 12}px;color:${home ? '#FFFFFF' : '#171614'};text-transform:uppercase">${esc(T.n)}</div>
      <div class="mono" style="font-size:8px;letter-spacing:.14em;color:${home ? 'rgba(255,255,255,.72)' : '#5a5a5a'};margin-top:2px">${T.rk ? 'NO. ' + T.rk + ' · ' : ''}${esc(T.rec)}</div></div>`;
    return `<div class="cv"><div style="position:absolute;inset:0;background:linear-gradient(104deg,#FFFFFF 0 49.35%,#171614 49.35% 50.65%,${B.c1} 50.65% 100%)"></div>
    <div style="position:absolute;left:0;top:0;width:46%;height:7px;background:${A.c1};z-index:2"></div>
    <div style="position:absolute;right:0;top:0;width:46%;height:7px;background:${B.c2};z-index:2"></div>
    <div class="chip">${esc(a.chip)}</div>
    <span style="position:absolute;left:75%;top:37%;transform:translate(-50%,-50%);width:${lead ? 64 : 56}px;height:${lead ? 64 : 56}px;border-radius:12px;background:${B.c2};z-index:2"></span>
    ${half(A, '25%', false)}${half(B, '75%', true)}
    <div class="vsx">VS</div><div class="gdbar"><div class="m">${esc(a.m)}</div></div></div>`;
  }
  if (F === '05') return `<div class="cv" style="background:linear-gradient(135deg,${a.lgc || '#5C1220'},#171614 170%)"><div class="bignum">${esc(a.num || '')}</div><div class="chip">${esc(a.chip)}</div><div class="mono cvmeta">${esc(a.m)}</div></div>`;
  if (F === '03' && a.sets) return `<div class="cv" style="background:#171614"><div class="chip">${esc(a.chip)}</div><div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);text-align:right">${(a.sets || []).map((s, i) => `<div style="font-family:'Roboto Slab',serif;font-weight:900;font-size:38px;line-height:.98;color:${i === a.sets.length - 1 ? '#FF1F3D' : (i % 2 ? '#5a544e' : '#F6F2EA')}">${esc(s)}</div>`).join('')}</div><div class="mono cvmeta">${esc(a.m)}</div></div>`;
  const t = a.t1 ? TEAMS[a.t1] : null; const c = t ? t.c1 : (a.lgc || '#201E1B');
  const L = LEAGUES[a.lg] || {}; const im = t ? t.img : L.img;
  return `<div class="cv" style="background:linear-gradient(135deg,${c} 0%,#171614 170%)">
  <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.22" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice"><rect x="70" y="-60" width="500" height="480" fill="none" stroke="#fff" stroke-width="3" transform="rotate(12 320 180)"/><line x1="-40" y1="200" x2="700" y2="130" stroke="#fff" stroke-width="7"/><circle cx="470" cy="96" r="24" fill="#fff"/></svg>
  <div class="chip">${esc(a.chip)}</div>
  ${im ? `<span class="cvlg"><img src="${attr(im)}" alt="" onerror="${die}"></span>` : ''}
  <div class="mono cvmeta">${esc(a.m)}</div></div>`;
}
function acard(a, cls) {
  return `<a class="acard ${cls || ''}" href="/news/${attr(a.id)}">${cov(a, cls === 'lead')}<div class="ttl">${esc(a.h)}</div><div class="mt"><b>${esc((a.chip || '').split('·')[0].trim())}</b> · ${esc(a.m)}</div></a>`;
}
function railItem(a) {
  const t = a.t1 ? TEAMS[a.t1] : null; const L = LEAGUES[a.lg] || {};
  const im = t ? t.img : L.img;
  return `<a href="/news/${attr(a.id)}"><span class="rlg">${im ? `<img src="${attr(im)}" alt="" onerror="${die}">` : ''}<span class="mfb" style="background:${t ? t.c1 : '#312E2A'}"></span></span><span><span class="h">${esc(a.h)}</span><span class="m">${esc((a.chip || '').split('·')[0].trim())} · ${esc(a.m)}</span></span></a>`;
}

// ---------- ticker ----------
function tickerHTML(matches) {
  const card = m => {
    const A = m.a_team ? TEAMS[m.a_team] : null, B = m.b_team ? TEAMS[m.b_team] : null;
    const fin = m.status === 'FINAL';
    const nm = (T, n) => T ? T.short || T.s : (n || 'TBA');
    const lg = (T) => T && T.img ? `<img src="${attr(T.img)}" alt="" onerror="${die}">` : '';
    const day = fin ? `${esc(m.day_label)} · <b>FINAL</b>` : esc(m.day_label);
    const rows = fin
      ? `<div class="tkrow"><span class="tkteam ${m.a_win ? 'w' : 'l'}">${lg(A)}${esc(nm(A, m.a_name))}</span><span class="tks ${m.a_win ? '' : 'l'}">${m.a_score ?? ''}</span></div>
         <div class="tkrow"><span class="tkteam ${m.a_win ? 'l' : 'w'}">${lg(B)}${esc(nm(B, m.b_name))}</span><span class="tks ${m.a_win ? 'l' : ''}">${m.b_score ?? ''}</span></div>`
      : `<div class="tkrow"><span class="tkteam w">${lg(A)}${esc(nm(A, m.a_name))}</span><span class="tktime"></span></div>
         <div class="tkrow"><span class="tkteam w">${lg(B)}${esc(nm(B, m.b_name))}</span><span class="tktime">${esc(m.status)}${m.network ? `<span>${esc(m.network)}</span>` : ''}</span></div>`;
    return `<div class="tkc"><div class="tkhead"><span class="tkdayl">${day}</span><span class="tklgl">${esc(m.league)}</span></div>${rows}</div>`;
  };
  const cards = matches.map(card).join('');
  return `<div class="tick" id="tick"><div class="tkt" id="tkt">${cards}${cards}</div></div>`;
}
const TICK_JS = `(function(){var tk=document.getElementById('tick'),tr=document.getElementById('tkt');if(!tk||!tr)return;
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches,auto=!rm,tmr=null,drag=false,sx=0,sl=0,moved=0;
function half(){return tr.scrollWidth/2}
(function loop(){if(auto&&!drag){tk.scrollLeft+=0.55;if(tk.scrollLeft>=half())tk.scrollLeft-=half()}requestAnimationFrame(loop)})();
function pause(){auto=false;clearTimeout(tmr);tmr=setTimeout(function(){if(!rm)auto=true},3000)}
tk.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return pause();drag=true;moved=0;sx=e.clientX;sl=tk.scrollLeft;tk.classList.add('dragging');pause()});
addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));tk.scrollLeft=sl-dx});
addEventListener('pointerup',function(){if(drag){drag=false;tk.classList.remove('dragging');pause()}});
tk.addEventListener('click',function(e){if(moved>8){e.preventDefault();e.stopPropagation();moved=0}},true);
tk.addEventListener('wheel',pause,{passive:true});tk.addEventListener('touchstart',pause,{passive:true});
tk.addEventListener('scroll',function(){if(tk.scrollLeft>=half())tk.scrollLeft-=half();else if(tk.scrollLeft<=0&&half()>0)tk.scrollLeft+=half()});})();`;

// ---------- embeds ----------
function embedsHTML(embeds) {
  if (!embeds || !embeds.length) return { html: '', scripts: '' };
  const parts = []; const scr = new Set();
  for (const e of embeds) {
    if (!e || !e.url) continue;
    if (e.platform === 'x' || /twitter\.com|x\.com/.test(e.url)) { parts.push(`<blockquote class="twitter-tweet" data-theme="dark"><a href="${attr(e.url)}"></a></blockquote>`); scr.add('<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'); }
    else if (e.platform === 'instagram' || /instagram\.com/.test(e.url)) { parts.push(`<blockquote class="instagram-media" data-instgrm-permalink="${attr(e.url)}" data-instgrm-version="14"></blockquote>`); scr.add('<script async src="https://www.instagram.com/embed.js"></script>'); }
    else if (e.platform === 'tiktok' || /tiktok\.com/.test(e.url)) { parts.push(`<blockquote class="tiktok-embed" cite="${attr(e.url)}"><a href="${attr(e.url)}"></a></blockquote>`); scr.add('<script async src="https://www.tiktok.com/embed.js"></script>'); }
    else parts.push(`<p><a href="${attr(e.url)}" target="_blank" rel="noopener">↗ ${esc(e.context || e.url)}</a></p>`);
  }
  return { html: parts.map(p => `<div class="emb">${p}</div>`).join(''), scripts: [...scr].join('') };
}

// ---------- page shell ----------
const CSS = require('./_css.js');
function page({ title, desc, canonical, ogImage, jsonld, body, extraHead = '', extraJs = '' }) {
  const robots = LAUNCHED ? '' : '<meta name="robots" content="noindex">';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc || 'Off The Tape — everything volleyball. Scores, news, rankings and recruiting across NCAA, LOVB, MLV, AVP and the international game.')}">
${robots}
<link rel="canonical" href="${attr(canonical || SITE)}">
<meta property="og:site_name" content="OFF THE TAPE"><meta property="og:type" content="${jsonld && jsonld['@type'] === 'NewsArticle' ? 'article' : 'website'}">
<meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc || '')}">
${ogImage ? `<meta property="og:image" content="${attr(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${attr(ogImage)}">` : '<meta name="twitter:card" content="summary">'}
<meta property="og:url" content="${attr(canonical || SITE)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@900&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
${extraHead}<style>${CSS}</style></head><body>
${header()}
${body}
${footer()}
<script>${TICK_JS}${extraJs}</script>
</body></html>`;
}
function header() {
  const nav = [['ncaaw', 'NCAA W'], ['ncaam', 'NCAA M'], ['lovb', 'LOVB'], ['mlv', 'MLV'], ['beach', 'AVP'], ['intl', 'VNL'], ['recruit', 'RECRUITING']];
  return `<header><div class="hwrap"><a class="bm" href="/">OFF THE <s>TAPE</s><i>.</i></a>
  <nav class="qn">${nav.map(([k, n]) => `<a href="/hub/${k}">${n}</a>`).join('')}<a href="/scores">SCORES</a></nav></div></header>`;
}
function footer() {
  return `<footer><div class="fwrap"><div class="bm">OFF THE <s>TAPE</s><i>.</i></div>
  <nav><a href="/hub/ncaaw">NCAA W</a><a href="/hub/ncaam">NCAA M</a><a href="/hub/lovb">LOVB</a><a href="/hub/mlv">MLV</a><a href="/hub/beach">AVP</a><a href="/hub/intl">INTL</a><a href="/hub/recruit">RECRUITING</a><a href="/legal/about">ABOUT</a><a href="/legal/terms">TERMS</a><a href="/legal/privacy">PRIVACY</a><a href="/legal/corrections">CORRECTIONS</a></nav>
  <p>© 2026 Off The Tape. Off The Tape uses AI-assisted production; every article is reviewed and approved before publication. Corrections: ashwin@off-the-tape.com</p></div></footer>`;
}
function newsletterStrip() {
  return `<div class="nlstrip"><div><div class="slab">THE OTT AM NEWSLETTER 📥</div><div class="nlsub">Every score, trade and rumor — four minutes, every morning of the season.</div></div>
  <form class="nlrow" method="POST" action="/api/subscribe"><input name="email" placeholder="EMAIL ADDRESS" type="email" required><button type="submit">JOIN</button></form></div>`;
}
function ok(res, html, maxAge) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', `s-maxage=${maxAge || 60}, stale-while-revalidate=300`);
  res.status(200).send(html);
}
function fail(res, e) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(500).send(`<!doctype html><meta charset="utf-8"><body style="background:#171614;color:#E7E2D8;font-family:system-ui;padding:40px"><h1 style="color:#FF1F3D">OFF THE TAPE</h1><p>Something broke on our side — try again in a minute.</p><pre style="color:#7D776C;font-size:11px">${esc(String(e && e.message || e))}</pre></body>`);
}

module.exports = { DATA, LEAGUES, TEAMS, CONF, CONFORDER, POLLW, POLLM, STAND_LOVB, STAND_MLV, VNLW, VNLM, CLASSBOARD, COMMITWIRE, supaGet, supaWrite, esc, attr, stripEmoji, die, getArticles, getMatches, cov, acard, railItem, tickerHTML, embedsHTML, page, header, footer, newsletterStrip, ok, fail, SITE, LAUNCHED };
