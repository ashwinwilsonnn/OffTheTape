// /sitemap.xml  (and /news-sitemap.xml via ?n=1) — both generated from the database
const L = require('./_lib.js');

function newsXml(arts) {
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const recent = arts.filter(a => a.created_at && new Date(a.created_at).getTime() > cutoff);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${recent.map(a => `<url><loc>${L.SITE}/news/${a.id}</loc><news:news><news:publication><news:name>Off The Tape</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(a.created_at).toISOString()}</news:publication_date><news:title>${L.esc(L.stripEmoji(a.h))}</news:title></news:news></url>`).join('\n')}\n</urlset>`;
}
function fullXml(arts) {
  const urls = [
    { loc: L.SITE + '/', pri: '1.0' },
    ...['ncaaw', 'ncaam', 'lovb', 'mlv', 'beach', 'intl', 'recruit'].flatMap(k => [
      { loc: `${L.SITE}/hub/${k}`, pri: '0.8' }, { loc: `${L.SITE}/hub/${k}/rankings`, pri: '0.7' }]),
    { loc: `${L.SITE}/scores`, pri: '0.8' },
    ...Object.keys(L.TEAMS).map(id => ({ loc: `${L.SITE}/team/${id}`, pri: '0.6' })),
    ...arts.map(a => ({ loc: `${L.SITE}/news/${a.id}`, pri: '0.9', mod: a.created_at })),
    ...['about', 'terms', 'privacy', 'corrections'].map(k => ({ loc: `${L.SITE}/legal/${k}`, pri: '0.3' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${new Date(u.mod).toISOString()}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>`;
}

module.exports = async (req, res) => {
  try {
    const arts = await L.getArticles('published');
    const news = String(req.query.n || '') === '1';
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', `s-maxage=${news ? 600 : 3600}`);
    res.status(200).send(news ? newsXml(arts) : fullXml(arts));
  } catch (e) { res.status(500).send('error'); }
};
