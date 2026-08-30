// GET /api/cron-feeds — the score pipeline for every league, in one function.
// Each adapter is isolated: a failing feed reports its error and the others still write.
// Writes rows tagged with `source` so feed data never clobbers hand-entered rows.
// PREVIEW MODE (no writes) unless the caller is authorised AND SUPABASE_SERVICE_ROLE_KEY is set.
const { supaGet, supaWrite, ok, fail } = require('./_supa.js');
const DATA = require('./_data.js');
// The poller now writes the same fixture token the board reads, so it can UPSERT rather than
// wipe and rewrite. Both sides must compute it identically or nothing lines up — which is the
// entire reason _teamkey.js exists. normDay() comes from the renderer for the same reason.
const TK = require('./_teamkey.js');
const { normDay } = require('./_render.js');

const WINDOW_BACK = 3, WINDOW_FWD = 21;   // days of slate we keep on the board

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const compact = d => iso(d).replace(/-/g, '');
function dayLabel(isoDate) {
  // Compare CALENDAR DAYS IN CENTRAL TIME on both sides. The old version diffed days in the
  // server's clock (UTC) but printed the weekday in Chicago, so a 7:30 PM CT match crossed
  // UTC midnight and the same evening's slate split between 'TOMORROW' and 'FRI, AUG 28'.
  const day = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const diff = Math.round((new Date(day(isoDate)) - new Date(day(Date.now()))) / 864e5);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  return new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).toUpperCase().replace(/,\s/g, ', ');
}
const ctTime = isoDate => new Date(isoDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
// Scheduled-time guard: ESPN marks a TBD start with timeValid:false and a midnight
// placeholder timestamp. "12:00 AM CT" on the board is that placeholder leaking through,
// never a real first serve — show TBD instead. Applied to every feed's scheduled rows.
const schedTime = (isoDate, timeValid) => {
  const t = ctTime(isoDate);
  return timeValid === false || t === '12:00 AM CT' ? 'TBD' : t;
};
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
    const st = (ev.status && ev.status.type) || {};
    const done = !!st.completed;
    // 'pre' | 'in' | 'post'. This is the field the board's LIVE state has always wanted and
    // never received — no adapter set `live`, so the red dot and the live-first ordering were
    // dead code for every feed row on the site.
    const live = st.state === 'in';
    const net = c && c.broadcasts && c.broadcasts[0] && c.broadcasts[0].names && c.broadcasts[0].names[0];
    // Per-set scores, which ESPN has had all along under competitor.linescores. `a` is the
    // away side, matching how the row is written below, so the pairs read away-home.
    const ln = x => ((x && x.linescores) || []).map(v => v && v.value);
    const la = ln(a), lb = ln(h);
    const n = Math.min(la.length, lb.length);
    const sets = n ? Array.from({ length: n }, (_, i) => `${la[i]}-${lb[i]}`) : null;
    // A score exists the moment a match starts, not only when it ends.
    const scored = done || live;
    const day_label = dayLabel(ev.date);
    const a_team = a ? tid(a.team) : null, b_team = h ? tid(h.team) : null;
    const a_name = a ? up(a.team.abbreviation || a.team.shortDisplayName) : 'TBA';
    const b_name = h ? up(h.team.abbreviation || h.team.shortDisplayName) : 'TBA';
    // ESPN ships a logo for every competitor. Carried so the board can render opponents we
    // don't track (FSU, USU, UNLV...) with their real mark instead of bare text.
    const lgo = x => { const u = x && x.team && x.team.logo; return typeof u === 'string' && u.startsWith('https://') ? u : null; };
    return {
      day_label, league_key, league,
      a_logo: a ? lgo(a) : null, b_logo: h ? lgo(h) : null,
      status: done ? 'FINAL' : live ? up(st.shortDetail || st.description || 'LIVE') : schedTime(ev.date, c && c.timeValid),
      live: live ? 1 : 0,
      network: net || null,
      venue: (c && c.venue && c.venue.fullName) || null,
      a_team, a_name,
      a_score: scored && a ? Number(a.score) : null, a_win: done && a ? (a.winner ? 1 : 0) : 0,
      b_team, b_name,
      b_score: scored && h ? Number(h.score) : null,
      sets,
      mkey: TK.matchKey(normDay(day_label).dk, league_key, a_team, a_name, b_team, b_name)
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
      status: schedTime(when),
      // The venue used to be written into `network`, because there was no venue column and
      // the adapter had nowhere else to put it. That is why 'AT&T STADIUM' was sitting on the
      // board where 'FS2' belongs. LOVB's API does not publish a broadcaster, so network stays
      // null until it does.
      network: null,
      venue: (g.venue && (g.venue.name || g.venue)) ? String(g.venue.name || g.venue) : null,
      a_team: resolveTeam('lovb', an), a_name: an || 'TBA',
      a_score: null, a_win: 0,
      b_team: resolveTeam('lovb', bn), b_name: bn || 'TBA',
      b_score: null, sets: null,
      mkey: TK.matchKey(normDay(dayLabel(when)).dk, 'lovb', resolveTeam('lovb', an), an, resolveTeam('lovb', bn), bn)
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
      status: done ? 'FINAL' : schedTime(m.MatchDateTimeUTC), network: null, venue: null,
      a_team: null, a_name: up(m.TeamAName), a_score: done ? Number(parts[1]) : null,
      a_win: done && Number(parts[1]) > Number(parts[2]) ? 1 : 0,
      b_team: null, b_name: up(m.TeamBName), b_score: done ? Number(parts[2]) : null, sets: null,
      mkey: TK.matchKey(normDay(dayLabel(m.MatchDateTimeUTC)).dk, 'intl', null, up(m.TeamAName), null, up(m.TeamBName))
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
      status: done ? 'FINAL' : schedTime(c[ciDate]), network: null, venue: null,
      a_team: resolveTeam('mlv', an), a_name: an, a_score: done ? aw : null, a_win: done && aw > hw ? 1 : 0,
      b_team: resolveTeam('mlv', bn), b_name: bn, b_score: done ? hw : null, sets: null,
      mkey: TK.matchKey(normDay(dayLabel(c[ciDate])).dk, 'mlv', resolveTeam('mlv', an), an, resolveTeam('mlv', bn), bn)
    };
  });
}

// AVP: ~12 events a year, no machine-readable results feed (see feed-sources doc).
// Handled by the Data Desk on event weekends rather than guessed at here.

// `months` is the season window, in US Central months. Out of season a feed is skipped
// rather than fetched: the poller now runs every few minutes instead of once a day, and there
// is no reason to hit ESPN's men's endpoint 288 times on a Tuesday in September to be told
// again that the men's season starts in January. A skipped feed is stamped 'offseason' in
// feed_status so it reads as deliberate rather than dead.
const FEEDS = [
  { key: 'espn_ncaaw', months: [8, 9, 10, 11, 12], run: () => espn('womens-college-volleyball', 'ncaaw', 'NCAA W') },
  { key: 'espn_ncaam', months: [1, 2, 3, 4, 5], run: () => espn('mens-college-volleyball', 'ncaam', 'NCAA M') },
  { key: 'lovb_api', months: [12, 1, 2, 3, 4, 5], run: lovb },
  { key: 'fivb_vis', months: null, run: fivb },          // international runs most of the year
  { key: 'mlv_volleydata', months: [1, 2, 3, 4, 5], run: mlv }
];
const inSeason = f => !f.months || f.months.includes(Number(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'numeric' })));

// This endpoint deletes and rewrites the entire `matches` table with the service-role key, and
// it had no authentication of any kind — anyone who guessed the path could rewrite the board,
// or simply hold it open and bill us for five upstream fetches a call. Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET`, so that is the check.
//
// Fail-safe: no CRON_SECRET set means no writes at all, only the preview report. A missing
// secret must never mean "let everyone in".
function secretMatches(req) {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const got = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || '');
  const a = Buffer.from(got), b = Buffer.from(`Bearer ${want}`);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// FAIL LOUD, NOT SILENT. The first version of this refused to write anything unless
// CRON_SECRET was set, which is the safe-looking choice and the wrong one: an unset
// environment variable would have taken the site's scores dark and nothing would have said
// so. For a news site, silently stale is a worse failure than an open endpoint that only
// re-reads public sports feeds.
//
// So: secret set and matching -> write. Secret set and wrong -> preview only. Secret not set
// at all -> still write, but stamp the warning into feed_status on every single run so it
// surfaces on the DATA page until somebody sets it.
//
// The abuse angle is closed by the throttle rather than by the lock. An unauthenticated
// caller cannot run this more often than once a minute, because the gate is the newest
// last_ok in feed_status — durable, shared across every serverless instance, and exactly the
// cadence the poller wants anyway.
const MIN_GAP_MS = 55e3;
async function gate(req) {
  const configured = !!process.env.CRON_SECRET;
  if (configured && secretMatches(req)) return { write: true, why: 'authorised' };
  if (configured) return { write: false, why: 'bad or missing CRON_SECRET — preview only' };
  let newest = 0;
  try {
    const rows = await supaGet('feed_status?select=last_ok&order=last_ok.desc.nullslast&limit=1');
    newest = rows.length && rows[0].last_ok ? new Date(rows[0].last_ok).getTime() : 0;
  } catch (_) { /* if we cannot read the clock, let the run through */ }
  if (newest && Date.now() - newest < MIN_GAP_MS) {
    return { write: false, why: `throttled — last run ${Math.round((Date.now() - newest) / 1000)}s ago, minimum gap is ${MIN_GAP_MS / 1000}s` };
  }
  return { write: true, why: 'CRON_SECRET IS NOT SET — this endpoint is writing unauthenticated. Set it in Vercel.', unsecured: true };
}

module.exports = async (req, res) => {
  const g = await gate(req);
  const key = g.write ? process.env.SUPABASE_SERVICE_ROLE_KEY : null;
  const only = String((req.query && req.query.feed) || '');
  const report = {};
  try {
    for (const f of FEEDS) {
      if (only && only !== f.key) continue;
      // `?feed=` forces a specific feed regardless of season, so a live event outside the
      // usual window can still be pulled by hand.
      if (!only && !inSeason(f)) {
        report[f.key] = { ok: true, skipped: 'offseason' };
        if (key) await supaWrite(`feed_status?feed=eq.${f.key}`, 'PATCH',
          { note: `offseason — not polled (season months ${f.months.join(', ')})` }, key).catch(() => {});
        continue;
      }
      try {
        const rows = (await f.run()).map(r => ({ ...r, source: f.key }));
        const named = rows.filter(r => r.a_team && r.b_team).length;
        const liveNow = rows.filter(r => r.live).length;
        // Names we could not resolve to a team id. These are the rows that render without a
        // logo and without a team-page link, so they are worth surfacing rather than counting.
        const unlinked = [...new Set(rows.flatMap(r => [r.a_team ? null : r.a_name, r.b_team ? null : r.b_name]).filter(Boolean))];
        report[f.key] = { ok: true, found: rows.length, linked: named, live: liveNow, unlinked: unlinked.slice(0, 25), sample: rows.slice(0, 2) };
        if (!key) { report[f.key].mode = 'preview'; continue; }

        // UPSERT, not delete-then-insert. Those were two separate calls with no transaction
        // around them, so every run opened a gap of a few hundred milliseconds where the board
        // had no rows. Once a day that is invisible; every minute it is a flicker somebody
        // eventually hits. Rows that have genuinely dropped out of the feed window are removed
        // afterwards, by name, so nothing is ever deleted before its replacement exists.
        const keyed = rows.filter(r => r.mkey);
        // on_conflict names the unique index the upsert must merge on. Without it PostgREST
        // merges on the PRIMARY KEY (id) only, so the second-ever poll over existing rows
        // died with 409 "(source, mkey) already exists" — the first re-poll after the feed
        // healed was the first time any row it wrote already existed.
        if (keyed.length) await supaWrite('matches?on_conflict=source,mkey', 'POST', keyed, key, 'resolution=merge-duplicates');
        const keep = keyed.map(r => `"${r.mkey}"`).join(',');
        await supaWrite(
          keep ? `matches?source=eq.${f.key}&mkey=not.in.(${encodeURIComponent(keep)})`
               : `matches?source=eq.${f.key}`,
          'DELETE', undefined, key
        ).catch(() => {});

        await supaWrite(`feed_status?feed=eq.${f.key}`, 'PATCH', {
          note: `${g.unsecured ? '⚠ UNSECURED — set CRON_SECRET in Vercel · ' : ''}live — ${rows.length} rows, ${named} logo-linked${liveNow ? `, ${liveNow} in progress` : ''}${unlinked.length ? ` · unlinked: ${unlinked.slice(0, 6).join(', ')}` : ''}`.slice(0, 500),
          last_ok: new Date().toISOString()
        }, key);
        report[f.key].wrote = keyed.length;
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
    ok(res, { mode: key ? 'live' : 'preview', gate: g.why, feeds: report }, 0);
  } catch (e) { fail(res, e); }
};
