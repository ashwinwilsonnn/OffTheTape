// GET /api/cron-espn — ESPN NCAA W scoreboard poller.
// PREVIEW MODE until SUPABASE_SERVICE_ROLE_KEY is set in Vercel env.
const { supaWrite, ok, fail } = require('./_supa.js');

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard';

function dayLabel(iso) {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((d.setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / 864e5);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).toUpperCase().replace(/,\s/g, ', ');
}

module.exports = async (req, res) => {
  try {
    const r = await fetch(ESPN);
    if (!r.ok) throw new Error(`espn ${r.status}`);
    const data = await r.json();
    const events = data.events || [];
    const rows = events.map(ev => {
      const c = ev.competitions && ev.competitions[0];
      const [h, a] = (c && c.competitors) || [];
      const done = ev.status && ev.status.type && ev.status.type.completed;
      const time = new Date(ev.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
      const net = c && c.broadcasts && c.broadcasts[0] && c.broadcasts[0].names && c.broadcasts[0].names[0];
      return {
        day_label: dayLabel(ev.date), league_key: 'ncaaw', league: 'NCAA W',
        status: done ? 'FINAL' : time, network: net || null,
        a_team: null, a_name: a ? (a.team.abbreviation || a.team.shortDisplayName).toUpperCase() : 'TBA',
        a_score: done && a ? Number(a.score) : null, a_win: done && a ? (a.winner ? 1 : 0) : 0,
        b_team: null, b_name: h ? (h.team.abbreviation || h.team.shortDisplayName).toUpperCase() : 'TBA',
        b_score: done && h ? Number(h.score) : null, sets: null, source: 'espn'
      };
    });

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      return ok(res, { mode: 'preview', note: 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel env to enable writes.', would_write: rows.length, sample: rows.slice(0, 3) }, 0);
    }
    await supaWrite('matches?league_key=eq.ncaaw&source=eq.espn', 'DELETE', undefined, key);
    if (rows.length) await supaWrite('matches', 'POST', rows, key);
    await supaWrite('feed_status?feed=eq.espn_ncaaw', 'PATCH', { note: `live — last poll wrote ${rows.length} rows`, last_ok: new Date().toISOString() }, key);
    ok(res, { mode: 'live', wrote: rows.length }, 0);
  } catch (e) { fail(res, e); }
};
