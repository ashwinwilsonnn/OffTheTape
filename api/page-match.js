// /match/<mkey> — the full breakdown of one fixture.
//
// Everything here is written by the Data Desk each morning into `match_box` and read straight
// back out. It is deliberately a separate table from `matches`: the feed poller deletes and
// re-inserts every row it owns on each run, with fresh serial ids, so a box score hung off a
// matches row would be destroyed daily. `mkey` — MMDD plus the two team keys, sorted — is the
// same token the board already uses to collapse two copies of one fixture, so it survives.
//
// Every value on this page came off a third-party site, so every value is escaped. Columns
// appear only when at least one row actually carries them; a table of empty cells looks like
// a bug even when it is honest.
const L = require('./_lib.js');
const R = L.R;

const num = v => (v === null || v === undefined || v === '' ? null : v);
const cell = v => (num(v) === null ? '<span style="color:var(--mut)">—</span>' : L.esc(v));

// Percentages arrive as ".380" or "0.380" or 0.38 depending on who published them.
const pct = v => {
  if (num(v) === null) return null;
  const s = String(v).trim();
  const f = parseFloat(s);
  if (!Number.isFinite(f)) return L.esc(s);
  return (f < 0 ? '-' : '') + Math.abs(f).toFixed(3).replace(/^0/, '');
};

const COLS = [
  ['k', 'K'], ['e', 'E'], ['ta', 'TA'], ['pct', 'PCT'], ['ast', 'AST'],
  ['dig', 'DIG'], ['blk', 'BLK'], ['ace', 'ACE'], ['se', 'SE'], ['pts', 'PTS']
];

function statTable(players, totals, teamLabel) {
  const rows = Array.isArray(players) ? players.filter(p => p && (p.n || p.name)) : [];
  const tot = totals && typeof totals === 'object' ? totals : null;
  if (!rows.length && !tot) return '';
  // Only the columns somebody actually filled in.
  const live = COLS.filter(([k]) => rows.some(p => num(p[k]) !== null) || (tot && num(tot[k]) !== null));
  if (!live.length) return '';
  const body = rows.map(p => `<tr><td class="nm">${L.esc(p.n || p.name)}${p.pos ? `<span class="po">${L.esc(p.pos)}</span>` : ''}</td>${live.map(([k]) => `<td>${k === 'pct' ? (pct(p[k]) === null ? '<span style="color:var(--mut)">—</span>' : L.esc(pct(p[k]))) : cell(p[k])}</td>`).join('')}</tr>`).join('');
  const totRow = tot ? `<tr class="tot"><td>TEAM</td>${live.map(([k]) => `<td>${k === 'pct' ? (pct(tot[k]) === null ? '—' : L.esc(pct(tot[k]))) : cell(tot[k])}</td>`).join('')}</tr>` : '';
  return `<div class="bxsec">${L.esc(teamLabel)}</div>
  <div class="tbwrap"><table class="bx"><tr><th>PLAYER</th>${live.map(([, h]) => `<th>${h}</th>`).join('')}</tr>${body}${totRow}</table></div>`;
}

function teamRow(key, name, sets, won, lost) {
  const t = L.TEAMS[key] || null;
  const label = t ? t.n : (name || '—');
  return `<div class="mteam ${lost ? 'los' : ''}">
    ${t ? `<span style="width:30px;height:30px;display:grid;place-items:center;flex:none">${R.tlogo(t, 28)}</span>` : ''}
    <span>${t ? `<a href="/team/${L.attr(t.id)}" style="color:inherit;text-decoration:none">${L.esc(label)}</a>` : L.esc(label)}</span>
    ${t && t.rk ? `<span class="wn">NO. ${L.esc(t.rk)}</span>` : ''}
    ${won ? '<span class="wn">WIN</span>' : ''}
    <span class="sc">${num(sets) === null ? '—' : L.esc(sets)}</span>
  </div>`;
}

function setGrid(scores) {
  const list = Array.isArray(scores) ? scores.filter(x => x && (num(x.a) !== null || num(x.b) !== null)) : [];
  if (!list.length) return '';
  const cols = list.length;
  const head = list.map((_, i) => `<div class="lbl">SET ${i + 1}</div>`).join('');
  const line = side => list.map(x => {
    const a = Number(x.a), b = Number(x.b);
    const win = Number.isFinite(a) && Number.isFinite(b) && (side === 'a' ? a > b : b > a);
    return `<div class="v ${win ? 'w' : ''}">${cell(x[side])}</div>`;
  }).join('');
  return `<div class="setgrid" style="grid-template-columns:repeat(${cols},1fr)">${head}</div>
  <div class="setgrid" style="grid-template-columns:repeat(${cols},1fr)">${line('a')}</div>
  <div class="setgrid" style="grid-template-columns:repeat(${cols},1fr);border-top:none">${line('b')}</div>`;
}

module.exports = async (req, res) => {
  try {
    const mkey = String((req.query && req.query.mkey) || '').replace(/[^a-z0-9-]/g, '');
    const [box, arts, matches] = await Promise.all([
      L.getMatchBox(mkey).catch(() => null),
      L.getArticles('published'),
      L.getMatches()
    ]);
    R.setCtx({ articles: arts, matches });

    if (!box) {
      return L.ok(res, L.page({
        title: 'Match not found — OFF THE TAPE', desc: '', canonical: `${L.SITE}/scores`,
        ctx: {}, arts, matches: null,
        body: `<div class="hubslim" style="margin-top:16px"><h1>NO BOX SCORE YET</h1><span class="r">Full box scores are added after matches finish — a match that ended tonight will usually be here by tomorrow morning.</span></div>
        <p style="margin-top:18px"><a href="/scores" style="color:var(--w);text-decoration:underline">Back to the scores board</a></p>`
      }), 0, 404);
    }

    const aWon = num(box.a_sets) !== null && num(box.b_sets) !== null && Number(box.a_sets) > Number(box.b_sets);
    const bWon = num(box.a_sets) !== null && num(box.b_sets) !== null && Number(box.b_sets) > Number(box.a_sets);
    const aT = L.TEAMS[box.a_key], bT = L.TEAMS[box.b_key];
    const aLabel = aT ? aT.n : (box.a_name || 'Team A');
    const bLabel = bT ? bT.n : (box.b_name || 'Team B');
    const title = `${aLabel} vs ${bLabel}`;
    const score = num(box.a_sets) !== null ? ` ${box.a_sets}-${box.b_sets}` : '';

    // Anything we wrote about this fixture, matched on either team.
    const rel = arts.filter(a => [box.a_key, box.b_key].includes(a.t1) || [box.a_key, box.b_key].includes(a.t2)).slice(0, 3);

    const srcs = Array.isArray(box.sources) ? box.sources.filter(x => x && x.url) : [];
    const meta = [box.league, box.day_label, box.venue, box.attendance ? `${Number(box.attendance).toLocaleString('en-US')} IN THE BUILDING` : '']
      .filter(Boolean).map(x => L.esc(x)).join(' · ');

    const body = `<div class="drow" style="margin:16px 0 0"><a href="/scores" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mut);text-decoration:none">‹ SCORES</a></div>
<div class="hubslim" style="margin-top:8px"><h1>${L.esc(title)}</h1><span class="r">${meta}</span></div>

<div class="mhero">
  ${teamRow(box.a_key, box.a_name, box.a_sets, aWon, bWon)}
  ${teamRow(box.b_key, box.b_name, box.b_sets, bWon, aWon)}
  ${setGrid(box.set_scores)}
  ${box.mvp ? `<div class="mhead" style="border-bottom:none;border-top:1px solid var(--ln)"><span style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:var(--mut)">MATCH MVP</span><div style="font-weight:800;margin-top:3px">${L.esc(box.mvp)}</div></div>` : ''}
</div>

${box.notes ? `<p style="color:var(--ink2);font-size:14px;line-height:1.65;margin-top:16px;max-width:70ch">${L.esc(box.notes)}</p>` : ''}

${statTable(box.a_players, box.a_totals, aLabel)}
${statTable(box.b_players, box.b_totals, bLabel)}

${srcs.length ? `<div class="srcs" style="margin-top:26px"><div class="t">SOURCES</div>${srcs.map(x => `<a href="${L.attr(L.safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">↗ ${L.esc(x.name || x.url)}</a>`).join('')}</div>` : ''}

${rel.length ? `<div class="sect" style="font-size:15px;margin-top:30px">OUR COVERAGE</div><div class="grid3">${rel.map(a => R.acard(a, 'sm')).join('')}</div>` : ''}

<p style="color:var(--mut);font-size:11.5px;margin-top:22px">Box scores are compiled from the sources listed above. Spot something wrong? help@off-the-tape.com.</p>`;

    L.ok(res, L.page({
      title: `${title}${score} — box score — OFF THE TAPE`,
      desc: `Full box score: ${title}${score}. Set scores, team totals and every player's line, sourced.`,
      canonical: `${L.SITE}/match/${mkey}`,
      ctx: { kind: 'match', lg: box.league_key },
      matches: null, arts,
      extraHead: R.MATCHCSS,
      body
    }), 300);
  } catch (e) { L.fail(res, e); }
};
