const L = require('./_lib.js');
const P = require('./_poll.js');

module.exports = async (req, res) => {
  try {
    const lg = String(req.query.lg || '');
    const tab = String(req.query.tab || '');
    const [arts, matches, poll] = await Promise.all([
      L.getArticles('published'), L.getMatches(),
      lg === 'ncaaw' && tab === 'rankings' ? P.latestPoll('avca_w_2026_wk') : null
    ]);
    L.R.setCtx({ articles: arts, matches });
    const LG = L.LEAGUES[lg];
    if (!LG) { res.status(404); return L.ok(res, L.page({ title: 'Not found — OFF THE TAPE', desc: '', canonical: L.SITE, ctx: {}, arts, body: L.R.pg404() }), 0); }
    const label = tab ? `${LG.n} ${tab}` : LG.n;
    // NCAA W rankings: swap the static preseason table for the newest poll in the database.
    // pgHub returns the league kicker followed by the tab body, which opens at the first
    // .sect heading, so keep the kicker and replace everything after it.
    let body = L.R.pgHub(lg, tab);
    if (poll && poll.rows.length) {
      const at = body.indexOf('<div class="sect"');
      if (at >= 0) body = body.slice(0, at) + P.pollTable(poll, L.R.tlogo);
    }
    L.ok(res, L.page({
      title: `${label} — OFF THE TAPE`,
      // LG.sub carries a what's-hot blurb that goes stale; the division does not.
      desc: `${LG.n} volleyball on Off The Tape${L.R.DIV[lg] ? ` — ${L.R.DIV[lg].toLowerCase()}` : ''}. Scores, news, rankings and recruiting.`,
      canonical: `${L.SITE}/hub/${lg}${tab ? '/' + tab : ''}`,
      ctx: { kind: 'hub', lg, tab }, matches, arts,
      body
    }), 120);
  } catch (e) { L.fail(res, e); }
};
