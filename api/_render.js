// OFF THE TAPE — page renderers ported from the approved v6-warm prototype.
// The cover, ticker and page markup below is the prototype's own code, moved across
// mechanically (SPA hash links rewritten to real routes, demo fixtures removed) so the
// live site is the prototype rather than a lookalike. Data comes from Supabase.
const D = require('./_data.js');
const { LEAGUES, TEAMS, CONF, CONFORDER, VNL, POLLW, POLLM, STAND_LOVB, STAND_MLV, VNLW, VNLM, CLASSBOARD, COMMITWIRE } = D;

const FP = f => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + f;
const VFLAG = Object.fromEntries(VNL);
const die = "this.classList.add('dead')";
const STAR = '<svg viewBox="0 0 24 24" width="19" height="19"><path d="M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.3 3.6 1.5-7.1-5.4-4.9 7.2-.8z" fill="#0A0A0A"/></svg>';

// Per-request context. Set once at the top of every handler.
let ARTICLES = [], MATCHES = [];
function setCtx(o) { ARTICLES = (o && o.articles) || []; MATCHES = (o && o.matches) || []; }
const art = id => ARTICLES.find(x => x.id === id) || null;

function tlogo(t, px) { return `<img src="${t.img}" alt="" style="width:${px}px;height:${px}px;object-fit:contain" onerror="${die}"><span class="mfb" style="width:${px}px;height:${px}px;background:${t.c1};border-radius:50%;font-size:${Math.round(px * .34)}px">${t.s}</span>`; }
function tlg(t) { return `<span class="tklg"><img src="${t.img}" alt="" onerror="${die}"><span class="mfb" style="background:${t.c1}"></span></span>`; }

// ---------- dates ----------
const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
const p2 = n => String(n).padStart(2, '0');
const ctNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
// "TOMORROW" and "FRI, AUG 21" are the same day. Everything collapses to MM-DD, and the
// label the reader sees is regenerated from that — so it can never go stale on the board.
function normDay(label) {
  const s = String(label || '').toUpperCase().trim();
  const now = ctNow(), fmt = d => p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  let dk = null;
  if (s === 'TODAY' || s === 'TONIGHT') dk = fmt(now);
  else if (s === 'TOMORROW') dk = fmt(new Date(now.getTime() + 864e5));
  else if (s === 'YESTERDAY') dk = fmt(new Date(now.getTime() - 864e5));
  else { const m = s.match(/\b([A-Z]{3})[A-Z]*\.?\s+(\d{1,2})\b/); if (m && MON[m[1]]) dk = p2(MON[m[1]]) + '-' + p2(Number(m[2])); }
  if (!dk) return { dk: s, disp: s };
  const mo = Number(dk.slice(0, 2)), dy = Number(dk.slice(3));
  let y = now.getFullYear(), d = new Date(y, mo - 1, dy);
  if ((d - now) / 864e5 > 200) d = new Date(y - 1, mo - 1, dy);
  if ((now - d) / 864e5 > 200) d = new Date(y + 1, mo - 1, dy);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
  const disp = diff === 0 ? 'TODAY' : diff === 1 ? 'TOMORROW'
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(/,\s/g, ', ');
  return { dk, disp, sort: d.getTime() };
}
function ageLabel(iso) {
  const t = iso ? new Date(iso).getTime() : 0;
  if (!t) return 'TODAY';
  const mins = Math.max(1, Math.round((Date.now() - t) / 6e4));
  if (mins < 60) return mins + 'M AGO';
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return hrs + 'H AGO';
  return Math.round(hrs / 24) + 'D AGO';
}
// Supabase row -> the match shape the prototype's ticker and cards expect.
function toMatch(m) {
  const nd = normDay(m.day_label);
  const done = m.status === 'FINAL';
  const sc = v => (v === null || v === undefined ? undefined : v);
  return {
    day: nd.disp, dk: nd.dk, sort: nd.sort || 0, st: m.status, lg: m.league, lgk: m.league_key,
    net: m.network, live: !!m.live, sets: Array.isArray(m.sets) ? m.sets.join(' · ') : m.sets,
    a: { t: m.a_team, n: m.a_name, sc: sc(m.a_score), w: !!m.a_win },
    b: { t: m.b_team, n: m.b_name, sc: sc(m.b_score), w: done ? !m.a_win : false }
  };
}

/* ================= COVERS ================= */
function photoCov(a,lead){
 const t=a.t1?TEAMS[a.t1]:null;const c=t?t.c1:(a.lgc||'#141414');
 return `<div class="cv" style="background:linear-gradient(135deg,${c},#0A0A0A 170%)">
  <img class="cvph" src="${a.ph.src}" alt="" onerror="${die}">
  <div class="cvscrim"></div>
  <div class="chip">${a.chip}</div>
  <div class="cvcred">${a.ph.cr}</div>
  <div class="gdbar"><div class="m" style="font-size:9px">${a.m}</div></div></div>`;
}
function cov(a,lead){
 if(a.ph)return photoCov(a,lead);
 const F=a.fam;
 if(F==='07a'&&TEAMS[a.t1]&&TEAMS[a.t2]){const A=TEAMS[a.t1],B=TEAMS[a.t2];/* rule: t1 = AWAY on white · t2 = HOME on its own colors */
  const half=(T,x,home)=>`
   <img src="${T.img}" alt="" style="position:absolute;left:${x};top:37%;transform:translate(-50%,-50%);max-height:34%;max-width:27%;object-fit:contain;z-index:3" onerror="${die}">
   <span class="mfb" style="position:absolute;left:${x};top:37%;transform:translate(-50%,-50%);width:50px;height:50px;border-radius:50%;background:${home?T.c2:T.c1};color:${home?T.c1:'#fff'};font-family:'Roboto Slab',serif;font-weight:900;font-size:16px;z-index:3;place-items:center">${T.s}</span>
   <div style="position:absolute;left:${x};top:63%;transform:translateX(-50%);text-align:center;z-index:3;white-space:nowrap">
     <div style="font-family:'Roboto Slab',serif;font-weight:900;font-size:${lead?14:12}px;color:${home?'#FFFFFF':'#0A0A0A'};text-transform:uppercase">${T.n}</div>
     <div class="mono" style="font-size:8px;letter-spacing:.14em;color:${home?'rgba(255,255,255,.72)':'#5a5a5a'};margin-top:2px">${T.rk?'NO. '+T.rk+' · ':''}${T.rec}</div>
   </div>`;
  const homePlate=`<span style="position:absolute;left:75%;top:37%;transform:translate(-50%,-50%);width:${lead?64:56}px;height:${lead?64:56}px;border-radius:12px;background:${B.c2};z-index:2;box-shadow:0 2px 10px rgba(0,0,0,.35)"></span>`;
  return `<div class="cv">
  <div style="position:absolute;inset:0;background:linear-gradient(104deg,#FFFFFF 0 49.35%,#0A0A0A 49.35% 50.65%,${B.c1} 50.65% 100%)"></div>
  <div style="position:absolute;left:0;top:0;width:46%;height:7px;background:${A.c1};z-index:2"></div>
  <div style="position:absolute;right:0;top:0;width:46%;height:7px;background:${B.c2};z-index:2"></div>
  <div class="chip">${a.chip}</div>
  <div class="mono" style="position:absolute;left:6px;bottom:36px;z-index:4;font-size:7px;letter-spacing:.18em;color:#8b8b8b;transform:rotate(-90deg);transform-origin:left bottom">AWAY</div>
  <div class="mono" style="position:absolute;right:6px;bottom:36px;z-index:4;font-size:7px;letter-spacing:.18em;color:rgba(255,255,255,.6);transform:rotate(90deg);transform-origin:right bottom">HOME</div>
  ${homePlate}${half(A,'25%',false)}${half(B,'75%',true)}
  <div class="vsx" style="top:40%;font-size:${lead?17:14}px">VS</div>
  <div class="gdbar"><div class="m" style="font-size:9px">${a.m}</div></div></div>`}
 if(F==='09'&&a.ply){const t=TEAMS[a.t1]||{c1:'#141414',c2:'#262626'};const p=a.ply;
  return `<div class="cv" style="background:linear-gradient(135deg,${t.c1} 0%,#0A0A0A 160%)">
  <div style="position:absolute;right:-14px;top:-40px;font-family:'Roboto Slab',serif;font-weight:900;font-size:${lead?230:180}px;line-height:1;color:rgba(255,255,255,.12)">${p.num}</div>
  <div class="chip">${a.chip}</div>
  ${a.t1?`<div class="pl" style="left:auto;right:12px;top:auto;bottom:52px;transform:none;width:44px;height:44px;box-shadow:none"><img src="${TEAMS[a.t1].img}" alt="" onerror="${die}"><span class="mg" style="font-size:12px">${TEAMS[a.t1].s}</span></div>`:''}
  <div style="position:absolute;left:14px;top:26%"><div class="hl" style="font-size:${lead?38:29}px;line-height:.98">${p.n1}<br>${p.n2}</div>
  <div style="width:44px;height:4px;background:var(--red);margin-top:8px"></div>
  <div class="mono" style="font-size:8.5px;letter-spacing:.16em;color:rgba(255,255,255,.85);margin-top:8px">${p.pos}</div></div>
  <div class="gdbar"><span class="mono" style="font-size:8.5px;letter-spacing:.12em;color:#fff">${p.stats}</span></div></div>`}
 if(F==='08'&&a.src){return `<div class="cv" style="background:#0A0A0A">
  <div style="position:absolute;left:0;top:0;bottom:0;width:8px;background:var(--red)"></div>
  <div style="position:absolute;left:22px;top:13px"><span class="mono" style="display:inline-flex;align-items:center;gap:6px;background:var(--red);color:#fff;font-size:8.5px;letter-spacing:.18em;padding:3px 8px;font-weight:700"><i style="width:6px;height:6px;border-radius:50%;background:#fff;animation:blink 1.1s infinite"></i>BREAKING</span></div>
  <div class="hl" style="position:absolute;left:22px;top:30%;right:80px;font-size:${lead?25:17}px;max-height:48%;overflow:hidden">${a.h}</div>
  <div class="mono" style="position:absolute;left:22px;bottom:12px;font-size:8px;letter-spacing:.13em;color:#8b8b8b">${a.src}</div></div>`}
 if(F==='03'&&a.sets&&a.sets.length){return `<div class="cv" style="background:#0A0A0A">
  <div class="chip">${a.chip}</div>
  <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);text-align:right">
   ${a.sets.map((s,i)=>`<div style="font-family:'Roboto Slab',serif;font-weight:900;font-size:${lead?46:38}px;line-height:.98;color:${i===a.sets.length-1?'var(--red)':(i%2?'#4a4a4a':'#fff')}">${s}</div>`).join('')}</div>
  <div class="mono" style="position:absolute;left:16px;bottom:13px;font-size:8px;letter-spacing:.13em;color:rgba(255,255,255,.6)">${a.m}</div></div>`}
 if(F==='05'&&a.num){return `<div class="cv" style="background:linear-gradient(135deg,${a.lgc||'#8C1D40'},#0A0A0A 170%)">
  <div style="position:absolute;right:-18px;top:-52px;font-family:'Roboto Slab',serif;font-weight:900;font-size:${lead?250:200}px;line-height:1;color:rgba(255,255,255,.15)">${a.num}</div>
  <div class="chip">${a.chip}</div>
  <div class="mono" style="position:absolute;left:14px;bottom:13px;font-size:8px;letter-spacing:.13em;color:rgba(255,255,255,.75)">${a.m}</div></div>`}
 const t=a.t1?TEAMS[a.t1]:null;const c=t?t.c1:(a.lgc||'#141414');
 return `<div class="cv" style="background:linear-gradient(135deg,${c} 0%,#0A0A0A 170%)">
  <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.25" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
   <rect x="70" y="-60" width="500" height="480" fill="none" stroke="#fff" stroke-width="3" transform="rotate(12 320 180)"/>
   <line x1="-40" y1="200" x2="700" y2="130" stroke="#fff" stroke-width="7"/><circle cx="470" cy="96" r="24" fill="#fff"/></svg>
  <div class="chip">${a.chip}</div>
  ${(()=>{const LG=LEAGUES[a.lg];const im=t?t.img:LG.img;const fb=t?t.s:LG.n[0];return im?`<div class="pl" style="left:auto;right:12px;top:auto;bottom:34px;transform:none;width:46px;height:46px;box-shadow:none"><img src="${im}" alt="" onerror="${die}"><span class="mg" style="font-size:13px">${fb}</span></div>`:''})()}
  <div class="mono" style="position:absolute;left:14px;bottom:12px;font-size:8px;letter-spacing:.13em;color:rgba(255,255,255,.75)">${a.m}</div></div>`
}
function acard(a,cls){return `<a class="acard ${cls||''}" href="/news/${a.id}">${cov(a,cls==='lead')}<div class="ttl">${a.h}</div><div class="mt"><b>${a.chip.split('·')[0].trim()}</b> · ${a.m}</div></a>`}

/* ================= TICKER (v5: day left · league+logo right · drag both platforms) ================= */
function tickerHTML(MATCHES){
 let h='';
 MATCHES.forEach(m=>{
  const A=m.a.t?TEAMS[m.a.t]:null,B=m.b.t?TEAMS[m.b.t]:null;
  const an=A?A.s:m.a.n,bn=B?B.s:m.b.n;
  const L=LEAGUES[m.lgk];
  const done=m.st==='FINAL';
  const dayl=m.live?'TODAY · <i class="lvd"></i>LIVE':(m.day+(done?' · FINAL':''));
  h+=`<a class="tkc" href="/scores" draggable="false">
   <span class="tl"><span class="tkdayl ${m.live?'live':''}">${dayl}</span><span class="tklead">${L&&L.img?`<img src="${L.img}" alt="" draggable="false" onerror="${die}">`:''}${m.lg}</span></span>
   <span class="tkbody"><span class="tkteams">
    <span class="rw ${done&&m.a.w?'win':done&&!m.a.w?'los':''}">${A?tlg(A):''}<span>${an}</span>${A&&A.rk?`<span class="rec">NO.${A.rk}</span>`:''}${done?`<span class="sc">${m.a.sc}</span>`:''}</span>
    <span class="rw ${done&&m.b.w?'win':done&&!m.b.w?'los':''}">${B?tlg(B):''}<span>${bn}</span>${B&&B.rk?`<span class="rec">NO.${B.rk}</span>`:''}${done?`<span class="sc">${m.b.sc}</span>`:''}</span>
   </span>${done?'':`<span class="tktime"><b>${m.st}</b>${m.net?`<i>${m.net}</i>`:''}</span>`}</span></a>`});
 return h+h;
}


// ---------- HOME — the prototype's pgHome layout, filled from the database ----------
function nlStrip() {
  return `<div class="nlstrip"><div><div class="slab" style="font-size:19px">THE OTT AM NEWSLETTER 📥</div><div style="color:var(--ink2);font-size:13.5px;margin-top:4px">Every score, trade and rumor — four minutes, every morning of the season.</div></div>
  <div style="flex:1;min-width:280px;max-width:430px"><div class="nlrow"><input id="nse" placeholder="EMAIL ADDRESS" type="email"><button id="nsj">JOIN</button></div><div class="nlok" id="nsk"></div></div></div>`;
}
function pgHome() {
  const by = lg => ARTICLES.filter(a => a.lg === lg);
  const lead = ARTICLES[0];
  if (!lead) return `<span class="kick"><b style="color:var(--red)">●</b> THE HOME OF EVERYTHING VOLLEYBALL</span><p style="color:var(--ink2);margin-top:24px">First stories publish shortly.</p>`;
  // A story shouldn't greet the reader twice in one screen. Sections prefer stories that
  // haven't run higher up the page, and only reuse one if the section would be empty.
  const used = new Set([lead.id]);
  const take = (list, n) => {
    const fresh = list.filter(a => !used.has(a.id)).slice(0, n);
    const out = fresh.length >= n ? fresh : fresh.concat(list.filter(a => a.id !== lead.id && !fresh.includes(a)).slice(0, n - fresh.length));
    out.forEach(a => used.add(a.id));
    return out;
  };
  const rail = take(ARTICLES, 6);
  const most = take(ARTICLES, 8);
  const sec = (ttl, href, label) => `<div class="sect">${ttl} <a class="mr" href="${href}">${label}</a></div>`;
  let h = `<span class="kick"><b style="color:var(--red)">●</b> THE HOME OF EVERYTHING VOLLEYBALL</span>
 <div class="cols"><div>${acard(lead, 'lead')}</div><aside>
  <div class="sect" style="font-size:15px">TOP HEADLINES</div><div class="rail">${rail.map(railItem).join('')}</div>
 </aside></div>`;
  if (most.length) h += `
 <div class="sect">MOST READ 📈 <span class="arrows"><button onclick="mrScroll(-560)" aria-label="back">‹</button><button onclick="mrScroll(560)" aria-label="forward">›</button></span></div>
 <div class="hrow" id="mr">${most.map(a => acard(a, 'sm')).join('')}</div>`;
  const block = (list, ttl, href, label, rev) => {
    if (!list.length) return '';
    const pick = list.filter(a => !used.has(a.id));
    const src = pick.length >= 3 ? pick : list.filter(a => a.id !== lead.id);
    if (!src.length) return '';
    src.slice(0, 3).forEach(a => used.add(a.id));
    const head = sec(ttl, href, label);
    if (src.length > 2) return head + (rev
      ? `<div class="secmod rev"><div class="stack">${src.slice(1, 3).map(a => acard(a, 'sm')).join('')}</div>${acard(src[0])}</div>`
      : `<div class="secmod">${acard(src[0])}<div class="stack">${src.slice(1, 3).map(a => acard(a, 'sm')).join('')}</div></div>`);
    return head + `<div class="grid2">${src.slice(0, 2).map(a => acard(a)).join('')}</div>`;
  };
  h += block(by('ncaaw'), 'NCAA WOMEN', '/hub/ncaaw', 'ALL NCAA W ›', false);
  // the rhythm alternates on purpose — big card left, then big card right
  h += block(by('lovb').concat(by('mlv')), 'PRO VOLLEYBALL', '/hub/lovb', 'ALL PRO ›', true);
  const ncaam = by('ncaam');
  if (ncaam.length) { ncaam.slice(0, 2).forEach(a => used.add(a.id)); h += sec('NCAA MEN', '/hub/ncaam', 'ALL NCAA M ›') + `<div class="grid2">${ncaam.slice(0, 2).map(a => acard(a)).join('')}</div>`; }
  h += nlStrip();
  const bch = by('beach').concat(by('intl'));
  if (bch.length) {
    const fresh = bch.filter(a => !used.has(a.id));
    const row = (fresh.length >= 3 ? fresh : bch.filter(a => a.id !== lead.id)).slice(0, 3);
    row.forEach(a => used.add(a.id));
    h += sec('BEACH + INTERNATIONAL', '/hub/beach', 'MORE ›') + `<div class="grid3">${row.map(a => acard(a, 'sm')).join('')}</div>`;
    const rest = bch.filter(a => !used.has(a.id));
    if (rest.length > 2) { rest.slice(0, 3).forEach(a => used.add(a.id)); h += `<div class="secmod" style="margin-top:20px">${acard(rest[0])}<div class="stack">${rest.slice(1, 3).map(a => acard(a, 'sm')).join('')}</div></div>`; }
  }
  const rec = by('recruit');
  if (rec.length) {
    const rr = rec.slice(1, 4).length ? rec.slice(1, 4) : ARTICLES.filter(a => a.id !== rec[0].id && a.id !== lead.id).slice(0, 3);
    h += sec('RECRUITING', '/hub/recruit', 'ALL RECRUITING ›') + `<div class="reclay"><div class="rail">${rr.map(railItem).join('')}</div>${acard(rec[0])}</div>`;
  }
  return h;
}

function railItem(a){
 const t=a.t1?TEAMS[a.t1]:null;const L=LEAGUES[a.lg];
 const inner=t?`<img src="${t.img}" alt="" onerror="${die}"><span class="mfb" style="background:${t.c1}"></span>`
  :(L.img?`<img src="${L.img}" alt="" onerror="${die}"><span class="mfb" style="background:#262626"></span>`:STAR);
 return `<a href="/news/${a.id}">
  <span class="rlg">${inner}</span>
  <span><span class="h">${a.h}</span><span class="m" style="display:block">${a.chip.split('·')[0].trim()} · ${a.m}</span></span></a>`;
}
function pgHub(k,tab){
 const L=LEAGUES[k];if(!L)return pg404();
 const arts=ARTICLES.filter(a=>a.lg===k);
 let body='';
 const kick=`<span class="kick"><b style="color:var(--red)">●</b> ${L.n.toUpperCase()} · ${L.sub}</span>`;
 if(!tab){
  body=arts.length>2?`<div style="margin-top:18px" class="secmod">${acard(arts[0],'lead')}<div class="stack">${arts.slice(1,3).map(a=>acard(a,'sm')).join('')}</div></div>${arts.length>3?`<div class="grid3" style="margin-top:20px">${arts.slice(3).map(a=>acard(a,'sm')).join('')}</div>`:''}`
   :arts.length?`<div class="grid2" style="margin-top:18px">${arts.map(a=>acard(a)).join('')}</div>`
   :`<p style="color:var(--ink2);margin-top:20px">No stories in this hub yet — the desk fills it every morning.</p>`;
 }else if(tab==='scores'){
  const ms=MATCHES.filter(m=>m.lgk===k);
  body=ms.length?`<div class="grid3" style="margin-top:18px">${ms.map(mcard).join('')}</div>`:`<p style="color:var(--ink2);margin-top:20px;font-size:14px">No ${L.n} matches on the board right now. The board fills from the live feed as the season opens.</p>`;
 }else if(tab==='rankings'){
  if(k==='ncaaw'){body=`<div class="sect" style="font-size:15px;margin-top:20px">AVCA PRESEASON COACHES POLL · AUG 10 <span class="mr" style="color:#9fdd8e">REAL DATA · 63 BALLOTS</span></div><div class="tbwrap"><table class="tb"><tr><th>RK</th><th>TEAM</th><th>PTS</th><th>1ST-PLACE</th></tr>${POLLW.map(([r,id,fp,pts])=>{const t=TEAMS[id];return `<tr><td class="rk">${r}</td><td><a class="tmc" href="/team/${id}">${tlogo(t,22)}${t.n}</a></td><td class="fpv">${pts||'—'}</td><td class="fpv">${fp||'—'}</td></tr>`}).join('')}</table></div><p style="color:var(--mut);font-size:12px;margin-top:10px">Source: AVCA Division I Coaches Poll, Aug 10, 2026 — revealed with the NCAA. 63 first-place ballots (Nebraska 57, Kentucky 4, Texas 1, Texas A&M 1).</p>`}
  else if(k==='ncaam'){body=`<div class="sect" style="font-size:15px;margin-top:20px">AVCA NATIONAL COLLEGIATE MEN — FINAL POLL · MAY 12, 2026 <span class="mr" style="color:#9fdd8e">OFFICIAL · REAL</span></div><div class="tbwrap"><table class="tb"><tr><th>RK</th><th>TEAM</th><th>PTS</th><th>RECORD</th><th>1ST</th></tr>${POLLM.map(([r,id,pts,rec,fp])=>{const t=TEAMS[id];return `<tr><td class="rk">${r}</td><td><a class="tmc" href="/team/${id}">${tlogo(t,22)}${t.n}</a></td><td class="fpv">${pts}</td><td class="fpv">${rec}</td><td class="fpv">${fp||'—'}</td></tr>`}).join('')}</table></div><p style="color:var(--mut);font-size:12px;margin-top:10px">Source: AVCA coaches poll (captured from avca.org). Hawaiʻi finished No. 1 with all 25 first-place votes after beating UC Irvine in the NCAA final.</p>`}
  else if(k==='lovb'){body=`<div class="sect" style="font-size:15px;margin-top:20px">LOVB 2026 — FINAL <span class="mr" style="color:#9fdd8e">REAL · LOVB.COM</span></div><div class="tbwrap"><table class="tb"><tr><th>PL</th><th>TEAM</th><th>FINISH</th></tr>${STAND_LOVB.map(([id,fin],i)=>{const t=TEAMS[id];return `<tr><td class="rk">${i+1}</td><td><a class="tmc" href="/team/${id}">${tlogo(t,22)}${t.n}</a></td><td class="fpv">${fin}</td></tr>`}).join('')}</table></div><p style="color:var(--mut);font-size:12px;margin-top:10px">REAL: regular-season standings per lovb.com; Austin beat Salt Lake in the Championship golden set 15-8 (Apr 18, Long Beach). SF Signal + LA, Miami, Minnesota join for 2027.</p>`}
  else if(k==='mlv'){body=`<div class="sect" style="font-size:15px;margin-top:20px">MLV 2026 — FINAL <span class="mr" style="color:#9fdd8e">REAL · FULL STANDINGS</span></div><div class="tbwrap"><table class="tb"><tr><th>PL</th><th>TEAM</th><th>FINISH</th></tr>${STAND_MLV.map(([id,fin],i)=>{const t=TEAMS[id];return `<tr><td class="rk">${i+1}</td><td><a class="tmc" href="/team/${id}">${tlogo(t,22)}${t.n}</a></td><td class="fpv">${fin}</td></tr>`}).join('')}</table></div>`}
  else if(k==='intl'){const vt=(rows,ttl)=>`<div class="sect" style="font-size:15px;margin-top:20px">${ttl} <span class="mr" style="color:#9fdd8e">REAL</span></div><div class="tbwrap"><table class="tb"><tr><th>PL</th><th>TEAM</th><th>FINISH</th></tr>${rows.map(([n,fin],i)=>`<tr><td class="rk">${i+1}</td><td><span class="tmc">${VFLAG[n]?`<img src="${FP(VFLAG[n])}" alt="" style="width:24px;height:16px;object-fit:cover;border:1px solid #262626" onerror="${die}">`:''}<span class="mfb" style="width:22px;height:22px;font-size:8px;background:#262626">${n.slice(0,2).toUpperCase()}</span>${n}</span></td><td class="fpv">${fin}</td></tr>`).join('')}</table></div>`;
  body=vt(VNLW,'WOMEN’S VNL 2026 — FINAL FOUR')+vt(VNLM,'MEN’S VNL 2026 — FINAL FOUR')+`<p style="color:var(--mut);font-size:12px;margin-top:10px">Vargas: 33 points in the women’s final — most ever in a VNL final. Full tables sync from the FIVB VIS feed.</p>`}
  else if(k==='recruit'){body=`<div class="sect" style="font-size:15px;margin-top:20px">2027 CLASS RANKINGS — THE BOARD <span class="mr" style="color:#9fdd8e">REAL · RANKS CITED PER ROW</span></div><div class="tbwrap"><table class="tb"><tr><th>NATL RK</th><th>RECRUIT</th><th>POS</th><th>HOMETOWN</th><th>STATUS</th><th>RANK SOURCE</th></tr>${CLASSBOARD.map(([r,n,pos,hm,st,tid,srcr])=>`<tr><td class="rk">${r}</td><td style="font-weight:700">${n}</td><td class="fpv">${pos}</td><td class="fpv">${hm}</td><td>${tid?`<span class="tmc">${tlogo(TEAMS[tid],20)}<span style="font-size:11px;font-weight:700">${st}</span></span>`:`<span class="fpv">${st}</span>`}</td><td class="fpv">${srcr}</td></tr>`).join('')}</table></div><p style="color:var(--mut);font-size:12px;margin-top:10px">Ranks: PrepDig public 2027 national list + PrepVolleyball; commitments per SI / Lincoln Journal Star. OTT reports verified public commitments — it does not fabricate rankings.</p>`}
  else{body=`<p style="color:var(--ink2);margin-top:20px;font-size:14px">Rankings publish here weekly in season.</p>`}
 }else if(tab==='teams'){
  if(k==='intl'){body=`<div class="sect" style="font-size:15px;margin-top:20px">VNL 2026 FIELDS <span class="mr">FLAGS — PUBLIC DOMAIN</span></div><div class="tgrid">${VNL.map(([n,f])=>`<span class="tcard" style="--tc:#262626"><span class="lgw"><img src="${FP(f)}" alt="" style="max-height:34px;border:1px solid #262626" onerror="${die}"><span class="mfb" style="background:#262626;font-size:11px">${n.slice(0,2).toUpperCase()}</span></span><span class="n">${n}</span><span class="r">VNL 2026</span></span>`).join('')}</div>`}
  else{body=`<p style="color:var(--ink2);margin-top:20px;font-size:14px">Use the TEAMS dropdown in the bar above.</p>`}
 }else if(tab==='portal'){
  if(k==='recruit'){body=`<div class="sect" style="font-size:15px;margin-top:20px">THE COMMIT WIRE <span class="mr" style="color:#9fdd8e">REAL COMMITMENTS · SOURCED</span></div><div class="rail">${COMMITWIRE.map(([n,pos,tid,srcr])=>`<a href="/hub/recruit"><span class="rlg"><img src="${TEAMS[tid].img}" alt="" onerror="${die}"><span class="mfb" style="background:${TEAMS[tid].c1}"></span></span><span><span class="h">⭐ ${n} → ${TEAMS[tid].n.toUpperCase()}</span><span class="m" style="display:block">${pos} · ${srcr}</span></span></a>`).join('')}</div><div class="sect" style="font-size:15px;margin-top:28px">LATEST</div><div class="grid3">${ARTICLES.filter(a=>a.lg==='recruit').map(a=>acard(a,'sm')).join('')}</div>`}
  else{body=`<div class="sect" style="font-size:15px;margin-top:20px">${L.portal.toUpperCase()} <span class="mr">SOURCED ONLY — EVERY ITEM CARRIES ITS SOURCE</span></div><p style="color:var(--ink2);margin-top:14px;font-size:14px">Nothing on the ${L.portal.toLowerCase()} wire that we can source yet. Items appear here only with a named source attached.</p><div class="grid3" style="margin-top:24px">${arts.slice(0,3).map(a=>acard(a,'sm')).join('')}</div>`}
 }
 return kick+body;
}
function mcard(m){
 const A=m.a.t?TEAMS[m.a.t]:null,B=m.b.t?TEAMS[m.b.t]:null;
 const row=(x,X,l)=>`<div class="tr ${l?'los':''}">${X?tlogo(X,22):''}<span>${X?X.n:x.n}</span><span class="rec">${X&&X.rk?'NO. '+X.rk:''}</span><span class="sc">${x.sc!==undefined?x.sc:''}</span></div>`;
 const done=m.st==='FINAL';
 return `<div class="mcard"><div class="st"><span>${m.lg} · ${m.day}</span><span class="${m.live?'live':''}">${m.live?'● LIVE':m.st}</span></div>
 ${row(m.a,A,done&&!m.a.w)}${row(m.b,B,done&&!m.b.w)}
 ${m.sets?`<div class="sets">${m.sets}</div>`:''}</div>`;
}
function pgScores(){
 let day='';let h=`<span class="kick"><b style="color:var(--red)">●</b> SCORES — NCAA WOMEN LIVE FROM THE FEED · MORE LEAGUES AS THEIR SEASONS OPEN</span><h1 class="pg">SCORES</h1><div class="dnav">${['ALL'].concat([...new Set(MATCHES.map(m=>m.lg))]).map((x,i)=>`<button class="${i===0?'on':''}" onclick="[...this.parentElement.children].forEach(b=>b.classList.remove('on'));this.classList.add('on');document.querySelectorAll('.mwrap .mcard').forEach(c=>c.style.display=(this.textContent==='ALL'||c.dataset.lg===this.textContent)?'flex':'none')">${x}</button>`).join('')}</div><div class="mwrap">`;
 MATCHES.forEach(m=>{
  if(m.day!==day){day=m.day;h+=`<div class="sect" style="margin-top:30px;font-size:15px">${day}<span class="mr">MIDNIGHT CT ROLLOVER</span></div><div class="grid3">`}
  h+=mcard(m).replace('<div class="mcard">',`<div class="mcard" data-lg="${m.lg}">`);
  const idx=MATCHES.indexOf(m);
  if(idx===MATCHES.length-1||MATCHES[idx+1].day!==m.day)h+='</div>';
 });
 return h+'</div>';
}
function pgTeam(id){
 const t=TEAMS[id];if(!t)return pg404();
 const arts=ARTICLES.filter(a=>a.t1===id||a.t2===id);
 return `<div class="teamrail" style="background:${t.c1}"></div>
 <div class="hubslim" style="margin-top:10px"><span style="width:38px;height:38px;display:grid;place-items:center">${tlogo(t,34)}</span><h1>${t.n}</h1><span class="r">${LEAGUES[t.lg].n.toUpperCase()} ${t.rk?'· NO. '+t.rk+' AVCA':''} · ${t.rec}</span></div>
 ${arts.length?`<div class="grid3" style="margin-top:20px">${arts.map(a=>acard(a,'sm')).join('')}</div>`:`<p style="color:var(--ink2);margin-top:18px;font-size:14px">Every article tagged ${t.s} lands here automatically.</p>`}`;
}
// ---------- native embeds (EMBED STANDARD) ----------
// Returns the blockquotes plus whichever platform scripts they need, deduped.
function embedsHTML(embeds) {
  if (!embeds || !embeds.length) return '';
  const parts = [], scr = new Set();
  for (const e of embeds) {
    if (!e || !e.url) continue;
    const u = String(e.url);
    if (e.platform === 'x' || /twitter\.com|x\.com/.test(u)) {
      parts.push(`<blockquote class="twitter-tweet" data-theme="dark"><a href="${u}"></a></blockquote>`);
      scr.add('<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>');
    } else if (e.platform === 'instagram' || /instagram\.com/.test(u)) {
      parts.push(`<blockquote class="instagram-media" data-instgrm-permalink="${u}" data-instgrm-version="14"></blockquote>`);
      scr.add('<script async src="https://www.instagram.com/embed.js"><\/script>');
    } else if (e.platform === 'tiktok' || /tiktok\.com/.test(u)) {
      parts.push(`<blockquote class="tiktok-embed" cite="${u}"><a href="${u}"></a></blockquote>`);
      scr.add('<script async src="https://www.tiktok.com/embed.js"><\/script>');
    } else {
      parts.push(`<p><a href="${u}" target="_blank" rel="noopener">↗ ${e.context || u}</a></p>`);
    }
  }
  if (!parts.length) return '';
  return parts.map(p => `<div class="emb">${p}</div>`).join('') + [...scr].join('');
}
function pgArticle(id){
 const a=art(id);if(!a)return pg404();
 const rel=ARTICLES.filter(x=>x.lg===a.lg&&x.id!==id).slice(0,3);
 const hrs=ageLabel(a.created_at);
 const para=p=>/^Grade:\s/.test(p)?`<p class="grade">${p}</p>`:`<p>${p.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}</p>`;
 let flow='';
 if(a.sections){
  a.sections.forEach((s,i)=>{
   if(s.h2)flow+=`<h2>${s.h2}</h2>`;
   flow+=s.paras.map(para).join('');
   if(i===0&&a.pull)flow+=`<div class="pullq"><span class="big">${a.pull.big}</span><span class="lbl">${a.pull.label}</span></div>`;
  });
 }else{flow=(a.body||[]).map(para).join('')}
 const srcs=a.sources&&a.sources.length
  ?`<div class="srcs"><div class="t">SOURCES — EVERY CLAIM CITED</div>${a.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener">↗ ${s.name}</a>`).join('')}</div>`
  :(a.src?`<div class="src">${a.src}</div>`:'');
 const hero = a.ph && a.ph.link
  ? `<a href="${a.ph.link}" target="_blank" rel="noopener" title="View the original post">${cov(a,true)}</a>`
  : cov(a,true);
 return `<div class="abody">${hero}
 <h1>${a.h}</h1>
 ${a.dek?`<p class="dek">${a.dek}</p>`:''}
 <div class="byl">OFF THE TAPE STAFF · <b>${a.chip}</b> · ${hrs}${a.ph?` · ${a.ph.cr}`:''}</div>
 ${flow}
 ${embedsHTML(a.embeds)}
 ${srcs}
 <div class="tagrow"><a href="/hub/${a.lg}">${LEAGUES[a.lg].n.toUpperCase()}</a>${a.t1?`<a href="/team/${a.t1}">${TEAMS[a.t1].n.toUpperCase()}</a>`:''}${a.t2?`<a href="/team/${a.t2}">${TEAMS[a.t2].n.toUpperCase()}</a>`:''}</div>
 <div class="finep">Off The Tape uses AI-assisted production; every article is reviewed and approved before publication. Corrections: ashwin@off-the-tape.com${a.ph?` · Photo: ${a.ph.cr}`:''}</div>
 ${rel.length?`<div class="sect" style="margin-top:34px;font-size:16px">MORE ${LEAGUES[a.lg].n.toUpperCase()}</div><div class="grid3">${rel.map(x=>acard(x,'sm')).join('')}</div>`:''}</div>`;
}
function pgNews(){
 return `<div class="nlbox">
 <span class="kick"><b style="color:var(--red)">●</b> THE OTT AM NEWSLETTER</span>
 <h1>FOUR MINUTES.<br>ALL OF VOLLEYBALL.</h1>
 <p class="sub">Every score, trade and rumor — in your inbox every morning of the season. Free.</p>
 <div class="nlrow"><input id="nse" placeholder="YOUR@EMAIL.COM" type="email"><button id="nsj">SIGN UP</button></div>
 <div class="nlok" id="nsk"></div>
 <p class="consent">You must be 13 or older to subscribe. By signing up you agree to receive updates and offers from Off The Tape and you accept our <a href="/legal/terms">Terms of Use</a> and <a href="/legal/privacy">Privacy Policy</a>. Unsubscribe any time via the link in every email. We currently have no affiliate or betting partners.</p>
 </div>`;
}
function pgAbout(){
 return `<div class="legal"><span class="kick"><b style="color:var(--red)">●</b> OFF THE TAPE</span><h1 class="pg">ABOUT</h1>
 <p style="margin-top:16px">OFF THE TAPE is the independent home of everything volleyball — NCAA women and men, LOVB, MLV, the AVP tour and the international game — covered daily with live scores, sourced reporting and the film-room eye the sport deserves.</p>
 <p>We aggregate in our own words and credit every source. Photography is used with permission or under license, and credited on every image.</p>
 <h2>CONTACT</h2><p>ashwin@off-the-tape.com — tips, corrections, media and partnership inquiries welcome.</p></div>`;
}
function pg404(){return `<div style="text-align:center;padding:60px 0"><div class="slab" style="font-size:60px;color:var(--ln)">404</div><p class="mono" style="font-size:10px;letter-spacing:.2em;color:var(--mut)">OUT OF BOUNDS — <a href="/" style="color:var(--red)">BACK HOME</a></p></div>`}

module.exports = {
  setCtx, art, toMatch, normDay, ageLabel, tlogo, tlg, die, STAR, FP, VFLAG,
  cov, photoCov, acard, railItem, mcard, tickerHTML, nlStrip, embedsHTML,
  pgHome, pgHub, pgScores, pgTeam, pgArticle, pgNews, pgAbout, pg404
};
