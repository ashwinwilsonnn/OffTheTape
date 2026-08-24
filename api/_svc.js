// Service-role reads. RLS on `articles` only exposes published rows to the publishable key,
// and `desk_log` has no public policy at all — so anything editor-facing reads through here.
// Shared by the desk and by the gated draft preview on /news/<slug>, which is what keeps a
// draft looking exactly like the page it will become.
const L = require('./_lib.js');

const SUPA_URL = process.env.SUPABASE_URL || 'https://vnxbpijpurnizvyeezza.supabase.co';

async function svcGet(path) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — the desk cannot read drafts without it');
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

// The same normalisation getArticles() does for public pages, so a draft previews exactly as
// it will publish — same escaping, same cover shape, same photo contract. It IS the same
// function now: the draft preview at /news/<slug> renders through the public renderer, so if
// this escaped less than getArticles() did, the editor's own preview would be the one page on
// the site where injected script ran. escArticle() also exposes hRaw/dekRaw/chipRaw and
// bodyRaw/sectionsRaw/sourcesRaw, which is what the editor's textareas and the rewrite diff
// read — those need the real characters, not the display form.
const normalise = rows => rows.map(L.escArticle);

const safeId = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');

async function byStatus(status) {
  return normalise(await svcGet(`articles?select=*&status=eq.${encodeURIComponent(status)}&order=created_at.desc`));
}

// Articles carrying a staged rewrite. `pending` is never read by any public surface, so a
// desk can rewrite live prose into it without a word of that reaching a reader — the editor
// applies it or drops it on /approve. This is what lets the back catalogue be reworked
// without ever putting unreviewed text on the site.
async function withPending() {
  return normalise(await svcGet('articles?select=*&pending=not.is.null&order=pending_at.desc'));
}

// One row by id, whatever its status. Callers must have already proved they are the editor.
async function anyById(id) {
  const clean = safeId(id);
  if (!clean) return null;
  const rows = await svcGet(`articles?select=*&id=eq.${encodeURIComponent(clean)}&limit=1`);
  return rows.length ? normalise(rows)[0] : null;
}

module.exports = { svcGet, normalise, byStatus, withPending, anyById, safeId };
