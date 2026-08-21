const L = require('./_lib.js');
const A = require('./_auth.js');
const S = require('./_svc.js');

// Draft preview, for the editor only.
//
// This route used to read the published list and nothing else, so it 404'd on every draft —
// the preview button on the desk could never have worked. Signed-in editors now fall through
// to a service-role read and see the draft rendered by the same renderer the live page uses,
// which is the whole point: what you approve is what ships.
//
// Everything that would let an unpublished story escape is switched off: no store, no index,
// no og:image or twitter card, no NewsArticle markup. A stranger still gets a plain 404.
const DRAFTBAR = (a, status) => `<div class="apr" style="max-width:760px;margin:18px auto 0"><div class="draftbar">
  <span>● ${L.esc(String(status || 'draft').toUpperCase())} PREVIEW — NOT PUBLISHED, NOT INDEXED</span>
  <a href="/approve" style="color:#ffe0a3;text-decoration:underline">BACK TO THE DESK</a>
</div></div>`;

module.exports = async (req, res) => {
  try {
    const slug = String((req.query && req.query.slug) || '');
    const [arts, matches] = await Promise.all([L.getArticles('published'), L.getMatches()]);
    const a = arts.find(x => x.id === slug);

    if (!a) {
      if (A.isEditor(req)) {
        const draft = await S.anyById(slug).catch(() => null);
        if (draft) {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
          res.setHeader('Referrer-Policy', 'no-referrer');
          L.R.setCtx({ articles: [draft].concat(arts), matches });
          return L.ok(res, L.page({
            title: `${L.stripEmoji(draft.hRaw)} — DRAFT PREVIEW`,
            desc: '', canonical: `${L.SITE}/news/${draft.id}`,
            ogImage: null, jsonld: null, noindex: true,
            ctx: { kind: 'article', lg: draft.lg }, matches, arts,
            body: DRAFTBAR(draft, draft.status) + L.R.pgArticle(draft.id)
          }), 0);
        }
      }
      L.R.setCtx({ articles: arts, matches });
      return L.ok(res, L.page({ title: 'Not found — OFF THE TAPE', desc: '', canonical: L.SITE, ctx: {}, arts, body: L.R.pg404(), noindex: true }), 0, 404);
    }

    L.R.setCtx({ articles: arts, matches });
    const clean = L.stripEmoji(a.hRaw);
    L.ok(res, L.page({
      title: `${clean} — OFF THE TAPE`,
      desc: a.dekRaw || clean,
      canonical: `${L.SITE}/news/${a.id}`,
      ogImage: a.ph ? a.ph.src : null,
      jsonld: {
        '@context': 'https://schema.org', '@type': 'NewsArticle',
        headline: clean, description: a.dekRaw || '',
        datePublished: a.published_at || a.created_at, dateModified: a.published_at || a.created_at,
        author: { '@type': 'Organization', name: 'Off The Tape' },
        publisher: { '@type': 'Organization', name: 'Off The Tape' },
        mainEntityOfPage: `${L.SITE}/news/${a.id}`,
        ...(a.ph ? { image: [a.ph.src] } : {})
      },
      ctx: { kind: 'article', lg: a.lg }, matches, arts,
      body: L.R.pgArticle(a.id)
    }), 120);
  } catch (e) { L.fail(res, e); }
};
