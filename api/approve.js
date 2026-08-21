// THE DESK — the one place Ashwin reviews what the desks produced.
//   /approve            drafts, previewed exactly as they will publish
//   /approve?tab=data   what the Data Desk changed, feed health, the live board
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
  const fmt = p => /^## /.test(p)
    ? `<h2 style="font-family:'Roboto Slab',serif;font-weight:900;font-size:15px;text-transform:uppercase;margin:16px 0 8px">${L.esc(p.slice(3))}</h2>`
    : `<p>${L.esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`;
  const open = paras.slice(0, 2).map(fmt).join('');
  const rest = paras.slice(2).map(fmt).join('');
  return `<div class="abody" style="max-width:none;font-size:14px">${a.dek ? `<p class="dek" style="font-size:15px">${a.dek}</p>` : ''}${open}
  ${rest ? `<details style="margin-top:6px"><summary style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mut)">READ THE REST (${paras.length - 2} MORE)</summary><div style="margin-top:10px">${rest}</div></details>` : ''}</div>`;
}
function draftCard(a, csrf) {
  const src = (a.sources || []).map(s => `<a href="${L.attr(s.url)}" target="_blank" rel="noopener noreferrer" style="display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ink2);padding:1px 0">↗ ${L.esc(s.name)}</a>`).join('');
  const photo = a.ph
    ? `PHOTO · ${L.esc(a.ph.cr || 'linked')}${a.ph.link ? ` · <a href="${L.attr(a.ph.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--ink2);text-decoration:underline">see the post</a>` : ''}`
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
        <a class="rej ghost" href="/news/${L.attr(a.id)}" target="_blank">PREVIEW PAGE ↗</a>
      </div>
    </div>
  </div>
</div>
<style>@media(max-width:720px){.card>div{grid-template-columns:1fr!important}}</style>`;
}

// Desk-only chrome. It lives here rather than in _css.js so readers never download the
// stylesheet for a page they will never see.
const DESKCSS = `<style>
.apr .btns a,.apr .btns button{font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;font-size:12px;padding:9px 16px;border-radius:6px;border:none;cursor:pointer;line-height:1.25;display:inline-block}
.apr .btns form{display:flex;gap:10px;margin:0}
.apr .drow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.apr .ghost{background:transparent;border:1px solid var(--ln);color:var(--ink2)}
</style>`;

const P = body => L.page({
  title: 'The Desk — OTT', desc: '', canonical: L.SITE, ctx: {}, body, noindex: true,
  extraHead: DESKCSS,
  // this is a working surface, not a reader page: kill the signup popup
  extraJs: "try{localStorage.setItem('ott_nl','1')}catch(e){};var _n=document.getElementById('nlov');if(_n)_n.remove();"
});

function loginPage(res, wrong) {
  return L.ok(res, P(shell(`<form method="POST" action="/approve" style="display:flex;gap:10px;margin-top:20px">
  <input type="password" name="pin" placeholder="PIN" autofocus autocomplete="current-password"><button type="submit">ENTER</button></form>
  ${wrong ? '<div class="warnbox">Wrong PIN.</div>' : ''}
  <p style="color:var(--mut);font-size:11.5px;margin-top:14px;max-width:52ch">Signing in sets a 30-day cookie on this browser. The PIN is never put in a link, so it can't leak through history, logs or referrers.</p>`)), 0);
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
      if (!A.pinOK(form.pin)) return loginPage(res, true);
      A.setSession(res);
      return seeOther(res, '/approve');
    }
    // Legacy bookmark: /approve?pin=… still works once — it converts to a cookie and
    // bounces to a clean URL so the secret stops travelling.
    if (method === 'GET' && req.query && req.query.pin !== undefined) {
      if (!A.pinOK(req.query.pin)) return loginPage(res, true);
      A.setSession(res);
      return seeOther(res, '/approve');
    }
    if (method === 'POST' && form.logout) { A.clearSession(res); return seeOther(res, '/approve'); }

    if (!A.isEditor(req)) return loginPage(res, false);
    const csrf = A.csrfFor(req);

    // --- state changes: POST only, CSRF-checked ------------------------------
    if (method === 'POST') {
      if (!A.csrfOK(req, form.csrf)) return L.ok(res, P(shell('<div class="warnbox">That form was stale — reload the desk and try again.</div>')), 0);
      const id = String(form.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      const action = String(form.action || '');
      if (id && ['publish', 'reject', 'unpublish'].includes(action)) {
        const patch = action === 'publish' ? { status: 'published', published_at: new Date().toISOString() }
          : action === 'reject' ? { status: 'rejected' }
            : { status: 'draft', published_at: null };
        await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', patch);
        return seeOther(res, `/approve?done=${action}&id=${encodeURIComponent(id)}`);
      }
      return seeOther(res, '/approve');
    }

    const tab = String((req.query && req.query.tab) || '');
    const done = String((req.query && req.query.done) || '');
    const doneId = String((req.query && req.query.id) || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const notice = done && doneId
      ? `<div class="notice">${done === 'publish' ? `Published: ${L.esc(doneId)} — live within a minute.`
        : done === 'reject' ? `Rejected: ${L.esc(doneId)}.`
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
      const link = (url, name) => `<a href="${L.attr(url)}" target="_blank" rel="noopener noreferrer" style="color:var(--ink2);text-decoration:underline">${L.esc(name || 'source')}</a>`;
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

${other.length ? `<div class="sect" style="font-size:15px">NOTES FROM THE DESKS</div><div class="rail">${other.map(r => `<a href="${r.source_url ? L.attr(r.source_url) : '#'}" rel="noopener noreferrer"><span class="rlg"><span class="mfb" style="background:#312E2A;display:grid">${L.esc((r.kind || '?')[0].toUpperCase())}</span></span><span><span class="h">${L.esc(r.summary || r.entity || '')}</span><span class="m" style="display:block">${L.esc(r.desk || '')} · ${when(r.run_at)}</span></span></a>`).join('')}</div>` : ''}`;
      return L.ok(res, P(shell(body)), 0);
    }

    const [drafts, pub] = await Promise.all([articles('draft'), articles('published')]);
    L.R.setCtx({ articles: pub, matches: [] });
    const body = `${nav}${notice}
<div class="sect" style="font-size:15px">WAITING ON YOU <span class="mr">${drafts.length} DRAFT${drafts.length === 1 ? '' : 'S'}</span></div>
${drafts.length ? drafts.map(a => draftCard(a, csrf)).join('') : '<p style="color:var(--mut);margin-top:16px">Queue is clear. The Morning Desk refills it every day.</p>'}
<div class="sect" style="font-size:15px">RECENTLY PUBLISHED</div>
${pub.slice(0, 12).map(a => `<div class="card" style="padding:10px 16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><a href="/news/${L.attr(a.id)}" target="_blank" style="font-weight:700;color:var(--w);font-size:13px">${a.h}</a>
<form method="POST" action="/approve" style="margin:0;flex:none"><input type="hidden" name="csrf" value="${L.attr(csrf)}"><input type="hidden" name="id" value="${L.attr(a.id)}"><button class="rej" name="action" value="unpublish" type="submit" style="font-size:10px;padding:6px 10px;border-radius:5px;font-family:'Roboto Slab',serif;font-weight:900;border:none;cursor:pointer">UNPUBLISH</button></form></div></div>`).join('')}`;
    L.ok(res, P(shell(body)), 0);
  } catch (e) { L.fail(res, e); }
};
