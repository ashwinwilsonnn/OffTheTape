// GET /api/ticker — matches with team info merged (name/short/logo/colors)
const { supaGet, ok, fail } = require('./_supa.js');

module.exports = async (req, res) => {
  try {
    const [matches, teams] = await Promise.all([
      supaGet('matches?select=*&order=id.asc'),
      supaGet('teams?select=id,name,short,league,logo_url,c1,c2')
    ]);
    const T = Object.fromEntries(teams.map(t => [t.id, t]));
    const rows = matches.map(m => {
      const a = m.a_team ? T[m.a_team] : null;
      const b = m.b_team ? T[m.b_team] : null;
      return {
        day: m.day_label, league_key: m.league_key, league: m.league,
        status: m.status, network: m.network, sets: m.sets,
        a: { name: a ? a.short : m.a_name, full: a ? a.name : m.a_name, logo: a ? a.logo_url : null, score: m.a_score, win: !!m.a_win },
        b: { name: b ? b.short : m.b_name, full: b ? b.name : m.b_name, logo: b ? b.logo_url : null, score: m.b_score, win: m.a_score != null && m.b_score != null && !m.a_win }
      };
    });
    ok(res, { matches: rows }, 60);
  } catch (e) { fail(res, e); }
};
