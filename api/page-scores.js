const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const matches = await L.getMatches();
    let day = '', h = '';
    for (const m of matches) {
      if (m.day_label !== day) { if (day) h += '</div>'; day = m.day_label; h += `<div class="sect" style="font-size:15px">${L.esc(day)}</div><div class="grid3">`; }
      const A = m.a_team ? L.TEAMS[m.a_team] : null, B = m.b_team ? L.TEAMS[m.b_team] : null;
      const done = m.status === 'FINAL';
      const row = (T, n, sc, lost) => `<div class="tr ${lost ? 'los' : ''}">${T ? `<img src="${L.attr(T.img)}" alt="" onerror="${L.die}">` : ''}<span>${L.esc(T ? T.n : n)}</span><span class="sc">${sc ?? ''}</span></div>`;
      h += `<div class="mcard"><div class="st"><span>${L.esc(m.league)} · ${L.esc(m.day_label)}</span><span>${L.esc(m.status)}${m.network ? ' · ' + L.esc(m.network) : ''}</span></div>
      ${row(A, m.a_name, m.a_score, done && !m.a_win)}${row(B, m.b_name, m.b_score, done && m.a_win)}
      ${m.sets ? `<div class="sets">${L.esc(m.sets)}</div>` : ''}</div>`;
    }
    if (day) h += '</div>';
    const body = `${L.tickerHTML(matches)}<main><div class="hubhd"><h1>SCORES</h1><div class="sub">LIVE FEEDS EXPAND LEAGUE BY LEAGUE — NCAA W WIRED · MORE AT LAUNCH</div></div>${h || '<p style="color:var(--mut);margin-top:24px">No matches on the board.</p>'}</main>`;
    L.ok(res, L.page({ title: 'Volleyball Scores — OFF THE TAPE', desc: 'Live and recent volleyball scores across NCAA, LOVB, MLV, AVP and international play.', canonical: `${L.SITE}/scores`, body }), 60);
  } catch (e) { L.fail(res, e); }
};
