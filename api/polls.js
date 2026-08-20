// GET /api/polls — both AVCA polls grouped, team info merged
const { supaGet, ok, fail } = require('./_supa.js');

module.exports = async (req, res) => {
  try {
    const [polls, teams] = await Promise.all([
      supaGet('polls?select=poll,rank,team_id,points,firsts,record&order=rank.asc'),
      supaGet('teams?select=id,name,short,logo_url,c1,c2,rec')
    ]);
    const T = Object.fromEntries(teams.map(t => [t.id, t]));
    const grouped = {};
    for (const p of polls) {
      (grouped[p.poll] = grouped[p.poll] || []).push({
        rank: p.rank, points: p.points, firsts: p.firsts, record: p.record,
        team: T[p.team_id] || { id: p.team_id, name: p.team_id }
      });
    }
    ok(res, { polls: grouped }, 300);
  } catch (e) { fail(res, e); }
};
