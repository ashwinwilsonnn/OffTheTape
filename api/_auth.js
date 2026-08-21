// Editor session for THE DESK.
//
// The PIN used to travel in the query string (/approve?pin=1234). That put it in browser
// history, in Vercel's request logs, and — because draft cards link out to huskers.com,
// lovb.com and the rest — in the Referer header those publishers receive. A referrer that
// carries the secret is not something to authenticate against; it is the leak.
//
// So: the PIN is posted once, exchanged for a signed HttpOnly cookie, and never appears in
// a URL again. Everything downstream checks the cookie.
const crypto = require('crypto');

const COOKIE = 'ott_desk';
const DAYS = 30;

// Keyed on the PIN itself, so changing APPROVE_PIN in Vercel invalidates every live session.
// SESSION_SECRET is optional extra entropy; the scheme is sound without it.
function key() {
  return crypto.createHash('sha256')
    .update('ott-desk|v1|' + (process.env.APPROVE_PIN || '') + '|' + (process.env.SESSION_SECRET || ''))
    .digest();
}
const hmac = s => crypto.createHmac('sha256', key()).update(s).digest('base64url');

// Constant-time compare that tolerates unequal lengths (timingSafeEqual throws on those).
function same(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function pinOK(given) {
  const want = process.env.APPROVE_PIN || '';
  if (!want) return false;                 // unconfigured never authenticates
  return same(given, want);
}

function mint() {
  const exp = String(Date.now() + DAYS * 864e5);
  return exp + '.' + hmac(exp);
}

function valid(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const exp = token.slice(0, dot), sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (!same(sig, hmac(exp))) return false;
  return Number(exp) > Date.now();
}

function cookies(req) {
  const out = {};
  for (const part of String((req.headers && req.headers.cookie) || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// The one question every editor surface asks.
const isEditor = req => valid(cookies(req)[COOKIE]);

function setSession(res) {
  const t = mint();
  res.setHeader('Set-Cookie',
    `${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAYS * 24 * 3600}`);
  return t;
}
function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

// CSRF token derived from the session, so it is worthless without the cookie and cannot be
// guessed from the page. Publishing is a POST that must carry both.
const csrfFor = req => hmac('csrf|' + (cookies(req)[COOKIE] || '')).slice(0, 32);
const csrfOK = (req, given) => !!given && same(given, csrfFor(req));

// Vercel parses urlencoded and JSON bodies; this covers the raw-string case too.
function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'object') return b;
  const out = {};
  for (const part of String(b).split('&')) {
    const i = part.indexOf('=');
    if (i > 0) out[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
  }
  return out;
}

module.exports = { COOKIE, pinOK, isEditor, setSession, clearSession, csrfFor, csrfOK, body, cookies, valid, mint };
