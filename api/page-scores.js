const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    L.R.setCtx({ articles: arts, matches });
    L.ok(res, L.page({
      title: 'Volleyball Scores — OFF THE TAPE',
      desc: 'Live and recent volleyball scores across NCAA, LOVB, MLV, AVP and international play.',
      canonical: `${L.SITE}/scores`,
      ctx: { kind: 'scores' }, matches, arts,
      body: L.R.pgScores()
    }), 60);
  } catch (e) { L.fail(res, e); }
};
