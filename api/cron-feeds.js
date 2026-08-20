// GET /api/cron-feeds — the score pipeline for every league, in one function.
// Each adapter is isolated: a failing feed reports its error and the others still write.
// Writes rows tagged with `source` so feed data never clobbers hand-entered rows.
// PREVIEW MODE (no writes) until SUPABASE_SERVICE_ROLE_KEY is set.
const { supaWrite, ok, fail } = require('./_supa.js');

const WINDOW_BACK = 3, WINDOW_FWD = 21;   // days of slate we keep on the board

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
function dayLabel(isoDate) {
  const d = new Date(isoDate), now = new Date();
  const diff = Math.floor((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  return new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).toUpperCase().replace(/,\s/g, ', ');
}
const ctTime = isoDate => new Date(isoDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
function inWindow(isoDate) {
  const t = new Date(isoDate).getTime();
  if (!t) return false;
  const now = Date.now();
  return t > now - WINDOW_BACK * 864e5 && t < now + WINDOW_FWD * 864e5;
}
const up = s => String(s || '').toUpperCase();

// ---------- ESPN (NCAA women + men) — same shape, different sport path ----------
async function espn(sportPath, league_key, league) {
  const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/volleyball/${sportPath}/scoreboard`);
  if (!r.ok) throw new Error(`espn ${sportPath} ${r.status}`);
  const data = await r.json();
  return (data.events || []).filter(ev => inWindow(ev.date)).map(ev => {
    const c = ev.competitions && ev.competitions[0];
    const [h, a] = (c && c.competitors) || [];
    const done = ev.status && ev.status.type && ev.status.type.completed;
    const net = c && c.broadcasts && c.broadcasts[0] && c.broadcasts[0].names && c.broadcasts[0].names[0];
    return {
      day_label: dayLabel(ev.date), league_key, league,
      status: done ? 'FINAL' : ctTime(ev.date), network: net || null,
      a_team: null, a_name: a ? up(a.team.abbreviation || a.team.shortDisplayName) : 'TBA',
      a_score: done && a ? Number(a.score) : null, a_win: done && a ? (a.winner ? 1 : 0) : 0,
      b_team: null, b_name: h ? up(h.team.abbreviation || h.team.shortDisplayName) : 'TBA',
      b_score: done && h ? Number(h.score) : null, sets: null
    };
  });
}

// ---------- LOVB — first-party Payload CMS JSON (schedule; scores arrive via Data Desk) ----------
async function lovb() {
  const r = await fetch('https://www.lovb.com/api/games?limit=200&sort=gameDate');
  if (!r.ok) throw new Error(`lovb ${r.status}`);
  const data = await r.json();
  const docs = data.docs || data.items || [];
  const nameOf = t => up(typeof t === 'string' ? t : (t && (t.shortName || t.name || t.title || t.slug)) || '');
  return docs.filter(g => inWindow(g.gameDate || g.date)).map(g => {
    const when = g.gameDate || g.date;
    return {
      day_label: dayLabel(when), league_key: 'lovb', league: 'LOVB',
      status: ctTime(when), network: (g.venue && (g.venue.name || g.venue)) ? String(g.venue.name || g.venue).toUpperCase().slice(0, 22) : null,
      a_team: null, a_name: nameOf(g.awayTeam || g.away || g.teamB) || 'TBA',
      a_score: null, a_win: 0,
      b_team: null, b_name: nameOf(g.homeTeam || g.home || g.teamA) || 'TBA',
      b_score: null, sets: null
    };
  });
}

// ---------- FIVB VIS — official public XML/JSON web service (VNL, Worlds, continentals) ----------
async function fivb() {
  const now = new Date();
  const first = iso(new Date(now.getTime() - WINDOW_BACK * 864e5));
  const last = iso(new Date(now.getTime() + WINDOW_FWD * 864e5));
  const xml = `<Request Type="GetVolleyMatchList" Fields="MatchDateTimeUTC TeamAName TeamBName MatchResultText Status NoTournament"><Filter FirstDate="${first}" LastDate="${last}"/></Request>`;
  const r = await fetch(`https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=${encodeURIComponent(xml)}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`fivb ${r.status}`);
  const text = await r.text();
  let matches = [];
  try {
    const j = JSON.parse(text);
    matches = j.VolleyMatch || j.Match || (j.VolleyMatches && j.VolleyMatches.VolleyMatch) || [];
    if (!Array.isArray(matches)) matches = [matches];
  } catch (_) {
    // XML fallback: pull attributes off each <VolleyMatch .../> element
    matches = (text.match(/<VolleyMatch\b[^>]*\/?>/g) || []).map(tag => {
      const at = n => { const m = tag.match(new RegExp(`${n}="([^"]*)"`)); return m ? m[1] : ''; };
      return { MatchDateTimeUTC: at('MatchDateTimeUTC'), TeamAName: at('TeamAName'), TeamBName: at('TeamBName'), MatchResultText: at('MatchResultText'), Status: at('Status') };
    });
  }
  return matches.filter(m => m.TeamAName && m.MatchDateTimeUTC && inWindow(m.MatchDateTimeUTC)).map(m => {
    const res = String(m.MatchResultText || '').trim();          // e.g. "3-1"
    const parts = res.match(/^(\d)\s*-\s*(\d)$/);
    const done = !!parts;
    return {
      day_label: dayLabel(m.MatchDateTimeUTC), league_key: 'intl', league: 'FIVB',
      status: done ? 'FINAL' : ctTime(m.MatchDateTimeUTC), network: null,
      a_team: null, a_name: up(m.TeamAName), a_score: done ? Number(parts[1]) : null,
      a_win: done && Number(parts[1]) > Number(parts[2]) ? 1 : 0,
      b_team: null, b_name: up(m.TeamBName), b_score: done ? Number(parts[2]) : null, sets: null
    };
  });
}

// ---------- MLV — community volleydata CSV (MIT). Season runs Jan–May. ----------
async function mlv() {
  const year = new Date().getUTCFullYear();
  const r = await fetch(`https://github.com/awosoga/volleydata/releases/download/pvf-schedule/pvf_schedule_${year}.csv`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`mlv csv ${r.status}`);
  const rows = (await r.text()).trim().split(/\r?\n/);
  const head = rows.shift().split(',').map(s => s.trim().toLowerCase());
  const col = n => head.indexOf(n);
  const [ciDate, ciHome, ciAway, ciHw, ciAw] = [col('date'), col('home_team'), col('away_team'), col('home_set_wins'), col('away_set_wins')];
  if (ciDate < 0 || ciHome < 0) throw new Error('mlv csv shape changed');
  return rows.map(line => line.split(',')).filter(c => c[ciDate] && inWindow(c[ciDate])).map(c => {
    const hw = Number(c[ciHw]), aw = Number(c[ciAw]);
    const done = Number.isFinite(hw) && Number.isFinite(aw) && (hw + aw) > 0;
    return {
      day_label: dayLabel(c[ciDate]), league_key: 'mlv', league: 'MLV',
      status: done ? 'FINAL' : ctTime(c[ciDate]), network: null,
      a_team: null, a_name: up(c[ciAway]), a_score: done ? aw : null, a_win: done && aw > hw ? 1 : 0,
      b_team: null, b_name: up(c[ciHome]), b_score: done ? hw : null, sets: null
    };
  });
}

// AVP: ~12 events a year, no machine-readable results feed (see feed-sources doc).
// Handled by the Data Desk on event weekends rather than guessed at here.

const FEEDS = [
  { key: 'espn_ncaaw', run: () => espn('womens-college-volleyball', 'ncaaw', 'NCAA W') },
  { key: 'espn_ncaam', run: () => espn('mens-college-volleyball', 'ncaam', 'NCAA M') },
  { key: 'lovb_api', run: lovb },
  { key: 'fivb_vis', run: fivb },
  { key: 'mlv_volleydata', run: mlv }
];

module.exports = async (req, res) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const only = String((req.query && req.query.feed) || '');
  const report = {};
  try {
    for (const f of FEEDS) {
      if (only && only !== f.key) continue;
      try {
        const rows = (await f.run()).map(r => ({ ...r, source: f.key }));
        report[f.key] = { ok: true, found: rows.length, sample: rows.slice(0, 2) };
        if (!key) { report[f.key].mode = 'preview'; continue; }
        await supaWrite(`matches?source=eq.${f.key}`, 'DELETE', undefined, key);
        if (rows.length) await supaWrite('matches', 'POST', rows, key);
        await supaWrite(`feed_status?feed=eq.${f.key}`, 'PATCH',
          { note: `live — wrote ${rows.length} rows`, last_ok: new Date().toISOString() }, key);
        report[f.key].wrote = rows.length;
      } catch (e) {
        report[f.key] = { ok: false, error: String(e && e.message || e) };
        if (key) await supaWrite(`feed_status?feed=eq.${f.key}`, 'PATCH', { note: `error — ${String(e && e.message || e).slice(0, 140)}` }, key).catch(() => {});
      }
    }
    ok(res, { mode: key ? 'live' : 'preview', feeds: report }, 0);
  } catch (e) { fail(res, e); }
};
