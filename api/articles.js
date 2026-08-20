// GET /api/articles — published articles (RLS already filters to status='published')
const { supaGet, ok, fail } = require('./_supa.js');

module.exports = async (req, res) => {
  try {
    const [arts, teams] = await Promise.all([
      supaGet('articles?select=id,league,fam,t1,t2,h,meta,chip,body,dek,sections,pull,sources,embeds,photo_url,photo_credit,photo_link,src,status&status=eq.published'),
      supaGet('teams?select=id,name,short,logo_url,c1,c2')
    ]);
    const T = Object.fromEntries(teams.map(t => [t.id, t]));
    const rows = arts.map(a => ({
      id: a.id, league: a.league, fam: a.fam, h: a.h, meta: a.meta, chip: a.chip,
      body: typeof a.body === 'string' ? JSON.parse(a.body) : a.body, src: a.src,
      t1: a.t1 ? T[a.t1] || null : null, t2: a.t2 ? T[a.t2] || null : null
    }));
    ok(res, { articles: rows }, 60);
  } catch (e) { fail(res, e); }
};
