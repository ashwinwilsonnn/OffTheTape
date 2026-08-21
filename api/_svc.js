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
// it will publish — same escaping, same cover shape, same photo contract.
function normalise(rows) {
  return rows.map(a => ({
    ...a,
    hRaw: a.h || '',
    dekRaw: a.dek || '',
    h: L.esc(a.h), dek: a.dek ? L.esc(a.dek) : '', chip: L.esc(a.chip || ''), m: L.esc(a.meta || ''),
    src: a.src ? L.esc(a.src) : '',
    body: typeof a.body === 'string' ? JSON.parse(a.body) : a.body,
    lg: a.league, t1: a.t1 || null, t2: a.t2 || null,
    ph: a.photo_url ? { src: a.photo_url, cr: L.esc(a.photo_credit || ''), link: a.photo_link || null } : null
  }));
}

const safeId = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');

async function byStatus(status) {
  return normalise(await svcGet(`articles?select=*&status=eq.${encodeURIComponent(status)}&order=created_at.desc`));
}

// One row by id, whatever its status. Callers must have already proved they are the editor.
async function anyById(id) {
  const clean = safeId(id);
  if (!clean) return null;
  const rows = await svcGet(`articles?select=*&id=eq.${encodeURIComponent(clean)}&limit=1`);
  return rows.length ? normalise(rows)[0] : null;
}

module.exports = { svcGet, normalise, byStatus, anyById, safeId };
