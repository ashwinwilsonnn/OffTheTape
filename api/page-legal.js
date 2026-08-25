const L = require('./_lib.js');

const PAGES = {
  about: { t: 'About Off The Tape', h: `
<p>Off The Tape is an independent volleyball media brand covering the entire sport — NCAA women's and men's volleyball, LOVB, Major League Volleyball, the AVP and beach game, the international calendar, and recruiting — with a US-first focus.</p>
<p>We publish daily: news, recaps, rankings analysis and features, built on sourced reporting. Every table on this site cites where its numbers come from, and every article lists its sources at the bottom.</p>
<p>That is the standard, and we are not there yet on our own back catalogue. A small number of pieces published in the site's first week carry no source list, because they predate the rule. They are being rewritten with sources attached rather than quietly deleted, and this line comes down when the last one is done.</p>
<h2>How we work</h2>
<p>Off The Tape uses AI-assisted production. Our stories are drafted with the help of automated research and writing tools, and every article is reviewed and approved by a human editor before publication. Nothing publishes on its own. When we get something wrong, we correct it quickly and say so — see our <a href="/legal/corrections" style="text-decoration:underline">corrections policy</a>.</p>
<h2>Photos and social media</h2>
<p>Imagery on Off The Tape is credited to its source. Social-media content appears via the platforms' own embed and linking tools — we point to the original post rather than copying it, and clicking an image or embed takes you to the original. Rights holders can request removal at any time: ashwin@off-the-tape.com — removals are processed same-day.</p>
<h2>Contact</h2>
<p>Editorial, corrections, photo/rights requests, partnerships: <b>ashwin@off-the-tape.com</b></p>` },
  terms: { t: 'Terms of Use', h: `
<p>Welcome to Off The Tape ("OTT", "we"). By using this site you agree to these terms.</p>
<h2>Use of the service</h2>
<p>Off The Tape provides sports news and information for personal, non-commercial use. Don't scrape the site at scale, misrepresent our content as your own, or use the site to break the law.</p>
<h2>Our content</h2>
<p>Original OTT articles, graphics and design are ours. Team names, logos and league marks belong to their owners and appear for identification and news reporting. Social-media content appears through the platforms' own embed tools and remains the property of its posters.</p>
<h2>AI-assisted production</h2>
<p>OTT uses AI-assisted research and drafting tools in producing its content. Every article is reviewed and approved by a human editor before publication, and articles list their sources — see <a href="/legal/about" style="text-decoration:underline">About</a> for where our back catalogue still falls short of that. If you believe something we published is inaccurate, contact ashwin@off-the-tape.com and we will review it promptly.</p>
<h2>Third-party links and embeds</h2>
<p>Links and embedded posts lead to services we don't control; their terms govern their content. Embedded content may disappear if the original poster removes it.</p>
<h2>Copyright / DMCA</h2>
<p>Rights holders may send takedown requests to ashwin@off-the-tape.com. Verified requests are honored same-day.</p>
<h2>Disclaimers</h2>
<p>The site is provided "as is." We work hard to be accurate but don't guarantee error-free content, and we aren't liable for decisions made based on it. Scores and schedules can change after publication.</p>
<h2>Changes</h2>
<p>We may update these terms; continued use means acceptance. Material changes will be noted on this page.</p>` },
  privacy: { t: 'Privacy Policy', h: `
<p>Off The Tape collects as little as possible.</p>
<h2>What we collect</h2>
<p>If you join the newsletter: your email address. Standard server logs (IP, user agent) for security and performance. Anonymous, aggregate analytics about which pages get read.</p>
<h2>What we do with it</h2>
<p>The newsletter email sends you the newsletter — nothing else. We do not sell personal data. We do not run third-party ad trackers. Analytics are used to understand what coverage readers want.</p>
<h2>AI-assisted production</h2>
<p>Our content production uses AI-assisted tools; this involves processing public sports information, not reader personal data.</p>
<h2>Embedded content</h2>
<p>Articles may include posts embedded from X, Instagram or TikTok using those platforms' tools. When an embed loads, that platform may set cookies or collect data under its own privacy policy — the same as if you visited the post directly.</p>
<h2>Your choices</h2>
<p>Unsubscribe from the newsletter any time via the link in any email, or by writing ashwin@off-the-tape.com. You may request deletion of your data the same way. You must be 13 or older to subscribe; we do not knowingly collect data from children under 13.</p>
<h2>Contact</h2>
<p>Privacy questions: ashwin@off-the-tape.com</p>` },
  corrections: { t: 'Corrections Policy', h: `
<p>We publish fast and we source everything — and when we're wrong, we fix it fast and say so.</p>
<h2>How it works</h2>
<p>Material errors of fact are corrected in the article as soon as they're verified, with a correction note at the bottom describing what changed. Minor typos are fixed silently. Scores, times and schedules are updated as events change without correction notes.</p>
<h2>Report an error</h2>
<p>Email <b>ashwin@off-the-tape.com</b> with the article link and the issue. Corrections are typically reviewed same-day.</p>
<h2>Photo and rights requests</h2>
<p>If you own content appearing on OTT (including via embed or link) and want it removed or credited differently, email the same address — removals are processed same-day.</p>` }
};

module.exports = async (req, res) => {
  try {
    const k = String(req.query.k || '').replace(/[^a-z]/g, '');
    const P = PAGES[k];
    if (!P) return res.status(404).send('not found');
    const body = `<main><div class="legal"><span class="kick"><b style="color:var(--red)">●</b> OFF THE TAPE · LEGAL</span><h1>${L.esc(P.t)}</h1>${P.h}<p style="margin-top:26px;color:var(--mut);font-size:12px">Last updated: August 2026.</p></div></main>`;
    L.ok(res, L.page({ title: `${P.t} — OFF THE TAPE`, desc: P.t + ' for Off The Tape.', canonical: `${L.SITE}/legal/${k}`, body }), 3600);
  } catch (e) { L.fail(res, e); }
};
