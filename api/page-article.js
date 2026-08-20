const L = require('./_lib.js');

module.exports = async (req, res) => {
  try {
    const slug = String(req.query.slug || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!slug) return L.fail(res, new Error('no slug'));
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    const a = arts.find(x => x.id === slug);
    if (!a) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(L.page({ title: 'Not found — OFF THE TAPE', desc: '', canonical: L.SITE, body: `<main><div class="hubhd"><h1>404 — NOT ON THE TAPE</h1><p style="color:var(--mut);margin-top:10px">That story doesn't exist (yet). <a href="/" style="color:var(--w);text-decoration:underline">Back to the front page.</a></p></div></main>` }));
    }
    const rel = arts.filter(x => x.lg === a.lg && x.id !== a.id).slice(0, 3);
    const para = p => /^Grade:\s/.test(p) ? `<p class="grade">${L.esc(p)}</p>` : `<p>${L.esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`;
    const emb = L.embedsHTML(a.embeds);
    let flow = '';
    if (a.sections) {
      a.sections.forEach((s, i) => {
        if (s.h2) flow += `<h2>${L.esc(s.h2)}</h2>`;
        flow += (s.paras || []).map(para).join('');
        if (i === 0 && a.pull) flow += `<div class="pullq"><span class="big">${L.esc(a.pull.big)}</span><span class="lbl">${L.esc(a.pull.label)}</span></div>`;
        if (i === 0 && emb.html) flow += emb.html;
      });
    } else flow = (a.body || []).map(para).join('');
    const srcs = a.sources && a.sources.length
      ? `<div class="srcs"><div class="t">SOURCES — EVERY CLAIM CITED</div>${a.sources.map(s => `<a href="${L.attr(s.url)}" target="_blank" rel="noopener">↗ ${L.esc(s.name)}</a>`).join('')}</div>` : '';
    const when = a.created_at ? new Date(a.created_at) : new Date();
    // photo click contract: inside the article, the hero links to the ORIGINAL POST
    const hero = a.ph && a.ph.link ? `<a href="${L.attr(a.ph.link)}" target="_blank" rel="noopener" title="View the original post">${L.cov(a, true)}</a>` : L.cov(a, true);
    const body = `
${L.tickerHTML(matches)}
<main><article class="abody">
${hero}
<h1>${L.esc(a.h)}</h1>
${a.dek ? `<p class="dek">${L.esc(a.dek)}</p>` : ''}
<div class="byl">OFF THE TAPE STAFF · <b>${L.esc(a.chip)}</b> · ${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}${a.ph ? ` · ${L.esc(a.ph.cr)}` : ''}</div>
${flow}
${srcs}
<div class="tagrow"><a href="/hub/${L.attr(a.lg)}">${L.esc((L.LEAGUES[a.lg] || { n: a.lg }).n).toUpperCase()}</a>${a.t1 && L.TEAMS[a.t1] ? `<a href="/team/${L.attr(a.t1)}">${L.esc(L.TEAMS[a.t1].n).toUpperCase()}</a>` : ''}${a.t2 && L.TEAMS[a.t2] ? `<a href="/team/${L.attr(a.t2)}">${L.esc(L.TEAMS[a.t2].n).toUpperCase()}</a>` : ''}</div>
<div class="finep">Off The Tape uses AI-assisted production; every article is reviewed and approved before publication. Corrections: ashwin@off-the-tape.com${a.ph && a.ph.link ? ` · Photo: <a href="${L.attr(a.ph.link)}" target="_blank" rel="noopener">${L.esc(a.ph.cr)} — original post ↗</a>` : (a.ph ? ` · Photo: ${L.esc(a.ph.cr)}` : '')}</div>
${rel.length ? `<div class="sect" style="font-size:15px">MORE ${L.esc((L.LEAGUES[a.lg] || { n: '' }).n).toUpperCase()}</div><div class="grid3">${rel.map(x => L.acard(x, 'sm')).join('')}</div>` : ''}
</article></main>${emb.scripts}`;

    L.ok(res, L.page({
      title: `${L.stripEmoji(a.h)} — OFF THE TAPE`,
      desc: a.dek || '',
      canonical: `${L.SITE}/news/${a.id}`,
      ogImage: a.ph ? a.ph.src : null,
      jsonld: {
        '@context': 'https://schema.org', '@type': 'NewsArticle',
        headline: L.stripEmoji(a.h), description: a.dek || '',
        image: a.ph ? [a.ph.src] : undefined,
        datePublished: a.created_at, dateModified: a.created_at,
        author: [{ '@type': 'Organization', name: 'Off The Tape', url: L.SITE }],
        publisher: { '@type': 'Organization', name: 'Off The Tape', url: L.SITE },
        mainEntityOfPage: `${L.SITE}/news/${a.id}`
      },
      body
    }), 60);
  } catch (e) { L.fail(res, e); }
};
