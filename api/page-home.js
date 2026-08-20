const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    const byLg = lg => arts.filter(a => a.lg === lg);
    const lead = arts[0];
    const rail = arts.slice(1, 7);
    const most = arts.slice(0, 4);
    const secmod = (list) => list.length ? `<div class="secmod">${L.acard(list[0])}<div class="stack">${list.slice(1, 3).map(a => L.acard(a, 'sm')).join('')}</div></div>` : '';
    const ncaaw = byLg('ncaaw'), ncaam = byLg('ncaam'), pro = [...byLg('lovb'), ...byLg('mlv')], beach = [...byLg('beach'), ...byLg('intl')], rec = byLg('recruit');

    const body = `
${L.tickerHTML(matches)}
<main>
<span class="kick"><b style="color:var(--red)">●</b> THE HOME OF EVERYTHING VOLLEYBALL</span>
${lead ? `<div class="cols"><div>${L.acard(lead, 'lead')}</div><aside>
  <div class="sect" style="margin-top:0;font-size:15px">TOP HEADLINES</div><div class="rail">${rail.map(L.railItem).join('')}</div>
</aside></div>` : '<p style="margin-top:30px;color:var(--mut)">First stories publish shortly.</p>'}
${most.length ? `<div class="sect">MOST READ 📈</div><div class="grid3">${most.slice(1, 4).map(a => L.acard(a, 'sm')).join('')}</div>` : ''}
${ncaaw.length ? `<div class="sect">NCAA WOMEN <a href="/hub/ncaaw">ALL NCAA W ›</a></div>${secmod(ncaaw)}` : ''}
${pro.length ? `<div class="sect">PRO VOLLEYBALL <a href="/hub/lovb">ALL PRO ›</a></div>${secmod(pro)}` : ''}
${ncaam.length ? `<div class="sect">NCAA MEN <a href="/hub/ncaam">ALL NCAA M ›</a></div><div class="grid2">${ncaam.slice(0, 2).map(a => L.acard(a)).join('')}</div>` : ''}
${L.newsletterStrip()}
${beach.length ? `<div class="sect">BEACH + INTERNATIONAL <a href="/hub/beach">MORE ›</a></div><div class="grid3">${beach.slice(0, 3).map(a => L.acard(a, 'sm')).join('')}</div>` : ''}
${rec.length ? `<div class="sect">RECRUITING <a href="/hub/recruit">ALL RECRUITING ›</a></div><div class="grid2">${rec.slice(0, 2).map(a => L.acard(a)).join('')}</div>` : ''}
</main>`;

    L.ok(res, L.page({
      title: 'OFF THE TAPE — Volleyball. All of it.',
      desc: 'Scores, news, rankings and recruiting across NCAA volleyball, LOVB, MLV, the AVP and the international game — updated daily.',
      canonical: L.SITE + '/',
      ogImage: lead && lead.ph ? lead.ph.src : null,
      jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Off The Tape', url: L.SITE },
      body
    }), 60);
  } catch (e) { L.fail(res, e); }
};
