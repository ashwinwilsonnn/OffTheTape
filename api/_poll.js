// The newest weekly AVCA poll, read live from the `polls` table.
// The NCAA W rankings tab used to print the fixed preseason list in _data.js, so it still read
// "Aug 10" in October while the Data Desk was writing a new poll into `polls` every week
// (rows named avca_w_2026_wk1, wk2, ...). This reads the highest week and renders it.
// Anything that goes wrong returns null, and the tab falls back to the static list rather
// than going blank.
const { supaGet } = require('./_supa.js');
const { TEAMS } = require('./_data.js');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function latestPoll(prefix) {
  try {
    const rows = await supaGet(`polls?select=poll,rank,team_id,points,firsts,record&poll=like.${encodeURIComponent(prefix)}*&order=rank.asc`);
    const wk = p => { const m = /^(\d+)$/.exec(String(p).slice(prefix.length)); return m ? Number(m[1]) : -1; };
    let best = -1;
    for (const r of rows) best = Math.max(best, wk(r.poll));
    if (best < 0) return null;
    const pick = rows.filter(r => wk(r.poll) === best).sort((a, b) => a.rank - b.rank);
    return pick.length ? { week: best, rows: pick } : null;
  } catch (_) { return null; }
}

// `tlogo` is passed in from _render.js so the logos match every other table on the site.
function pollTable(poll, tlogo) {
  const cell = r => {
    const t = TEAMS[r.team_id];
    return t ? `<a class="tmc" href="/team/${esc(r.team_id)}">${tlogo(t, 22)}${t.n}</a>`
             : `<span class="tmc">${esc(String(r.team_id || '').toUpperCase())}</span>`;
  };
  const num = v => (v == null || v === 0 ? '—' : esc(v));
  return `<div class="sect" style="font-size:15px;margin-top:20px">AVCA COACHES POLL · WEEK ${poll.week} <span class="mr">TOP ${poll.rows.length}</span></div>`
    + `<div class="tbwrap"><table class="tb"><tr><th>RK</th><th>TEAM</th><th>RECORD</th><th>PTS</th><th>1ST-PLACE</th></tr>`
    + poll.rows.map(r => `<tr><td class="rk">${esc(r.rank)}</td><td>${cell(r)}</td><td class="fpv">${r.record ? esc(r.record) : '—'}</td><td class="fpv">${num(r.points)}</td><td class="fpv">${num(r.firsts)}</td></tr>`).join('')
    + `</table></div><p style="color:var(--mut);font-size:12px;margin-top:10px">Source: AVCA Division I Coaches Poll, week ${poll.week}.</p>`;
}

module.exports = { latestPoll, pollTable };
