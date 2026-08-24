// THE DESK — the one place Ashwin reviews what the desks produced.
//   /approve            drafts, previewed exactly as they will publish
//   /approve?tab=data   what the Data Desk changed, feed health, the live board
//   /approve?edit=<id>  edit any article in any state, or archive it
//   /approve?rewrite=<id>  review a rewrite a desk staged against a live article
//
// Auth: the PIN is posted once and exchanged for a signed HttpOnly cookie (see _auth.js).
// It never appears in a URL, so it never reaches browser history, Vercel's request logs, or
// the Referer header that publishers receive when a source link is clicked.
//
// Publishing is a POST carrying a session-bound CSRF token. It used to be a plain GET link,
// which meant any link-preview scanner, prefetcher or mail scanner that touched the URL
// could publish an article on its own. Nothing publishes without a deliberate click.
//
// Requires env: APPROVE_PIN + SUPABASE_SERVICE_ROLE_KEY (writes).
const L = require('./_lib.js');
const A = require('./_auth.js');

const S = require('./_svc.js');
const svcGet = S.svcGet;
const articles = S.byStatus;

const shell = body => `<main class="apr">
<div class="hubhd"><h1>THE DESK</h1><div class="sub">EDITOR ONLY · NOTHING PUBLISHES WITHOUT YOU</div></div>
${body}</main>`;

function words(a) {
  const paras = a.sections ? a.sections.flatMap(s => s.paras || []) : (a.body || []);
  return paras.join(' ').split(/\s+/).filter(Boolean).length;
}
function readAs(a) {
  // The article as it actually reads: dek, then the body, with the rest folded away.
  const paras = a.sections ? a.sections.flatMap(s => (s.h2 ? ['## ' + s.h2] : []).concat(s.paras || [])) : (a.body || []);
  // Already escaped at the boundary (_lib.escArticle) — escaping again here would print the
  // entities. The bold transform runs after, exactly as the live renderer does it.
  const fmt = p => /^## /.test(p)
    ? `<h2 style="font-family:'Roboto Slab',serif;font-weight:900;font-size:15px;text-transform:uppercase;margin:16px 0 8px">${p.slice(3)}</h2>`
    : `<p>${p.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`;
  const open = paras.slice(0, 2).map(fmt).join('');
  const rest = paras.slice(2).map(fmt).join('');
  return `<div class="abody" style="max-width:none;font-size:14px">${a.dek ? `<p class="dek" style="font-size:15px">${a.dek}</p>` : ''}${open}
  ${rest ? `<details style="margin-top:6px"><summary style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mut)">READ THE REST (${paras.length - 2} MORE)</summary><div style="margin-top:10px">${rest}</div></details>` : ''}</div>`;
}
function draftCard(a, csrf) {
  const src = (a.sources || []).map(s => `<a href="${L.attr(s.url)}" target="_blank" rel="noopener noreferrer" style="display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ink2);padding:1px 0">↗ ${s.name}</a>`).join('');
  const photo = a.ph
    ? `PHOTO · ${a.ph.cr || 'linked'}${a.ph.link ? ` · <a href="${L.attr(a.ph.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--ink2);text-decoration:underline">see the post</a>` : ''}`
    : `GRAPHIC COVER · FAMILY ${L.esc(a.fam || '01')}`;
  // Anything that would embarrass us in public gets called out before the publish button.
  const flags = [];
  if (a.ph && !a.ph.link) flags.push('photo has no link back to the original post — the click-through contract needs it');
  if (a.ph && /demo/i.test(a.ph.cr || '')) flags.push('photo credit still says DEMO — rewrite it as “VIA @account · PLATFORM”');
  if (a.ph && !L.R.imgHostOK(a.ph.src)) flags.push('photo host is not in the image pipeline — it will load full-size. Add it to IMG_HOSTS and vercel.json to fix.');
  if (!a.ph && !['05', '03', '07a', '09'].includes(a.fam || '')) flags.push('no photo and a plain graphic cover — check whether a real one exists');
  if (!(a.sources || []).length) flags.push('no sources attached');
  if (!a.dek) flags.push('no dek');
  const flagbox = flags.length ? `<div class="warnbox" style="margin:10px 0 0;font-size:12px">${flags.map(f => `• ${L.esc(f)}`).join('<br>')}</div>` : '';
  return `<div class="card" style="padding:0;overflow:hidden">
  <div style="display:grid;grid-template-columns:300px 1fr;gap:0">
    <div style="min-width:0">${L.R.cov(a, false)}</div>
    <div style="padding:16px 18px;min-width:0">
      <h3 style="margin:0">${a.h}</h3>
      <div class="meta">${a.chip} · ${words(a)} WORDS · ${(a.embeds || []).length} EMBED${(a.embeds || []).length === 1 ? '' : 'S'} · ${photo}</div>
      ${flagbox}
      ${readAs(a)}
      ${src ? `<div style="margin-top:10px;border-left:3px solid var(--red);padding-left:10px">${src}</div>` : ''}
      <div class="btns" style="margin-top:14px">
        <form method="POST" action="/approve">
          <input type="hidden" name="csrf" value="${L.attr(csrf)}">
          <input type="hidden" name="id" value="${L.attr(a.id)}">
          <button class="pub" name="action" value="publish" type="submit">✓ PUBLISH</button>
          <button class="rej" name="action" value="reject" type="submit">✕ REJECT</button>
        </form>
        <a class="rej ghost" href="/approve?edit=${L.attr(a.id)}">EDIT</a>
        <a class="rej ghost" href="/news/${L.attr(a.id)}" target="_blank">PREVIEW PAGE ↗</a>
      </div>
    </div>
  </div>
</div>
<style>@media(max-width:720px){.card>div{grid-template-columns:1fr!important}}</style>`;
}

// ---------- the editor ----------
// An article is stored one of two ways: `body`, a flat array of paragraphs, or `sections`,
// an array of {h2, paras}. Both flatten to the same plain text — a blank line between
// paragraphs and "## " in front of a heading — which is the shape readAs() already renders
// on the card above. So what you edit is exactly what you have been reading.
// The textarea gets the REAL characters. Feeding it the escaped copy would show the editor
// &amp; and &lt; and then save those entities straight back into the database.
function bodyToText(a) {
  const secs = a.sectionsRaw !== undefined ? a.sectionsRaw : a.sections;
  const flat = a.bodyRaw !== undefined ? a.bodyRaw : a.body;
  const parts = secs
    ? secs.flatMap(s => (s.h2 ? ['## ' + s.h2] : []).concat(s.paras || []))
    : (flat || []);
  return parts.join('\n\n');
}
function textToBody(txt) {
  const blocks = String(txt || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  if (!blocks.some(b => /^## /.test(b))) return { body: blocks, sections: null };
  const sections = [];
  let cur = null;
  for (const b of blocks) {
    if (/^## /.test(b)) { cur = { h2: b.slice(3).trim(), paras: [] }; sections.push(cur); }
    else { if (!cur) { cur = { h2: '', paras: [] }; sections.push(cur); } cur.paras.push(b); }
  }
  // body stays populated as the flat fallback, so a renderer that ignores sections still works
  return { body: sections.flatMap(x => x.paras), sections };
}
const srcToText = a => ((a.sourcesRaw !== undefined ? a.sourcesRaw : a.sources) || []).map(x => `${x.name} | ${x.url}`).join('\n');
function textToSrc(txt) {
  return String(txt || '').split('\n').map(x => x.trim()).filter(Boolean).map(line => {
    const i = line.lastIndexOf('|');
    return i < 0 ? { name: line, url: '' } : { name: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
  }).filter(x => x.url);   // a source without a link is not a source
}

function editPage(a, csrf) {
  const opt = k => `<option value="${L.attr(k)}"${a.league === k ? ' selected' : ''}>${L.esc(L.LEAGUES[k].n)}</option>`;
  const st = String(a.status || 'draft');
  return `<div class="drow" style="margin:18px 0 4px;justify-content:space-between">
  <div class="dnav" style="margin:0"><a href="/approve">‹ BACK TO THE DESK</a></div>
  <span class="meta" style="margin:0">EDITING · ${L.esc(a.id)} · ${L.esc(st.toUpperCase())}</span>
</div>
<form class="card ed" method="POST" action="/approve" style="padding:18px 20px">
  <input type="hidden" name="csrf" value="${L.attr(csrf)}">
  <input type="hidden" name="id" value="${L.attr(a.id)}">

  <label>HEADLINE</label>
  <input name="h" value="${L.attr(a.hRaw || '')}" required>
  <div class="hint">Sentence case, not caps — the site stopped uppercasing headlines. Under about 55 characters or it wraps to two lines on a phone.</div>

  <label>DEK</label>
  <textarea name="dek" rows="3">${L.esc(a.dekRaw || '')}</textarea>

  <div class="two">
    <div>
      <label>CHIP</label>
      <input name="chip" value="${L.attr(a.chipRaw || '')}">
      <div class="hint">Reads <b>LEAGUE · KIND</b>. The KIND half sets how long this stays on the front page: GAMEDAY/PREVIEW 16h · RECAP/FINAL 30h · BREAKING/COMMIT/INJURY 48h · CHAMPIONSHIP 72h · RANKINGS 96h · ARGUMENT/ANALYSIS/PLAYER/LOOKAHEAD 110h. Anything else falls back to 36h. PREVIEW means tonight — for an event days away use LOOKAHEAD.</div>
    </div>
    <div>
      <label>LEAGUE</label>
      <select name="league">${Object.keys(L.LEAGUES).map(opt).join('')}</select>
      <label style="margin-top:14px">RANK · 0–100</label>
      <input name="rank" type="number" min="0" max="100" step="1" value="${L.attr(String(a.rank == null ? 0 : a.rank))}">
      <div class="hint">90–100 biggest story in the sport today, one a day · 70–89 biggest in its league · 40–69 would lead a quiet day · 10–39 routine · 0 filler. It decays on its own — a 100 holds the lead about 13 hours, then yields to whatever is newer.</div>
    </div>
  </div>

  <label>THE ARTICLE</label>
  <textarea name="text" rows="18">${L.esc(bodyToText(a))}</textarea>
  <div class="hint">Blank line between paragraphs. Start a line with <b>## </b> to make it a section heading. <b>**bold**</b> works inside a paragraph.</div>

  <label>SOURCES · ONE PER LINE, <b>Name | https://…</b></label>
  <textarea name="sources" rows="5">${L.esc(srcToText(a))}</textarea>
  <div class="hint">A line without a link is dropped — a source without a link is not a source.</div>

  <div class="two">
    <div><label>PHOTO URL</label><input name="photo_url" value="${L.attr(a.photo_url || '')}"></div>
    <div><label>PHOTO CREDIT</label><input name="photo_credit" value="${L.attr(a.photo_credit || '')}"></div>
  </div>
  <label>PHOTO LINK · the original post</label>
  <input name="photo_link" value="${L.attr(a.photo_link || '')}">

  <div class="btns" style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="pub" name="action" value="save" type="submit">SAVE CHANGES</button>
    <a class="rej ghost" href="/news/${L.attr(a.id)}" target="_blank">PREVIEW ↗</a>
    <a class="rej ghost" href="/approve">CANCEL</a>
  </div>
</form>
<form class="card" method="POST" action="/approve" style="padding:14px 20px;margin-top:14px;border-color:#4a2020">
  <input type="hidden" name="csrf" value="${L.attr(csrf)}">
  <input type="hidden" name="id" value="${L.attr(a.id)}">
  <div class="drow" style="justify-content:space-between">
    <span class="meta" style="margin:0">Archiving takes it off the site immediately. Nothing is destroyed — it moves to ARCHIVED at the foot of the desk and can be restored.</span>
    <button class="rej" name="action" value="archive" type="submit" style="font-family:'Roboto Slab',serif;font-weight:900;font-size:11px;padding:8px 14px;border-radius:5px;border:none;cursor:pointer;flex:none">ARCHIVE</button>
  </div>
</form>`;
}

// Desk-only chrome. It lives here rather than in _css.js so readers never download the
// stylesheet for a page they will never see.
const DESKCSS = `<style>
.apr .btns a,.apr .btns button{font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;font-size:12px;padding:9px 16px;border-radius:6px;border:none;cursor:pointer;line-height:1.25;display:inline-block}
.apr .btns form{display:flex;gap:10px;margin:0}
.apr .drow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.apr .ghost{background:transparent;border:1px solid var(--ln);color:var(--ink2)}
.apr .deskbtn{font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;font-size:10px;padding:7px 11px;border-radius:5px;border:none;cursor:pointer;line-height:1.25;display:inline-block}
.apr .ed label{display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mut);margin:16px 0 5px}
.apr .ed input,.apr .ed textarea,.apr .ed select{width:100%;background:var(--k0);border:1px solid var(--ln);color:var(--w);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;padding:10px 12px;outline:none;border-radius:5px;-webkit-appearance:none}
.apr .ed input:focus,.apr .ed textarea:focus,.apr .ed select:focus{border-color:var(--red)}
.apr .ed textarea{resize:vertical}
.apr .ed .hint{font-size:11.5px;color:var(--mut);margin-top:5px;line-height:1.55}
.apr .ed .two{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
@media(max-width:640px){.apr .ed .two{grid-template-columns:1fr}}
</style>`;

// ── STAGED REWRITES ───────────────────────────────────────────────────────────
// The morning desk refused to rewrite published prose in place, and it was right to: leaving
// new unreviewed text on a live page is publishing, whatever the row's status says. So a desk
// now writes its rewrite into articles.pending instead. Nothing public reads that column, so
// the rewrite sits invisible until Ashwin taps APPLY here. Option B survives a bulk rewrite.

const PENDING_FIELDS = ['h', 'dek', 'chip', 'sections', 'sources'];   // whitelist — see applyPending

// RAW on both sides. The live article arrives escaped from the boundary and the staged copy
// is raw JSON straight out of `pending`, so comparing the display forms would mark every
// paragraph containing an apostrophe or an ampersand as rewritten.
const prose = a => {
  if (!a) return [];
  const secs = a.sectionsRaw !== undefined ? a.sectionsRaw : a.sections;
  const flat = a.bodyRaw !== undefined ? a.bodyRaw : a.body;
  return secs
    ? secs.flatMap(s => (s.h2 ? ['## ' + s.h2] : []).concat(s.paras || []))
    : (flat || []);
};

// Paragraph-level LCS. Twelve rewrites is a lot to read twice each, so the review shows what
// actually moved rather than two walls of text side by side.
function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 40000) return b.map(s => ({ t: 'add', s })).concat(a.map(s => ({ t: 'del', s })));
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: 'same', s: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', s: a[i] }); i++; }
    else { out.push({ t: 'add', s: b[j] }); j++; }
  }
  while (i < n) out.push({ t: 'del', s: a[i++] });
  while (j < m) out.push({ t: 'add', s: b[j++] });
  return out;
}

// A field the rewrite does not mention is a field it does not touch, and the review has to say
// so. This used to render an absent key as “→ —”, which reads as “this will be wiped” — so a
// rewrite that only reworked the body appeared to be deleting the headline, the chip and every
// source. applyPending never did that (it guards on !== undefined), but nobody could tell that
// from the page, and a review you cannot trust is worse than no review.
//   undefined → untouched, listed separately, no row
//   null or '' → a deliberate clear, shown as one
const fieldRow = (label, was, now) => {
  if (now === undefined) return '';
  const w = was == null ? '' : String(was), n = now == null ? '' : String(now);
  if (w === n) return '';
  return `<tr><td style="font-weight:700;white-space:nowrap">${label}</td><td class="fpv">${L.esc(w || '—')}</td><td style="color:${n ? '#9fdd8e' : '#FFB4BE'}">${L.esc(n || '— CLEARED')}</td></tr>`;
};

function rewritePage(a, csrf) {
  const p = a.pending || {};
  const cur = f => f === 'h' ? a.hRaw : f === 'dek' ? a.dekRaw : f === 'chip' ? a.chipRaw : a[f];
  const scalars = PENDING_FIELDS.filter(f => f !== 'sections' && f !== 'sources');
  const rows = scalars.map(f => fieldRow(f.toUpperCase(), cur(f), p[f])).join('');
  // Everything the rewrite leaves alone, named out loud. Absence should be visible.
  const untouched = PENDING_FIELDS.filter(f => p[f] === undefined).map(f => f.toUpperCase());
  const diff = p.sections ? lcsDiff(prose(a), prose({ sections: p.sections })) : [];
  const moved = diff.filter(d => d.t !== 'same').length;
  const line = d => {
    const heading = /^## /.test(d.s);
    const txt = L.esc(heading ? d.s.slice(3) : d.s);
    const mark = d.t === 'add' ? '+' : d.t === 'del' ? '−' : ' ';
    const style = d.t === 'add' ? 'color:#9fdd8e;border-left:2px solid #9fdd8e'
      : d.t === 'del' ? 'color:#FFB4BE;border-left:2px solid #FFB4BE;text-decoration:line-through;opacity:.75'
        : 'color:var(--mut);border-left:2px solid var(--ln)';
    return `<p style="${style};padding:2px 0 2px 10px;margin:7px 0;font-size:13.5px;line-height:1.6${heading ? ';font-weight:900;text-transform:uppercase;font-size:12px;letter-spacing:.04em' : ''}"><span style="font-family:'JetBrains Mono',monospace;opacity:.6">${mark}</span> ${txt}</p>`;
  };
  const srcTouched = p.sources !== undefined;
  const srcWas = ((a.sourcesRaw !== undefined ? a.sourcesRaw : a.sources) || []).map(x => x.name).join(', ');
  const srcNow = (p.sources || []).map(x => x.name).join(', ');
  return `<div class="sect" style="font-size:15px">REWRITE STAGED <span class="mr">${L.esc(a.id)} · ${L.esc(String(a.status || '').toUpperCase())}</span></div>
${p.why ? `<div class="notice">${L.esc(p.why)}${p.by ? ` — ${L.esc(p.by)}` : ''}</div>` : ''}
<div class="card" style="padding:16px">
${rows || (p.sections ? '<p style="color:var(--mut);font-size:12px;margin:0">Nothing outside the body changes.</p>' : '<p style="color:var(--mut)">Nothing outside the body changed.</p>')}
${rows ? `<div class="tbwrap"><table class="tb"><tr><th>FIELD</th><th>NOW ON THE SITE</th><th>PROPOSED</th></tr>${rows}</table></div>` : ''}
${srcTouched && srcWas !== srcNow ? `<p style="font-size:12px;color:var(--mut);margin-top:12px"><b style="color:var(--ink2)">SOURCES</b> ${L.esc(srcWas || 'none')} → <span style="color:${srcNow ? '#9fdd8e' : '#FFB4BE'}">${L.esc(srcNow || 'none')}</span></p>` : ''}
${untouched.length ? `<p style="font-size:11.5px;color:var(--mut);margin-top:12px">UNTOUCHED · <b style="color:var(--ink2)">${L.esc(untouched.join(' · '))}</b> — this rewrite does not mention ${untouched.length === 1 ? 'this field, so it stays' : 'these fields, so they stay'} exactly as ${untouched.length === 1 ? 'it is' : 'they are'}.</p>` : ''}
${p.sections ? `<div style="margin-top:14px"><div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mut);margin-bottom:8px">BODY · ${moved} PARAGRAPH${moved === 1 ? '' : 'S'} MOVED · STRUCK THROUGH IS WHAT GOES</div>${diff.map(line).join('')}</div>` : ''}
<div class="drow" style="gap:10px;margin-top:18px;flex-wrap:wrap">
  <form method="POST" action="/approve" style="margin:0;display:flex;gap:10px"><input type="hidden" name="csrf" value="${L.attr(csrf)}"><input type="hidden" name="id" value="${L.attr(a.id)}">
    <button class="deskbtn pub" name="action" value="applyrw" type="submit">APPLY THE REWRITE</button>
    <button class="deskbtn rej" name="action" value="droprw" type="submit">DISCARD IT</button></form>
  <a class="deskbtn ghost" href="/approve?edit=${L.attr(a.id)}">EDIT BY HAND INSTEAD</a>
  <a class="deskbtn ghost" href="/news/${L.attr(a.id)}" target="_blank">SEE IT LIVE</a>
</div>
<p style="color:var(--mut);font-size:11.5px;margin-top:12px">Applying replaces the text on the live page. It does not touch the publish date, so the story keeps its place in the running order.</p>
</div>`;
}

const rewriteRow = a => {
  const p = a.pending || {};
  const moved = (was, now) => now !== undefined && String(now == null ? '' : now) !== String(was == null ? '' : was);
  const changed = [moved(a.hRaw, p.h) ? 'headline' : '', moved(a.dekRaw, p.dek) ? 'dek' : '',
  moved(a.chipRaw, p.chip) ? 'chip' : '', p.sections !== undefined ? 'body' : '',
  p.sources !== undefined ? 'sources' : ''].filter(Boolean).join(' · ');
  return `<div class="card" style="padding:10px 16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <span style="flex:1;min-width:200px"><span style="font-weight:700;color:var(--w);font-size:13px">${a.h}</span>
  <span style="display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.1em;color:var(--mut);margin-top:3px">${L.esc(String(a.status || '').toUpperCase())} · ${L.esc(changed || 'no change detected')}</span></span>
  <a class="deskbtn pub" href="/approve?rewrite=${L.attr(a.id)}" style="flex:none">REVIEW</a></div></div>`;
};

const P = body => L.page({
  title: 'The Desk — OTT', desc: '', canonical: L.SITE, ctx: {}, body, noindex: true,
  extraHead: DESKCSS,
  // this is a working surface, not a reader page: kill the signup popup
  extraJs: "try{localStorage.setItem('ott_nl','1')}catch(e){};var _n=document.getElementById('nlov');if(_n)_n.remove();"
});

// A short PIN with unlimited guesses is not a lock. Serverless instances are ephemeral so this
// is not a hard limit — but it turns "spray it until it opens" into something slow enough to
// notice and expensive enough to be worth doing elsewhere. Memory only; nothing is persisted.
const TRIES = new Map();
const who = req => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || 'unknown').split(',')[0].trim();
const WINDOW = 15 * 60e3, MAX = 8;
function note(req) {
  const k = who(req), now = Date.now();
  const hits = (TRIES.get(k) || []).filter(t => now - t < WINDOW);
  hits.push(now); TRIES.set(k, hits);
  if (TRIES.size > 500) for (const [k2, v] of TRIES) if (!v.some(t => now - t < WINDOW)) TRIES.delete(k2);
}
const throttled = req => (TRIES.get(who(req)) || []).filter(t => Date.now() - t < WINDOW).length >= MAX;
const clear = req => TRIES.delete(who(req));

function loginPage(res, wrong, kind) {
  const msg = kind === 'slow' ? 'Too many wrong PINs from this address. Wait fifteen minutes.'
    : kind === 'legacy' ? 'Sign-in by link has been switched off — a PIN in a URL ends up in browser history and server logs. Type it here instead; this browser will then stay signed in for 30 days.'
      : wrong ? 'Wrong PIN.' : '';
  return L.ok(res, P(shell(`<form method="POST" action="/approve" style="display:flex;gap:10px;margin-top:20px">
  <input type="password" name="pin" placeholder="PIN" autofocus autocomplete="current-password"><button type="submit">ENTER</button></form>
  ${msg ? `<div class="warnbox">${L.esc(msg)}</div>` : ''}
  <p style="color:var(--mut);font-size:11.5px;margin-top:14px;max-width:52ch">Signing in sets a 30-day cookie on this browser. The PIN is never put in a link, so it can't leak through history, logs or referrers.</p>`)), 0, kind === 'slow' ? 429 : undefined);
}
function seeOther(res, to) { res.statusCode = 303; res.setHeader('Location', to); res.setHeader('Cache-Control', 'no-store'); return res.end ? res.end() : res.send(''); }

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!process.env.APPROVE_PIN) {
      return L.ok(res, P(shell(`<div class="warnbox">Not configured yet: add an <b>APPROVE_PIN</b> environment variable in Vercel, redeploy, and this page comes alive.</div>`)), 0);
    }

    const method = String(req.method || 'GET').toUpperCase();
    const form = method === 'POST' ? A.body(req) : {};

    // --- sign in -------------------------------------------------------------
    if (method === 'POST' && form.pin !== undefined) {
      if (throttled(req)) return loginPage(res, false, 'slow');
      if (!A.pinOK(form.pin)) { note(req); return loginPage(res, true); }
      clear(req);
      A.setSession(res);
      return seeOther(res, '/approve');
    }
    // The old /approve?pin=… bookmark is gone. It was kept as a convenience after the cookie
    // landed, but it put the PIN in browser history, in Vercel's request log and in the Referer
    // header sent to every publisher whose source link got clicked from the desk — which is the
    // exact leak the cookie was introduced to close. A GET with a pin now just shows the form.
    if (method === 'GET' && req.query && req.query.pin !== undefined) return loginPage(res, false, 'legacy');
    if (method === 'POST' && form.logout) { A.clearSession(res); return seeOther(res, '/approve'); }

    if (!A.isEditor(req)) return loginPage(res, false);
    const csrf = A.csrfFor(req);

    // --- state changes: POST only, CSRF-checked ------------------------------
    if (method === 'POST') {
      if (!A.csrfOK(req, form.csrf)) return L.ok(res, P(shell('<div class="warnbox">That form was stale — reload the desk and try again.</div>')), 0);
      const id = String(form.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      const action = String(form.action || '');

      // An edit is not a republish: published_at is left alone, so fixing a typo does not
      // shove a day-old story back to the top of the site.
      if (id && action === 'save') {
        const h = String(form.h || '').trim();
        if (!h) {
          const a = await S.anyById(id);
          return L.ok(res, P(shell(`<div class="warnbox">A headline is not optional — nothing was saved.</div>` + (a ? editPage(a, csrf) : ''))), 0);
        }
        const { body, sections } = textToBody(form.text);
        const sources = textToSrc(form.sources);
        const league = L.LEAGUES[String(form.league || '')] ? String(form.league) : null;
        const patch = {
          h,
          dek: String(form.dek || '').trim() || null,
          chip: String(form.chip || '').trim(),
          rank: Math.max(0, Math.min(100, parseInt(form.rank, 10) || 0)),
          body, sections,
          sources: sources.length ? sources : null,
          photo_url: String(form.photo_url || '').trim() || null,
          photo_credit: String(form.photo_credit || '').trim() || null,
          photo_link: String(form.photo_link || '').trim() || null
        };
        if (league) patch.league = league;
        await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', patch);
        return seeOther(res, `/approve?done=save&id=${encodeURIComponent(id)}`);
      }

      // Archive is a soft delete on purpose. getArticles() only ever reads `published`, so an
      // archived story is off the site the moment this returns — but the row is still there,
      // and one click brings it back. Nothing an editor does in a hurry should be unrecoverable.
      if (id && ['archive', 'restore'].includes(action)) {
        await L.supaWrite(`articles?id=eq.${id}`, 'PATCH',
          action === 'archive' ? { status: 'archived', published_at: null } : { status: 'draft' });
        return seeOther(res, `/approve?done=${action}&id=${encodeURIComponent(id)}`);
      }

      // Applying a staged rewrite. The whitelist is the point: a desk cannot smuggle
      // status or published_at through this column, so applying is always a text change and
      // never a publish. An unpublished article stays unpublished. And a field the rewrite
      // never mentions is left exactly as it is — which is what the review page now says too.
      if (id && action === 'applyrw') {
        const a = await S.anyById(id);
        const p = (a && a.pending) || null;
        if (!p) return seeOther(res, '/approve');
        const patch = { pending: null, pending_at: null };
        for (const f of PENDING_FIELDS) if (p[f] !== undefined) patch[f] = p[f];
        if (patch.sections) patch.body = null;          // sections wins; don't leave a stale flat body
        if (patch.sources && !patch.sources.length) patch.sources = null;
        await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', patch);
        return seeOther(res, `/approve?done=applyrw&id=${encodeURIComponent(id)}`);
      }
      if (id && action === 'droprw') {
        await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', { pending: null, pending_at: null });
        return seeOther(res, `/approve?done=droprw&id=${encodeURIComponent(id)}`);
      }

      if (id && ['publish', 'reject', 'unpublish'].includes(action)) {
        const patch = action === 'publish' ? { status: 'published', published_at: new Date().toISOString() }
          : action === 'reject' ? { status: 'rejected' }
            : { status: 'draft', published_at: null };
        await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', patch);
        return seeOther(res, `/approve?done=${action}&id=${encodeURIComponent(id)}`);
      }
      return seeOther(res, '/approve');
    }

    // --- the editor ----------------------------------------------------------
    const editId = String((req.query && req.query.edit) || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (editId) {
      const a = await S.anyById(editId).catch(() => null);
      if (!a) return L.ok(res, P(shell('<div class="warnbox">No article with that id.</div>')), 0, 404);
      return L.ok(res, P(shell(editPage(a, csrf))), 0);
    }

    const rwId = String((req.query && req.query.rewrite) || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (rwId) {
      const a = await S.anyById(rwId).catch(() => null);
      if (!a) return L.ok(res, P(shell('<div class="warnbox">No article with that id.</div>')), 0, 404);
      if (!a.pending) return L.ok(res, P(shell(`<div class="warnbox">No rewrite is staged against ${L.esc(rwId)} — it may already have been applied.</div>`)), 0);
      return L.ok(res, P(shell(rewritePage(a, csrf))), 0);
    }

    const tab = String((req.query && req.query.tab) || '');
    const done = String((req.query && req.query.done) || '');
    const doneId = String((req.query && req.query.id) || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const notice = done && doneId
      ? `<div class="notice">${done === 'publish' ? `Published: ${L.esc(doneId)} — live within a minute.`
        : done === 'reject' ? `Rejected: ${L.esc(doneId)}.`
          : done === 'save' ? `Saved: ${L.esc(doneId)} — live within a minute if it was published.`
            : done === 'applyrw' ? `Rewrite applied to ${L.esc(doneId)} — the text changed, the publish date did not.`
              : done === 'droprw' ? `Rewrite discarded for ${L.esc(doneId)} — the live version is untouched.`
                : done === 'archive' ? `Archived: ${L.esc(doneId)} — off the site, kept at the foot of this page.`
                  : done === 'restore' ? `Restored: ${L.esc(doneId)} — back in drafts, not yet live.`
                    : `Unpublished: ${L.esc(doneId)} — back to drafts.`}</div>`
      : '';

    const nav = `<div class="drow" style="margin:18px 0 4px;justify-content:space-between">
  <div class="dnav" style="margin:0"><a class="${tab ? '' : 'on'}" href="/approve">DRAFTS</a><a class="${tab === 'data' ? 'on' : ''}" href="/approve?tab=data">DATA</a></div>
  <form method="POST" action="/approve" style="margin:0"><input type="hidden" name="csrf" value="${L.attr(csrf)}"><button name="logout" value="1" type="submit" style="background:transparent;border:1px solid var(--ln);color:var(--mut);font-size:10px;padding:7px 12px">SIGN OUT</button></form>
</div>`;

    if (tab === 'data') {
      const [feeds, log, matches, players] = await Promise.all([
        L.supaGet('feed_status?select=*').catch(() => []),
        svcGet('desk_log?select=*&order=run_at.desc&limit=120').catch(() => []),
        L.getMatches(),
        L.supaGet('player_stats?select=id,name,team_id,league,stat_line&order=name.asc&limit=200').catch(() => [])
      ]);
      const chg = log.filter(r => r.kind === 'change'), held = log.filter(r => r.kind === 'held');
      const other = log.filter(r => !['change', 'held'].includes(r.kind));
      const when = t => t ? new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase() : '—';
      const tbl = (head, rows) => `<div class="tbwrap"><table class="tb"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows}</table></div>`;
      const link = (url, name) => `<a href="${L.attr(L.safeUrl(url))}" target="_blank" rel="noopener noreferrer" style="color:var(--ink2);text-decoration:underline">${L.esc(name || 'source')}</a>`;
      const body = `${nav}
${held.length ? `<div class="warnbox"><b>${held.length} HELD FOR YOUR DECISION</b> — the desk would not write these on its own.</div>
${tbl(['WHAT', 'CURRENT', 'PROPOSED', 'WHY / SOURCE'], held.map(r => `<tr><td style="font-weight:700">${L.esc(r.entity || '')}</td><td class="fpv">${L.esc(r.before_val || '—')}</td><td class="fpv">${L.esc(r.after_val || '—')}</td><td class="fpv">${L.esc(r.summary || '')}${r.source_url ? ` · ${link(r.source_url, r.source_name)}` : ''}</td></tr>`).join(''))}` : ''}

<div class="sect" style="font-size:15px">WHAT CHANGED <span class="mr">${chg.length} EDIT${chg.length === 1 ? '' : 'S'} · MOST RECENT FIRST</span></div>
${chg.length ? tbl(['WHEN', 'WHAT', 'WAS', 'NOW', 'SOURCE'], chg.map(r => `<tr><td class="fpv">${when(r.run_at)}</td><td style="font-weight:700">${L.esc(r.entity || '')}</td><td class="fpv">${L.esc(r.before_val || '—')}</td><td style="color:#9fdd8e">${L.esc(r.after_val || '—')}</td><td class="fpv">${r.source_url ? link(r.source_url, r.source_name) : L.esc(r.source_name || '—')}</td></tr>`).join('')) : '<p style="color:var(--mut);margin-top:10px">Nothing written since the log started. The Data Desk stamps every edit here.</p>'}

<div class="sect" style="font-size:15px">FEED HEALTH</div>
${tbl(['FEED', 'LAST OK', 'NOTE'], (feeds || []).map(f => `<tr><td style="font-weight:700">${L.esc(f.feed || '')}</td><td class="fpv">${when(f.last_ok)}</td><td class="fpv" style="color:${/error/i.test(f.note || '') ? '#FFB4BE' : 'var(--mut)'}">${L.esc(f.note || '')}</td></tr>`).join(''))}

<div class="sect" style="font-size:15px">THE BOARD <span class="mr">${matches.length} MATCHES AFTER DEDUPE</span></div>
<div class="grid3">${matches.slice(0, 12).map(L.R.mcard).join('')}</div>

<div class="sect" style="font-size:15px">PLAYER STATS ON FILE <span class="mr">${(players || []).length} PLAYERS</span></div>
${(players || []).length ? tbl(['PLAYER', 'TEAM', 'LEAGUE', 'LINE'], players.map(p => `<tr><td style="font-weight:700">${L.esc(p.name || '')}</td><td class="fpv">${L.esc((L.TEAMS[p.team_id] || {}).n || p.team_id || '—')}</td><td class="fpv">${L.esc(p.league || '')}</td><td class="fpv">${L.esc(p.stat_line || '')}</td></tr>`).join('')) : '<p style="color:var(--mut);margin-top:10px">No player lines yet — the Data Desk builds this up run by run.</p>'}

${other.length ? `<div class="sect" style="font-size:15px">NOTES FROM THE DESKS</div><div class="rail">${other.map(r => `<a href="${r.source_url ? L.attr(L.safeUrl(r.source_url)) : '#'}" rel="noopener noreferrer"><span class="rlg"><span class="mfb" style="background:#312E2A;display:grid">${L.esc((r.kind || '?')[0].toUpperCase())}</span></span><span><span class="h">${L.esc(r.summary || r.entity || '')}</span><span class="m" style="display:block">${L.esc(r.desk || '')} · ${when(r.run_at)}</span></span></a>`).join('')}</div>` : ''}`;
      return L.ok(res, P(shell(body)), 0);
    }

    const [drafts, pub, arch, pend] = await Promise.all([
      articles('draft'), articles('published'), articles('archived').catch(() => []),
      S.withPending().catch(() => [])
    ]);
    L.R.setCtx({ articles: pub, matches: [] });
    const body = `${nav}${notice}
${pend.length ? `<div class="sect" style="font-size:15px">REWRITES WAITING <span class="mr">${pend.length} · STAGED, NOT LIVE</span></div>
<p style="color:var(--mut);font-size:11.5px;margin:-4px 0 12px;max-width:60ch">A desk has reworked these. Nobody has read the new version but you — it stays invisible until you apply it.</p>
${pend.map(rewriteRow).join('')}` : ''}
<div class="sect" style="font-size:15px">WAITING ON YOU <span class="mr">${drafts.length} DRAFT${drafts.length === 1 ? '' : 'S'}</span></div>
${drafts.length ? drafts.map(a => draftCard(a, csrf)).join('') : '<p style="color:var(--mut);margin-top:16px">Queue is clear. The Morning Desk refills it every day.</p>'}
<div class="sect" style="font-size:15px">RECENTLY PUBLISHED</div>
${pub.slice(0, 20).map(a => `<div class="card" style="padding:10px 16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><a href="/news/${L.attr(a.id)}" target="_blank" style="font-weight:700;color:var(--w);font-size:13px;flex:1;min-width:180px">${a.h}</a>
<div class="drow" style="gap:8px;flex:none"><a class="deskbtn ghost" href="/approve?edit=${L.attr(a.id)}">EDIT</a>
<form method="POST" action="/approve" style="margin:0;display:flex;gap:8px"><input type="hidden" name="csrf" value="${L.attr(csrf)}"><input type="hidden" name="id" value="${L.attr(a.id)}"><button class="deskbtn rej" name="action" value="unpublish" type="submit">UNPUBLISH</button><button class="deskbtn ghost" name="action" value="archive" type="submit">ARCHIVE</button></form></div></div></div>`).join('')}
${arch.length ? `<div class="sect" style="font-size:15px">ARCHIVED <span class="mr">${arch.length} · OFF THE SITE, NOT DELETED</span></div>
${arch.map(a => `<div class="card" style="padding:10px 16px;opacity:.72"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span style="font-weight:700;color:var(--ink2);font-size:13px;flex:1;min-width:180px">${a.h}</span>
<div class="drow" style="gap:8px;flex:none"><a class="deskbtn ghost" href="/approve?edit=${L.attr(a.id)}">EDIT</a>
<form method="POST" action="/approve" style="margin:0"><input type="hidden" name="csrf" value="${L.attr(csrf)}"><input type="hidden" name="id" value="${L.attr(a.id)}"><button class="deskbtn pub" name="action" value="restore" type="submit">RESTORE</button></form></div></div></div>`).join('')}` : ''}`;
    L.ok(res, P(shell(body)), 0);
  } catch (e) { L.fail(res, e); }
};
