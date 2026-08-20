// Shared Supabase REST helper (server-side, Vercel Node functions)
const SUPA_URL = process.env.SUPABASE_URL || 'https://vnxbpijpurnizvyeezza.supabase.co';
// Publishable (anon) key — safe to ship; RLS limits reads to published/public rows.
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_7nPuBBPSepoRVRmsEkF4pg_85fVHXUZ';

async function supaGet(path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

async function supaWrite(path, method, body, serviceKey) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`supabase write ${r.status}: ${await r.text()}`);
  return true;
}

function ok(res, data, maxAge) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', `s-maxage=${maxAge || 60}, stale-while-revalidate=300`);
  res.status(200).json(data);
}
function fail(res, e) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(500).json({ error: String(e && e.message || e) });
}

module.exports = { supaGet, supaWrite, ok, fail, SUPA_URL };
