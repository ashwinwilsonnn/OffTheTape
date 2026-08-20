const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const id = String(req.query.id || '').replace(/[^a-z0-9&]/g, '');
    const t = L.TEAMS[id];
    if (!t) return res.status(404).send('not found');
    const [arts, matches, stats] = await Promise.all([
      L.getArticles('published'), L.getMatches(),
      L.supaGet(`player_stats?select=*&team_id=eq.${id}&order=updated_at.desc`).catch(() => [])
    ]);
    const list = arts.filter(a => a.t1 === id || a.t2 === id);
    const body = `${L.tickerHTML(matches)}<main>
<div class="teamrail" style="background:${t.c1}"></div>
<div class="hubhd" style="display:flex;align-items:center;gap:14px">
  <span style="width:52px;height:52px;background:#fff;border-radius:10px;display:grid;place-items:center;padding:7px"><img src="${L.attr(t.img)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain" onerror="${L.die}"></span>
  <div><h1>${L.esc(t.n)}</h1><div class="sub">${L.esc((L.LEAGUES[t.lg] || { n: t.lg }).n).toUpperCase()} ${t.rk ? '· NO. ' + t.rk + ' AVCA' : ''} · ${L.esc(t.rec)}</div></div>
</div>
${stats.length ? `<div class="sect" style="font-size:15px">PLAYERS TO KNOW</div><div class="tbwrap"><table class="tb"><tr><th>PLAYER</th><th>POS</th><th>LINE</th></tr>${stats.map(p => `<tr><td style="font-weight:700;color:var(--w)">${L.esc(p.name)}</td><td class="fpv">${L.esc(p.position || '')}</td><td class="fpv">${L.esc(p.stat_line || '')}</td></tr>`).join('')}</table></div>` : ''}
${list.length ? `<div class="sect" style="font-size:15px">LATEST ${L.esc(t.s)} COVERAGE</div><div class="grid3">${list.map(a => L.acard(a, 'sm')).join('')}</div>` : `<p style="color:var(--mut);margin-top:24px">Every article tagged ${L.esc(t.s)} lands here automatically.</p>`}
</main>`;
    L.ok(res, L.page({
      title: `${t.n} Volleyball — news, scores, schedule — OFF THE TAPE`,
      desc: `${t.n} volleyball coverage on Off The Tape: news, results and rankings position, updated daily.`,
      canonical: `${L.SITE}/team/${id}`,
      body
    }), 120);
  } catch (e) { L.fail(res, e); }
};
