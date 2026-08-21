// /newsletter  (GET)  — the signup page
// /api/subscribe (POST) — the signup itself, from the popup, the strip and this page
const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const wantsPage = req.method !== 'POST' && !req.query.email;
    if (wantsPage) {
      const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
      L.R.setCtx({ articles: arts, matches });
      return L.ok(res, L.page({
        title: 'The OTT AM Newsletter — OFF THE TAPE',
        desc: 'Every score, trade and rumor in volleyball — four minutes, every morning of the season. Free.',
        canonical: `${L.SITE}/newsletter`,
        ctx: { kind: 'newsletter' }, matches, arts,
        body: L.R.pgNews()
      }), 300);
    }
    let email = '';
    if (req.method === 'POST') {
      email = (req.body && req.body.email) || '';
      if (!email && typeof req.body === 'string') { const m = req.body.match(/email=([^&]+)/); if (m) email = decodeURIComponent(m[1].replace(/\+/g, ' ')); }
    } else email = String(req.query.email || '');
    email = String(email).trim().toLowerCase();
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    let msg, okk = false;
    if (!valid) msg = 'That email didn’t look right — try again.';
    else {
      try { await L.supaWrite('subscribers', 'POST', { email }); msg = 'You’re on the list. First OTT AM lands on the next publishing morning.'; okk = true; }
      catch (e) { const dupe = /duplicate|23505/.test(String(e)); msg = dupe ? 'You’re already on the list — see you in the morning.' : 'Signup hiccup on our side — try again in a minute.'; okk = dupe; }
    }
    // The popup and the inline strip both read this as JSON; a bare browser hit gets a page.
    if (String(req.headers['content-type'] || '').includes('application/json') || String(req.headers.accept || '').includes('application/json')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(okk ? 200 : 400).json({ ok: okk, message: msg });
    }
    const body = `<div class="nlbox" style="text-align:center"><span class="kick"><b style="color:var(--red)">●</b> THE OTT AM NEWSLETTER</span>
    <h1>${okk ? 'YOU’RE IN 🤝' : 'HMM.'}</h1><p class="sub">${L.esc(msg)}</p>
    <p><a href="/" style="color:var(--w);text-decoration:underline">Back to the front page</a></p></div>`;
    L.ok(res, L.page({ title: 'Newsletter — OFF THE TAPE', desc: 'The OTT AM newsletter.', canonical: `${L.SITE}/newsletter`, ctx: {}, body }), 0);
  } catch (e) { L.fail(res, e); }
};
