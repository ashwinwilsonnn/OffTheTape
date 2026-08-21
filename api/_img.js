// Which photo hosts go through Vercel's image pipeline.
//
// This list lives in its own file, and must match images.remotePatterns in vercel.json —
// the render harness asserts that the two agree. Keeping it here means adding a publisher
// is a two-small-file change instead of touching the 34KB renderer.
//
// Verified against the live /_vercel/image endpoint rather than assumed:
//   avp.com, www.lovb.com, images.volleyballworld.com, worldofvolley.com  →  optimise
//   huskers.com (/imgproxy/…)                                             →  optimise
//   storage.googleapis.com                                                →  400, always,
//     even scoped to a single bucket path. Vercel will not allowlist Google Cloud Storage.
//
// The way around that last one: Nebraska, Kentucky and ProVolleyball all self-host imgproxy
// at <publisher>/imgproxy/<sig>/<opts>/<base64 of the bucket URL>. Same file, pre-shrunk,
// on a host Vercel will take. The signature covers the size options, so we can only use the
// exact variants their own pages publish — no minting new sizes — but 1980px q90 beats the
// full press original by an order of magnitude before Vercel even touches it.
const IMG_HOSTS = [
  'avp.com',
  'www.lovb.com',
  'images.volleyballworld.com',
  'worldofvolley.com',
  'huskers.com'
];

function imgHostOK(src) {
  try { return IMG_HOSTS.includes(new URL(src).hostname); } catch (e) { return false; }
}

// Publisher originals are press-sized: the AVP cover is a 2560px WordPress "-scaled.jpg",
// Volleyball World serves a full Cloudinary transform. We were shipping megabytes to fill a
// 250px card. Anything not on the list passes through untouched rather than 400ing, so a new
// publisher still renders — just unoptimised.
function optImg(src, w, q) {
  if (!src || /^data:/.test(src) || !imgHostOK(src)) return src;
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=${q || 75}`;
}

// One failure falls back to the publisher's original; a second failure hides the image and
// its credit line (the .dead rule), which is what the covers already did.
const IMGFB = "if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb='';}else{this.classList.add('dead')}";

module.exports = { IMG_HOSTS, imgHostOK, optImg, IMGFB };
