const L = require('./_lib.js');

function pollTable(rows, cols) {
  return `<div class="tbwrap"><table class="tb"><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows}</table></div>`;
}
function rankings(lg) {
  if (lg === 'ncaaw') {
    const rows = L.POLLW.map(([r, id, fp, pts]) => { const t = L.TEAMS[id]; return `<tr><td class="rk">${r}</td><td><a class="tmc" href="/team/${id}"><img src="${L.attr(t.img)}" alt="" onerror="${L.die}">${L.esc(t.n)}</a></td><td class="fpv">${pts || '—'}</td><td class="fpv">${fp || '—'}</td></tr>`; }).join('');
    return `<div class="sect" style="font-size:15px">AVCA PRESEASON COACHES POLL · AUG 10</div>${pollTable(rows, ['RK', 'TEAM', 'PTS', '1ST'])}<p class="srcnote">Source: AVCA Division I Coaches Poll, Aug 10, 2026. 63 first-place ballots (Nebraska 57, Kentucky 4, Texas 1, Texas A&amp;M 1).</p>`;
  }
  if (lg === 'ncaam') {
    const rows = L.POLLM.map(([r, id, pts, rec, fp]) => { const t = L.TEAMS[id]; return `<tr><td class="rk">${r}</td><td><a class="tmc" href="/team/${id}"><img src="${L.attr(t.img)}" alt="" onerror="${L.die}">${L.esc(t.n)}</a></td><td class="fpv">${pts}</td><td class="fpv">${rec}</td><td class="fpv">${fp || '—'}</td></tr>`; }).join('');
    return `<div class="sect" style="font-size:15px">AVCA NATIONAL COLLEGIATE MEN — FINAL POLL · MAY 12, 2026</div>${pollTable(rows, ['RK', 'TEAM', 'PTS', 'RECORD', '1ST'])}<p class="srcnote">Source: AVCA coaches poll. Hawaiʻi finished No. 1 unanimously (25 of 25 first-place votes) after beating UC Irvine in the NCAA final.</p>`;
  }
  if (lg === 'lovb') {
    const rows = L.STAND_LOVB.map(([id, fin], i) => { const t = L.TEAMS[id]; return `<tr><td class="rk">${i + 1}</td><td><a class="tmc" href="/team/${id}"><img src="${L.attr(t.img)}" alt="" onerror="${L.die}">${L.esc(t.n)}</a></td><td class="fpv">${L.esc(fin)}</td></tr>`; }).join('');
    return `<div class="sect" style="font-size:15px">LOVB 2026 — FINAL</div>${pollTable(rows, ['PL', 'TEAM', 'FINISH'])}<p class="srcnote">Regular-season standings per lovb.com; Austin beat Salt Lake in the Championship golden set 15-8 (Apr 18, Long Beach). LA, SF, Miami and Minnesota join for 2027.</p>`;
  }
  if (lg === 'mlv') {
    const rows = L.STAND_MLV.map(([id, fin], i) => { const t = L.TEAMS[id]; return `<tr><td class="rk">${i + 1}</td><td><a class="tmc" href="/team/${id}"><img src="${L.attr(t.img)}" alt="" onerror="${L.die}">${L.esc(t.n)}</a></td><td class="fpv">${L.esc(fin)}</td></tr>`; }).join('');
    return `<div class="sect" style="font-size:15px">MLV 2026 — FINAL</div>${pollTable(rows, ['PL', 'TEAM', 'FINISH'])}<p class="srcnote">Dallas d. Omaha 3-2 in the final, May 9, Frisco. Vegas, DC and NorCal join for 2027; LA and Minnesota announced.</p>`;
  }
  if (lg === 'intl') {
    const vt = (rows, ttl) => `<div class="sect" style="font-size:15px">${ttl}</div>${pollTable(rows.map(([n, fin], i) => `<tr><td class="rk">${i + 1}</td><td class="tmc">${L.esc(n)}</td><td class="fpv">${L.esc(fin)}</td></tr>`).join(''), ['PL', 'TEAM', 'FINISH'])}`;
    return vt(L.VNLW, 'WOMEN’S VNL 2026 — FINAL FOUR') + vt(L.VNLM, 'MEN’S VNL 2026 — FINAL FOUR') + `<p class="srcnote">Melissa Vargas: 33 points in the women’s final — the most ever in a VNL final. Source: Volleyball World / FIVB.</p>`;
  }
  if (lg === 'recruit') {
    const rows = L.CLASSBOARD.map(([r, n, pos, hm, st, tid, srcr]) => `<tr><td class="rk">${r}</td><td style="font-weight:700;color:var(--w)">${L.esc(n)}</td><td class="fpv">${pos}</td><td class="fpv">${L.esc(hm)}</td><td class="fpv">${st}</td><td class="fpv">${L.esc(srcr)}</td></tr>`).join('');
    return `<div class="sect" style="font-size:15px">2027 CLASS RANKINGS — THE BOARD</div>${pollTable(rows, ['NATL RK', 'RECRUIT', 'POS', 'HOMETOWN', 'STATUS', 'RANK SOURCE'])}<p class="srcnote">Ranks: Prep Dig public 2027 national list + PrepVolleyball; commitments per SI / Lincoln Journal Star. OTT reports verified public commitments — it does not fabricate rankings.</p>`;
  }
  return '<p style="color:var(--mut);margin-top:20px">Rankings publish here in season.</p>';
}

module.exports = async (req, res) => {
  try {
    const lg = String(req.query.lg || '').replace(/[^a-z]/g, '');
    const tab = String(req.query.tab || '').replace(/[^a-z]/g, '');
    const LG = L.LEAGUES[lg];
    if (!LG) return res.status(404).send('not found');
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    const list = arts.filter(a => a.lg === lg);
    const tabs = [['', 'LATEST'], ['rankings', 'RANKINGS'], ['teams', 'TEAMS']];
    let inner = '';
    if (tab === 'rankings') inner = rankings(lg);
    else if (tab === 'teams') {
      const order = L.CONFORDER[lg];
      inner = order ? order.map(cf => {
        const tm = Object.values(L.TEAMS).filter(t => t.lg === lg && L.CONF[t.id] === cf);
        return tm.length ? `<div class="sect" style="font-size:14px">${cf}</div><div class="grid3">${tm.map(t => `<a class="mcard" href="/team/${t.id}"><div class="tr"><img src="${L.attr(t.img)}" alt="" onerror="${L.die}">${L.esc(t.n)}<span class="sc" style="font-size:10px;color:var(--mut)">${L.esc(t.rec)}</span></div></a>`).join('')}</div>` : '';
      }).join('') : '<p style="color:var(--mut);margin-top:20px">Team pages coming online league by league.</p>';
    }
    else inner = list.length
      ? `<div class="secmod" style="margin-top:20px">${L.acard(list[0], 'lead')}<div class="stack">${list.slice(1, 3).map(a => L.acard(a, 'sm')).join('')}</div></div>${list.length > 3 ? `<div class="grid3" style="margin-top:20px">${list.slice(3).map(a => L.acard(a, 'sm')).join('')}</div>` : ''}`
      : '<p style="color:var(--mut);margin-top:24px">Stories land here as they publish.</p>';

    const body = `${L.tickerHTML(matches)}<main>
<div class="hubhd"><h1>${L.esc(LG.n)}</h1><div class="sub">${L.esc(LG.sub || '')}</div>
<div class="tabs">${tabs.map(([u, n]) => `<a class="${tab === u ? 'on' : ''}" href="/hub/${lg}${u ? '/' + u : ''}">${n}</a>`).join('')}</div></div>
${inner}</main>`;
    L.ok(res, L.page({
      title: `${LG.n} — OFF THE TAPE`,
      desc: `${LG.n} news, scores and rankings on Off The Tape. ${LG.sub || ''}`,
      canonical: `${L.SITE}/hub/${lg}${tab ? '/' + tab : ''}`,
      body
    }), 120);
  } catch (e) { L.fail(res, e); }
};
