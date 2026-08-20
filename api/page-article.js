const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const slug = String(req.query.slug || '');
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    L.R.setCtx({ articles: arts, matches });
    const a = arts.find(x => x.id === slug);
    if (!a) { res.status(404); return L.ok(res, L.page({ title: 'Not found — OFF THE TAPE', desc: '', canonical: L.SITE, ctx: {}, arts, body: L.R.pg404() }), 0); }
    const clean = L.stripEmoji(a.hRaw);
    L.ok(res, L.page({
      title: `${clean} — OFF THE TAPE`,
      desc: a.dekRaw || clean,
      canonical: `${L.SITE}/news/${a.id}`,
      ogImage: a.ph ? a.ph.src : null,
      jsonld: {
        '@context': 'https://schema.org', '@type': 'NewsArticle',
        headline: clean, description: a.dekRaw || '',
        datePublished: a.published_at || a.created_at, dateModified: a.published_at || a.created_at,
        author: { '@type': 'Organization', name: 'Off The Tape' },
        publisher: { '@type': 'Organization', name: 'Off The Tape' },
        mainEntityOfPage: `${L.SITE}/news/${a.id}`,
        ...(a.ph ? { image: [a.ph.src] } : {})
      },
      ctx: { kind: 'article', lg: a.lg }, matches, arts,
      body: L.R.pgArticle(a.id)
    }), 120);
  } catch (e) { L.fail(res, e); }
};
