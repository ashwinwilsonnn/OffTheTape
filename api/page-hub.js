const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const lg = String(req.query.lg || '');
    const tab = String(req.query.tab || '');
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    L.R.setCtx({ articles: arts, matches });
    const LG = L.LEAGUES[lg];
    if (!LG) { res.status(404); return L.ok(res, L.page({ title: 'Not found — OFF THE TAPE', desc: '', canonical: L.SITE, ctx: {}, arts, body: L.R.pg404() }), 0); }
    const label = tab ? `${LG.n} ${tab}` : LG.n;
    L.ok(res, L.page({
      title: `${label} — OFF THE TAPE`,
      desc: `${LG.n} volleyball on Off The Tape — ${String(LG.sub || '').toLowerCase()}`,
      canonical: `${L.SITE}/hub/${lg}${tab ? '/' + tab : ''}`,
      ctx: { kind: 'hub', lg, tab }, matches, arts,
      body: L.R.pgHub(lg, tab)
    }), 120);
  } catch (e) { L.fail(res, e); }
};
