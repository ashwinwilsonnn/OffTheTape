// One vocabulary for team identity, shared by the writer and the reader.
//
// This file exists because they used to disagree. The poller knew that ESPN's "COLO" means
// our team `col` — that alias was sitting in cron-feeds.js. The board's dedupe did not, so a
// row carrying the id keyed as `col` while a copy carrying only the abbreviation keyed as
// `colo`, they failed to collapse, and the same fixture appeared on the board twice.
//
// Two writers with two vocabularies is the whole bug. Anything that needs to answer "are
// these the same team?" resolves through here.
const DATA = require('./_data.js');
const TEAMS = DATA.TEAMS || {};

// NFD + strip: accents fold away, punctuation and spacing stop mattering. "TA&M" -> "tam".
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

// league-scoped display names -> id
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

// Writer side: feed names -> our team id, so rows carry logos and team-page links.
function resolveTeam(lg, ...cands) {
  for (const c of cands) {
    if (!c) continue;
    const k = `${lg}|${norm(c)}`;
    if (ALIAS[k]) return ALIAS[k];
    if (TEAM_INDEX[k]) return TEAM_INDEX[k];
  }
  return null;
}

// Short codes, league-scoped. ESPN hands back "WIS" and "UK", which are neither display
// names nor aliases — they are our own short codes, so index those too.
const SHORT = (() => {
  const m = new Map();
  for (const id of Object.keys(TEAMS)) {
    const t = TEAMS[id], k = (t.lg || '') + '|' + norm(t.s);
    if (t.s && !m.has(k)) m.set(k, id);
  }
  return m;
})();

// Reader side: the token two copies of one fixture must agree on. A row that resolved an id
// and a row that only has the broadcaster's abbreviation both land on the id. Anything we
// genuinely do not recognise falls back to its own normalised name, prefixed so it can never
// be mistaken for a real id — still stable, still collapses against another copy spelled the
// same way.
function teamKey(lg, id, name) {
  if (id && TEAMS[id]) return id;
  const k = norm(name);
  if (TEAMS[k]) return k;                                  // the name is already an id: "WIS"
  if (SHORT.has(lg + '|' + k)) return SHORT.get(lg + '|' + k);
  return resolveTeam(lg, name) || ('?' + k.slice(0, 8));
}

// Every id, short code and display name we know, for callers that have no league to scope by.
const ANY_LABEL = (() => {
  const m = new Map();
  for (const id of Object.keys(TEAMS)) {
    const t = TEAMS[id];
    for (const label of [id, t.s, t.n]) { const k = norm(label); if (k && !m.has(k)) m.set(k, id); }
  }
  return m;
})();
function teamKeyAnyLeague(id, name) {
  if (id && TEAMS[id]) return id;
  const k = norm(name);
  if (ANY_LABEL.has(k)) return ANY_LABEL.get(k);
  for (const lg of ['ncaaw', 'ncaam', 'lovb', 'mlv', 'beach', 'intl']) {
    const hit = resolveTeam(lg, name);
    if (hit) return hit;
  }
  return '?' + k.slice(0, 8);
}

// The token that identifies a FIXTURE, for the same reason teamKey exists: the reader and the
// writer have to agree. A box score is written by the Data Desk in the morning and read by the
// match page all day, and in between the feed poller deletes and re-inserts every row it owns
// with fresh serial ids — so matches.id cannot be the link. Day plus the two teams can.
//
// URL-safe by construction: MMDD, then the two team keys sorted, hyphen-separated. teamKey
// returns '?xxx' for a team we do not recognise; that becomes 'x-xxx' here so the whole thing
// stays [a-z0-9-] and can sit in a path segment without encoding.
const urlSafe = k => String(k || '').replace(/^\?/, 'x-').replace(/[^a-z0-9-]/g, '');
function matchKey(dayKey, lg, aTeam, aName, bTeam, bName) {
  const dk = String(dayKey || '').replace(/-/g, '');           // '08-22' -> '0822'
  const pair = [teamKey(lg, aTeam, aName), teamKey(lg, bTeam, bName)].map(urlSafe).sort();
  return `${dk}-${pair[0]}-${pair[1]}`;
}

module.exports = { norm, TEAM_INDEX, ALIAS, resolveTeam, teamKey, teamKeyAnyLeague, matchKey };
