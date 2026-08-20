const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
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
      catch (e) { msg = /duplicate|23505/.test(String(e)) ? 'You’re already on the list — see you in the morning.' : 'Signup hiccup on our side — try again in a minute.'; okk = /duplicate|23505/.test(String(e)); }
    }
    const body = `<main><div class="legal" style="text-align:center;padding-top:40px"><span class="kick"><b style="color:var(--red)">●</b> THE OTT AM NEWSLETTER</span><h1>${okk ? 'YOU’RE IN 🤝' : 'HMM.'}</h1><p style="margin-top:10px">${L.esc(msg)}</p><p style="margin-top:20px"><a href="/" style="color:var(--w);text-decoration:underline">Back to the front page</a></p></div></main>`;
    L.ok(res, L.page({ title: 'Newsletter — OFF THE TAPE', desc: 'The OTT AM newsletter.', canonical: `${L.SITE}/newsletter`, body }), 0);
  } catch (e) { L.fail(res, e); }
};
