const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const id = String(req.query.id || '');
    const t = L.TEAMS[id];
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    L.R.setCtx({ articles: arts, matches });
    if (!t) { res.status(404); return L.ok(res, L.page({ title: 'Not found — OFF THE TAPE', desc: '', canonical: L.SITE, ctx: {}, arts, body: L.R.pg404() }), 0); }
    const lg = (L.LEAGUES[t.lg] || {}).n || '';
    L.ok(res, L.page({
      title: `${t.n} Volleyball — news, scores, schedule — OFF THE TAPE`,
      desc: `${t.n} volleyball on Off The Tape — every story, score and result for the ${lg} programme.`,
      canonical: `${L.SITE}/team/${id}`,
      jsonld: { '@context': 'https://schema.org', '@type': 'SportsTeam', name: t.n, sport: 'Volleyball', url: `${L.SITE}/team/${id}` },
      ctx: { kind: 'team', lg: t.lg }, matches, arts,
      body: L.R.pgTeam(id)
    }), 120);
  } catch (e) { L.fail(res, e); }
};
