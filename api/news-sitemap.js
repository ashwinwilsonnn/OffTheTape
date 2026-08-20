// Google News sitemap — published articles from the last 48 hours
const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const arts = await L.getArticles('published');
    const cutoff = Date.now() - 48 * 3600 * 1000;
    const recent = arts.filter(a => a.created_at && new Date(a.created_at).getTime() > cutoff);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${recent.map(a => `<url><loc>${L.SITE}/news/${a.id}</loc><news:news><news:publication><news:name>Off The Tape</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(a.created_at).toISOString()}</news:publication_date><news:title>${L.esc(L.stripEmoji(a.h))}</news:title></news:news></url>`).join('\n')}\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=600');
    res.status(200).send(xml);
  } catch (e) { res.status(500).send('error'); }
};
