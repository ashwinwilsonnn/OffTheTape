// GET /api/cron-feeds — the score pipeline for every league, in one function.
// Each adapter is isolated: a failing feed reports its error and the others still write.
// Writes rows tagged with `source` so feed data never clobbers hand-entered rows.
// PREVIEW MODE (no writes) until SUPABASE_SERVICE_ROLE_KEY is set.
const { supaGet, supaWrite, ok, fail } = require('./_supa.js');
const DATA = require('./_data.js');

const WINDOW_BACK = 3, WINDOW_FWD = 21;   // days of slate we keep on the board

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const compact = d => iso(d).replace(/-/g, '');
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

// ---------- team resolution: feed names -> our team ids, so rows carry logos + team-page links ----------
const TEAMS = DATA.TEAMS || {};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');   // NFD + strip = accents fold away
const TEAM_INDEX = (() => {
  const idx = {};
  for (const id of Object.keys(TEAMS)) {
    const t = TEAMS[id], lg = t.lg || '', n = t.n || '';
    const add = s => { const k = `${lg}|${norm(s)}`; if (s && norm(s) && !idx[k]) idx[k] = id; };
    add(n);
    if (/^lovb\s/i.test(n)) add(n.replace(/^lovb\s+/i, ''));            // "LOVB Austin" -> "Austin"
    if (lg === 'mlv') { const w = n.split(/\s+/); if (w.length > 1) { add(w[0]); add(w[w.length - 1]); } }
  }
  return idx;
})();
// Feed shorthand that will never match a display name.
const ALIAS = {
  'ncaaw|tam': 'tamu', 'ncaaw|tamu': 'tamu', 'ncaaw|colo': 'col', 'ncaaw|neb': 'neb',
  'ncaam|calstatenorthridge': 'csun', 'ncaam|longbeachst': 'lbsu', 'ncaam|ucirvine': 'uci',
  'ncaam|ucsantabarbara': 'ucsb', 'ncaam|ucsandiego': 'ucsd', 'ncaam|loyolachicago': 'luc',
  'ncaam|grandcanyon': 'gcu', 'ncaam|hawaii': 'haw',
  'lovb|saltlake': 'lslc', 'lovb|sanfrancisco': 'lsf', 'lovb|signal': 'lsf',
  'mlv|sandiego': 'sd', 'mlv|mojo': 'sd', 'mlv|sandiegomojo': 'sd'
};
function resolveTeam(lg, ...cands) {
  for (const c of cands) {
    if (!c) continue;
    const k = `${lg}|${norm(c)}`;
    if (ALIAS[k]) return ALIAS[k];
    if (TEAM_INDEX[k]) return TEAM_INDEX[k];
  }
  return null;
}

// ---------- ESPN (NCAA women + men) — same shape, different sport path ----------
// The bare /scoreboard call only returns the current day. The dates=RANGE param
// is what gets us the whole forward slate.
async function espn(sportPath, league_key, league) {
  const now = Date.now();
  const range = `${compact(new Date(now - WINDOW_BACK * 864e5))}-${compact(new Date(now + WINDOW_FWD * 864e5))}`;
  const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/volleyball/${sportPath}/scoreboard?limit=400&dates=${range}`);
  if (!r.ok) throw new Error(`espn ${sportPath} ${r.status}`);
  const data = await r.json();
  const tid = t => resolveTeam(league_key, t && t.location, t && t.displayName, t && t.shortDisplayName, t && t.abbreviation);
  const mapped = (data.events || []).filter(ev => inWindow(ev.date)).map(ev => {
    const c = ev.competitions && ev.competitions[0];
    const [h, a] = (c && c.competitors) || [];
    const done = ev.status && ev.status.type && ev.status.type.completed;
    const net = c && c.broadcasts && c.broadcasts[0] && c.broadcasts[0].names && c.broadcasts[0].names[0];
    return {
      day_label: dayLabel(ev.date), league_key, league,
      status: done ? 'FINAL' : ctTime(ev.date), network: net || null,
      a_team: a ? tid(a.team) : null, a_name: a ? up(a.team.abbreviation || a.team.shortDisplayName) : 'TBA',
      a_score: done && a ? Number(a.score) : null, a_win: done && a ? (a.winner ? 1 : 0) : 0,
      b_team: h ? tid(h.team) : null, b_name: h ? up(h.team.abbreviation || h.team.shortDisplayName) : 'TBA',
      b_score: done && h ? Number(h.score) : null, sets: null
    };
  });
  // D-I runs hundreds of matches a week. The board covers the teams we cover:
  // keep anything involving a tracked team, then cap as a flood guard.
  return mapped.filter(r => r.a_team || r.b_team).slice(0, 60);
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
    const an = nameOf(g.awayTeam || g.away || g.teamB), bn = nameOf(g.homeTeam || g.home || g.teamA);
    return {
      day_label: dayLabel(when), league_key: 'lovb', league: 'LOVB',
      status: ctTime(when), network: (g.venue && (g.venue.name || g.venue)) ? String(g.venue.name || g.venue).toUpperCase().slice(0, 22) : null,
      a_team: resolveTeam('lovb', an), a_name: an || 'TBA',
      a_score: null, a_win: 0,
      b_team: resolveTeam('lovb', bn), b_name: bn || 'TBA',
      b_score: null, sets: null
    };
  });
}

// ---------- FIVB VIS — official public XML/JSON web service (VNL, Worlds, continentals) ----------
// National teams, not club sides, so there is no team id to attach.
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
// Release asset is unversioned: pvf_schedule.csv, refreshed in place each season.
function splitCsv(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}
async function mlv() {
  const r = await fetch('https://github.com/awosoga/volleydata/releases/download/pvf-schedule/pvf_schedule.csv', { redirect: 'follow' });
  if (!r.ok) throw new Error(`mlv csv ${r.status}`);
  const rows = (await r.text()).trim().split(/\r?\n/);
  const head = splitCsv(rows.shift() || '').map(s => s.trim().toLowerCase());
  const pick = (...names) => {
    for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; }
    for (const n of names) { const i = head.findIndex(h => h.indexOf(n) >= 0); if (i >= 0) return i; }
    return -1;
  };
  const ciDate = pick('date', 'game_date', 'match_date', 'start_time', 'datetime');
  const ciHome = pick('home_team', 'home_team_name', 'home');
  const ciAway = pick('away_team', 'away_team_name', 'visitor', 'away');
  const ciHw = pick('home_set_wins', 'home_sets_won', 'home_sets', 'home_score');
  const ciAw = pick('away_set_wins', 'away_sets_won', 'away_sets', 'away_score');
  // Surface the real header instead of a blind failure if the shape ever drifts.
  if (ciDate < 0 || ciHome < 0 || ciAway < 0) throw new Error(`mlv csv header: ${head.join('|').slice(0, 200)}`);
  return rows.map(splitCsv).filter(c => c[ciDate] && inWindow(c[ciDate])).map(c => {
    const hw = Number(c[ciHw]), aw = Number(c[ciAw]);
    const done = Number.isFinite(hw) && Number.isFinite(aw) && (hw + aw) > 0;
    const an = up(c[ciAway]), bn = up(c[ciHome]);
    return {
      day_label: dayLabel(c[ciDate]), league_key: 'mlv', league: 'MLV',
      status: done ? 'FINAL' : ctTime(c[ciDate]), network: null,
      a_team: resolveTeam('mlv', an), a_name: an, a_score: done ? aw : null, a_win: done && aw > hw ? 1 : 0,
      b_team: resolveTeam('mlv', bn), b_name: bn, b_score: done ? hw : null, sets: null
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
        const named = rows.filter(r => r.a_team && r.b_team).length;
        report[f.key] = { ok: true, found: rows.length, linked: named, sample: rows.slice(0, 2) };
        if (!key) { report[f.key].mode = 'preview'; continue; }
        await supaWrite(`matches?source=eq.${f.key}`, 'DELETE', undefined, key);
        if (rows.length) await supaWrite('matches', 'POST', rows, key);
        await supaWrite(`feed_status?feed=eq.${f.key}`, 'PATCH',
          { note: `live — wrote ${rows.length} rows (${named} logo-linked)`, last_ok: new Date().toISOString() }, key);
        report[f.key].wrote = rows.length;
      } catch (e) {
        report[f.key] = { ok: false, error: String(e && e.message || e) };
        if (key) await supaWrite(`feed_status?feed=eq.${f.key}`, 'PATCH', { note: `error — ${String(e && e.message || e).slice(0, 140)}` }, key).catch(() => {});
      }
    }
    // Feed keys change over time — this poller replaced one tagged 'espn'. A retired key's rows
    // would otherwise sit on the board forever as duplicates. Sweep them, but name what was
    // swept in the report so it is never silent.
    if (key && !only) {
      const KEEP = new Set(FEEDS.map(f => f.key).concat(['datadesk', 'avp_manual']));
      try {
        const rows = await supaGet('matches?select=source');
        const retired = [...new Set(rows.map(r => r.source).filter(s => s && !KEEP.has(s)))];
        for (const s of retired) await supaWrite(`matches?source=eq.${encodeURIComponent(s)}`, 'DELETE', undefined, key);
        report._sweep = retired.length ? `removed rows left by retired feed key(s): ${retired.join(', ')}` : 'no retired feed rows';
      } catch (e) { report._sweep = `sweep skipped — ${String(e && e.message || e)}`; }
    }
    ok(res, { mode: key ? 'live' : 'preview', feeds: report }, 0);
  } catch (e) { fail(res, e); }
};
