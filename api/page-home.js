const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    L.R.setCtx({ articles: arts, matches });
    const lead = arts[0];
    L.ok(res, L.page({
      title: 'OFF THE TAPE — Volleyball. All of it.',
      desc: 'Scores, news, rankings and recruiting across NCAA volleyball, LOVB, MLV, the AVP and the international game — updated daily.',
      canonical: L.SITE + '/',
      ogImage: lead && lead.ph ? lead.ph.src : null,
      jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Off The Tape', url: L.SITE },
      ctx: { kind: 'home' }, matches, arts,
      body: L.R.pgHome()
    }), 60);
  } catch (e) { L.fail(res, e); }
};
