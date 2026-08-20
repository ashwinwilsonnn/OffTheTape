const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const arts = await L.getArticles('published');
    const urls = [
      { loc: L.SITE + '/', pri: '1.0' },
      ...['ncaaw', 'ncaam', 'lovb', 'mlv', 'beach', 'intl', 'recruit'].flatMap(k => [
        { loc: `${L.SITE}/hub/${k}`, pri: '0.8' }, { loc: `${L.SITE}/hub/${k}/rankings`, pri: '0.7' }]),
      { loc: `${L.SITE}/scores`, pri: '0.8' },
      ...Object.keys(L.TEAMS).map(id => ({ loc: `${L.SITE}/team/${id}`, pri: '0.6' })),
      ...arts.map(a => ({ loc: `${L.SITE}/news/${a.id}`, pri: '0.9', mod: a.created_at })),
      ...['about', 'terms', 'privacy', 'corrections'].map(k => ({ loc: `${L.SITE}/legal/${k}`, pri: '0.3' }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${new Date(u.mod).toISOString()}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).send(xml);
  } catch (e) { res.status(500).send('error'); }
};
