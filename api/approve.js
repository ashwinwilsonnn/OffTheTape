// PIN-gated approval queue — Ashwin's one-tap publish page (Option B).
// Requires env: APPROVE_PIN (his choice) + SUPABASE_SERVICE_ROLE_KEY (writes).
const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    const pin = String(req.query.pin || '');
    const configured = process.env.APPROVE_PIN;
    if (!configured) return L.ok(res, L.page({ title: 'Approve — OTT', desc: '', canonical: L.SITE, body: `<main class="apr"><div class="hubhd"><h1>APPROVAL QUEUE</h1></div><div class="warnbox">Not configured yet: add an <b>APPROVE_PIN</b> environment variable in Vercel (any PIN you choose), redeploy, and this page comes alive.</div></main>` }), 0);
    if (pin !== configured) {
      return L.ok(res, L.page({ title: 'Approve — OTT', desc: '', canonical: L.SITE, body: `<main class="apr"><div class="hubhd"><h1>APPROVAL QUEUE</h1><div class="sub">EDITOR ACCESS</div></div>
<form method="GET" action="/approve" style="display:flex;gap:10px;margin-top:20px"><input type="password" name="pin" placeholder="PIN" autofocus><button type="submit">ENTER</button></form>${pin ? '<div class="warnbox">Wrong PIN.</div>' : ''}</main>` }), 0);
    }
    const action = String(req.query.action || '');
    const id = String(req.query.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    let notice = '';
    if (action && id) {
      if (action === 'publish') { await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', { status: 'published' }); notice = `<div class="notice">Published: ${L.esc(id)} — live within a minute.</div>`; }
      else if (action === 'reject') { await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', { status: 'rejected' }); notice = `<div class="notice">Rejected: ${L.esc(id)}.</div>`; }
      else if (action === 'unpublish') { await L.supaWrite(`articles?id=eq.${id}`, 'PATCH', { status: 'draft' }); notice = `<div class="notice">Unpublished: ${L.esc(id)} — back to drafts.</div>`; }
    }
    const drafts = await L.supaGet('articles?select=id,h,dek,chip,photo_url,photo_credit,created_at&status=eq.draft&order=created_at.desc');
    const pub = await L.supaGet('articles?select=id,h,created_at&status=eq.published&order=created_at.desc&limit=10');
    const u = (a, act) => `/approve?pin=${encodeURIComponent(pin)}&action=${act}&id=${encodeURIComponent(a.id)}`;
    const body = `<main class="apr">
<div class="hubhd"><h1>APPROVAL QUEUE</h1><div class="sub">${drafts.length} DRAFT${drafts.length === 1 ? '' : 'S'} WAITING · NOTHING PUBLISHES WITHOUT YOU</div></div>
${notice}
${drafts.length ? drafts.map(a => `<div class="card"><h3>${L.esc(a.h)}</h3><div class="meta">${L.esc(a.chip || '')} · ${a.photo_url ? 'PHOTO: ' + L.esc(a.photo_credit || 'linked') : 'GRAPHIC COVER'}</div>${a.dek ? `<div class="dk">${L.esc(a.dek)}</div>` : ''}<div class="btns"><a class="pub" href="${u(a, 'publish')}">✓ PUBLISH</a><a class="rej" href="${u(a, 'reject')}">✕ REJECT</a></div></div>`).join('') : '<p style="color:var(--mut);margin-top:20px">Queue is clear. The Morning Desk refills it daily.</p>'}
<div class="sect" style="font-size:14px">RECENTLY PUBLISHED</div>
${pub.map(a => `<div class="card" style="padding:10px 16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="font-weight:700;color:var(--w);font-size:13px">${L.esc(a.h)}</span><a class="rej" style="font-size:10px;padding:6px 10px;border-radius:5px;font-family:'Roboto Slab',serif;font-weight:900" href="${u(a, 'unpublish')}">UNPUBLISH</a></div></div>`).join('')}
</main>`;
    L.ok(res, L.page({ title: 'Approval Queue — OFF THE TAPE', desc: '', canonical: `${L.SITE}/approve`, body }), 0);
  } catch (e) { L.fail(res, e); }
};
