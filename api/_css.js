// OFF THE TAPE — the full v6-warm stylesheet, ported byte-exact from the approved
// prototype, plus the rules the PIN-gated approval queue needs. Kept as plain CSS in a
// template literal rather than an encoded blob, so any drift shows up in a diff.
module.exports = `:root{--k0:#0A0A0A;--k1:#141414;--ln:#262626;--w:#FFFFFF;--red:#FF1F3D;--ink2:#A6A6A6;--mut:#6E6E6E}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--k0);color:var(--w);font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{max-width:100%}
.slab{font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase}
.mono{font-family:'JetBrains Mono',monospace}
button{font-family:inherit;background:none;border:none;color:inherit;cursor:pointer;padding:0}

/* ============ HEADER (v2: centered brand + quick nav) ============ */
header{position:sticky;top:0;z-index:60;background:rgba(10,10,10,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--ln)}
.hb{max-width:1240px;margin:0 auto;height:56px;display:flex;align-items:center;gap:14px;padding:0 16px;position:relative}
.burger{width:40px;height:40px;display:flex;flex-direction:column;justify-content:center;gap:5px;flex:none}
.burger span{display:block;width:22px;height:2px;background:var(--w);transition:.25s;margin-left:9px}
.burger:hover span:nth-child(2){width:15px;background:var(--red)}
.brand{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:10px;white-space:nowrap}
.bicon{position:relative;width:34px;height:34px;flex:none}
.bicon svg{display:block}
.bword{font-family:'Roboto Slab',serif;font-weight:900;font-size:16.5px;letter-spacing:.02em;white-space:nowrap}
.bword .tp{position:relative;display:inline-block}
.bword .tp i{position:absolute;left:-8%;right:-8%;top:46%;height:3px;background:var(--red);transform:rotate(-1.2deg);border-radius:1px}
.hsp{flex:1}
.schbtn{width:40px;height:40px;display:grid;place-items:center;flex:none}
.schbtn svg{transition:.2s}
.schbtn:hover svg{stroke:var(--red)}
.proto{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.16em;color:var(--mut);border:1px solid var(--ln);padding:3px 7px;flex:none}
.qn{display:flex;gap:4px;justify-content:center;overflow-x:auto;padding:0 16px;scrollbar-width:none}
.qn::-webkit-scrollbar{display:none}
.qn a{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.15em;color:var(--ink2);padding:9px 12px 11px;border-bottom:2px solid transparent;white-space:nowrap;transition:color .15s}
.qn a:hover{color:#fff}
.qn a.on{color:#fff;border-color:var(--red)}
.schwrap{position:absolute;left:0;right:0;top:100%;background:var(--k1);border-bottom:1px solid var(--ln);padding:14px 16px;display:none}
.schwrap.on{display:block;animation:dropin .22s ease}
.schin{max-width:720px;margin:0 auto;position:relative}
.schin input{width:100%;background:var(--k0);border:1px solid var(--ln);color:var(--w);font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.06em;padding:11px 14px;outline:none}
.schin input:focus{border-color:var(--red)}
.schres{max-width:720px;margin:8px auto 0}
.schres a{display:block;padding:9px 12px;border:1px solid var(--ln);border-top:none;font-size:13.5px;background:var(--k0)}
.schres a:first-child{border-top:1px solid var(--ln)}
.schres a:hover{background:#181818;color:#fff}
.schres a b{color:var(--red)}
.schres .non{padding:9px 12px;color:var(--mut);font-size:12.5px;font-family:'JetBrains Mono',monospace}
@keyframes dropin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes fadein{from{opacity:0}to{opacity:1}}

/* ============ TICKER (v5: native scroll + drag; auto-drift via JS) ============ */
.tick{background:var(--k1);border-bottom:1px solid var(--ln);overflow-x:auto;overflow-y:hidden;position:relative;height:70px;cursor:grab;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.tick::-webkit-scrollbar{display:none}
.tick.dragging{cursor:grabbing}
.tktrack{display:flex;align-items:stretch;height:100%;width:max-content}
.tkc{display:flex;flex-direction:column;justify-content:center;gap:4px;padding:8px 19px;border-right:1px solid var(--ln);min-width:218px;white-space:nowrap;transition:background .15s;user-select:none}
.tkc:hover{background:#1c1c1c}
.tkc .tl{display:flex;justify-content:space-between;align-items:center;gap:14px}
.tkdayl{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:8.5px;letter-spacing:.08em;color:#C9C9C9}
.tkdayl.live{color:var(--red)}
.tkdayl .lvd{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--red);margin:0 3px 1px 2px;animation:blink 1.1s infinite}
.tklead{display:inline-flex;align-items:center;gap:5px;font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:8.5px;letter-spacing:.06em;color:var(--mut)}
.tklead img{width:14px;height:14px;object-fit:contain;background:#fff;border-radius:3px;padding:1px}
.tkbody{display:flex;align-items:center;gap:12px}
.tkteams{display:flex;flex-direction:column;gap:2px;flex:1}
.tkc .rw{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600}
.tkc .rw .tklg{width:16px;height:16px;display:grid;place-items:center;flex:none}
.tkc .rw .tklg img{max-width:16px;max-height:16px;object-fit:contain}
.tkc .rw .tklg .mfb{width:12px;height:12px;border-radius:50%;font-size:0;padding:0;display:none}
.tkc .rw .tklg img.dead{display:none}
.tkc .rw .tklg img.dead+.mfb{display:block}
.tkc .rw .rec{color:var(--mut);font-size:9px;font-family:'JetBrains Mono',monospace}
.tkc .rw .sc{font-family:'JetBrains Mono',monospace;font-weight:700;margin-left:auto}
.tkc .rw.los{color:var(--ink2)}.tkc .rw.los .sc{color:var(--mut)}
.tktime{text-align:right;line-height:1.25}
.tktime b{display:block;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;color:#fff}
.tktime i{display:block;font-style:normal;font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:8px;letter-spacing:.06em;color:var(--mut)}
@keyframes blink{50%{opacity:.15}}

/* ============ PANEL ============ */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:70;opacity:0;pointer-events:none;transition:.25s}
.ov.on{opacity:1;pointer-events:auto}
.panel{position:fixed;top:0;bottom:0;left:0;width:340px;max-width:88vw;background:var(--k1);border-right:1px solid var(--ln);z-index:80;transform:translateX(-102%);transition:transform .28s cubic-bezier(.3,.7,.3,1);display:flex;flex-direction:column}
.panel.on{transform:none}
.ph{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--ln);flex:none}
.ph .t{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.22em;color:var(--mut)}
.px{width:34px;height:34px;display:grid;place-items:center;font-size:17px;color:var(--ink2)}
.px:hover{color:var(--red)}
.pbody{flex:1;overflow-y:auto;position:relative}
.plist{position:absolute;inset:0;padding:8px 0;overflow-y:auto;transition:transform .26s ease,opacity .26s ease}
.plist.off-l{transform:translateX(-30%);opacity:0;pointer-events:none}
.plist.off-r{transform:translateX(30%);opacity:0;pointer-events:none}
.pit{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 18px;font-family:'Roboto Slab',serif;font-weight:900;font-size:15px;letter-spacing:.02em;text-transform:uppercase;border-bottom:1px solid #1d1d1d;opacity:0;transform:translateX(-10px);animation:pin .3s forwards}
.pit:hover{background:#191919;color:#fff}
.pit .ar{margin-left:auto;color:var(--mut);font-size:12px;transition:.15s}
.pit:hover .ar{color:var(--red);transform:translateX(3px)}
.plt{width:32px;height:32px;background:#fff;border-radius:6px;display:grid;place-items:center;padding:4px;flex:none}
.plt img{max-width:100%;max-height:100%;object-fit:contain}
.plt .mfb{width:22px;height:22px;border-radius:50%;background:#262626;font-size:8px;font-family:'Roboto Slab',serif;color:#fff;display:none;place-items:center}
.plt img.dead{display:none}
.plt img.dead+.mfb{display:grid}
@keyframes pin{to{opacity:1;transform:none}}
.pback{display:flex;align-items:center;gap:8px;padding:12px 18px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.18em;color:var(--ink2);width:100%;text-align:left;border-bottom:1px solid var(--ln)}
.pback:hover{color:var(--red)}
.psub{padding:6px 0}
.psub .pit{font-size:13.5px;padding:11px 18px}
.pfoot{flex:none;border-top:1px solid var(--ln);padding:14px 16px}
.nlbtn{display:block;width:100%;background:var(--red);color:#fff;font-family:'Roboto Slab',serif;font-weight:900;font-size:14px;letter-spacing:.04em;text-transform:uppercase;text-align:center;padding:12px;transition:.15s}
.nlbtn:hover{background:#ff4560}
.pfoot .row{display:flex;gap:16px;justify-content:center;margin-top:11px}
.pfoot .row a{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:var(--mut)}
.pfoot .row a:hover{color:var(--w)}

/* ============ LAYOUT ============ */
main{max-width:1240px;margin:0 auto;padding:22px 16px 70px;animation:pgin .3s ease}
@keyframes pgin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.kick{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.2em;color:var(--mut);text-transform:uppercase}
.kick b{color:var(--red);font-weight:700}
h1.pg{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(24px,3.6vw,38px);line-height:1.02;margin:8px 0 4px;text-transform:uppercase}
.cols{display:grid;grid-template-columns:2.05fr 1fr;gap:30px;margin-top:18px}
.cols>*{min-width:0}
@media(max-width:860px){.cols{grid-template-columns:1fr}}
/* v2 B/R-style section header: bold title top-left, no rule, generous space */
.sect{font-family:'Roboto Slab',serif;font-weight:900;font-size:19px;letter-spacing:.02em;text-transform:uppercase;margin:46px 0 16px;display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.sect:first-child,.cols .sect{margin-top:0}
.sect .mr{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mut);font-weight:400;white-space:nowrap}
.sect .mr:hover{color:var(--red)}
.sect .arrows{display:flex;gap:8px}
.sect .arrows button{width:30px;height:30px;border:1px solid var(--ln);border-radius:50%;color:var(--ink2);font-size:13px;display:grid;place-items:center;transition:.15s}
.sect .arrows button:hover{color:#fff;border-color:#3a3a3a}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
@media(max-width:900px){.grid3{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.grid3{grid-template-columns:1fr}}
/* B/R module: lead left + stacked smalls right */
.secmod{display:grid;grid-template-columns:1.65fr 1fr;gap:22px}
.secmod>*{min-width:0}
.secmod .stack{display:flex;flex-direction:column;gap:18px}
@media(max-width:860px){.secmod{grid-template-columns:1fr}}
/* MOST READ carousel */
.hrow{display:flex;gap:16px;overflow-x:auto;scroll-behavior:smooth;padding-bottom:6px;scrollbar-width:none}
.hrow::-webkit-scrollbar{display:none}
.hrow .acard{min-width:250px;max-width:250px;flex:none}

/* v2 borderless B/R-style article cards */
.acard{display:block;transition:transform .18s ease}
.acard:hover{transform:translateY(-3px)}
.acard .cv{border-radius:10px}
.acard .ttl{font-family:'Roboto Slab',serif;font-weight:900;font-size:15.5px;line-height:1.18;text-transform:uppercase;padding:10px 2px 3px}
.acard:hover .ttl{color:#fff}
.acard.sm .ttl{font-size:13.5px}
.acard .mt{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.14em;color:var(--mut);padding:0 2px 6px}
.acard .mt b{color:var(--red);font-weight:700}
.lead .ttl{font-size:clamp(18px,2.4vw,24px)}
/* headline rail with logo chips (B/R Top Headlines) */
.rail a{display:flex;gap:11px;align-items:center;padding:10px 0;border-bottom:1px solid #1d1d1d}
.rail .rlg{width:30px;height:30px;border-radius:6px;background:#fff;display:grid;place-items:center;padding:3px;flex:none}
.rail .rlg.nb{background:#1d1d1d}
.rail .rlg img{max-width:100%;max-height:100%;object-fit:contain}
.rail .rlg .mfb{width:20px;height:20px;border-radius:50%;font-size:0;display:none}
.rail .rlg img.dead{display:none}
.rail .rlg img.dead+.mfb{display:block}
.rail .rlg .dot{width:10px;height:10px;border-radius:50%;background:var(--red)}
.rail a .h{font-family:'Roboto Slab',serif;font-weight:900;font-size:13.5px;line-height:1.2;text-transform:uppercase}
.rail a:hover .h{color:#fff}
.rail a .m{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.13em;color:var(--mut);margin-top:2px}
.tnum{font-family:'Roboto Slab',serif;font-weight:900;color:var(--ln);font-size:24px;line-height:1;min-width:34px}
.trend a{display:flex;gap:10px;align-items:baseline;padding:9px 0;border-bottom:1px solid #1d1d1d}
.trend a:hover .tnum{color:var(--red)}
.trend .h{font-size:13.5px;font-weight:600}

/* covers (no watermark in v2) */
.cv{aspect-ratio:16/9;position:relative;overflow:hidden;background:var(--k0)}
.cv .chip{position:absolute;top:12px;left:12px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.15em;color:#fff;background:rgba(10,10,10,.72);border:1px solid rgba(255,255,255,.25);padding:3px 8px;z-index:5}
.cv .hl{font-family:'Roboto Slab',serif;font-weight:900;line-height:1.02;color:#fff;text-transform:uppercase}
.pl{position:absolute;transform:translate(-50%,-50%);border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 5px 20px rgba(0,0,0,.4);z-index:3}
.pl img{max-width:72%;max-height:72%;display:block}
.pl .mg{display:none;font-family:'Roboto Slab',serif;font-weight:900;color:#0A0A0A;align-items:center;justify-content:center}
.pl img.dead{display:none}
.pl img.dead+.mg{display:flex}
.vsx{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);font-family:'Roboto Slab',serif;font-weight:900;color:#fff;background:#0A0A0A;border:2px solid rgba(255,255,255,.4);padding:4px 10px;z-index:4}
.gdbar{position:absolute;left:0;right:0;bottom:0;background:rgba(10,10,10,.93);padding:8px 13px 9px;z-index:4}
.gdbar .h{font-family:'Roboto Slab',serif;font-weight:900;font-size:14.5px;text-transform:uppercase;line-height:1.05}
.lead .gdbar .h{font-size:18px}
.gdbar .m{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.13em;color:#8b8b8b;margin-top:3px}
.tmn{position:absolute;transform:translateX(-50%);text-align:center;font-family:'Roboto Slab',serif;font-weight:900;color:#fff;z-index:3;white-space:nowrap;text-transform:uppercase}
.tmn em{display:block;font-style:normal;font-family:'JetBrains Mono',monospace;font-weight:400;letter-spacing:.13em;color:rgba(255,255,255,.82);margin-top:2px}

/* hub */
.hubhero{display:flex;align-items:center;gap:16px;background:var(--k1);border:1px solid var(--ln);padding:18px;margin-top:14px}
.hubhero .lg{width:62px;height:62px;display:grid;place-items:center;background:#fff;flex:none;padding:8px;border-radius:8px}
.hubhero .lg img{max-width:100%;max-height:100%;object-fit:contain}
.hubhero h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(20px,3vw,30px);margin:0;text-transform:uppercase;line-height:1}
.hubhero .sub{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mut);margin-top:5px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--ln);margin-top:16px;overflow-x:auto}
.tabs a{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;padding:10px 15px;color:var(--ink2);border-bottom:2px solid transparent;white-space:nowrap}
.tabs a.on{color:#fff;border-color:var(--red)}
.tabs a:hover{color:#fff}

/* teams grid + team page */
.tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:16px}
.tcard{background:var(--k1);border:1px solid var(--ln);padding:16px 10px 12px;text-align:center;transition:transform .16s,border-color .16s;position:relative}
.tcard:hover{transform:translateY(-3px);border-color:#3a3a3a}
.tcard:before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--tc,#262626)}
.tcard .lgw{height:52px;display:grid;place-items:center;margin-bottom:9px}
.tcard img{max-height:48px;max-width:74%;object-fit:contain}
.tcard .mfb{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:'Roboto Slab',serif;font-weight:900;font-size:15px;color:#fff;margin:0 auto}
.tcard .n{font-family:'Roboto Slab',serif;font-weight:900;font-size:12.5px;text-transform:uppercase;line-height:1.1}
.tcard .r{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--mut);letter-spacing:.12em;margin-top:4px}
.mfb{display:none}
img.dead{display:none}
img.dead+.mfb{display:grid}

/* tables */
table.tb{width:100%;border-collapse:collapse;margin-top:14px;font-size:13.5px}
.tb th{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.16em;color:var(--mut);text-align:left;font-weight:400;padding:7px 10px;border-bottom:1px solid var(--ln)}
.tb td{padding:9px 10px;border-bottom:1px solid #1d1d1d}
.tb tr:hover td{background:#161616}
.tb .rk{font-family:'Roboto Slab',serif;font-weight:900;color:var(--ink2);width:34px}
.tb tr:nth-child(-n+3) .rk{color:var(--red)}
.tb .tmc{display:flex;align-items:center;gap:9px;font-weight:600}
.tb .tmc img{width:22px;height:22px;object-fit:contain}
.tb .tmc .mfb{width:22px;height:22px;border-radius:50%;font-size:9px;display:none;place-items:center;font-family:'Roboto Slab',serif;font-weight:900}
.tb .tmc img.dead{display:none}
.tb .tmc img.dead+.mfb{display:grid}
.tb .fpv{color:var(--mut);font-family:'JetBrains Mono',monospace;font-size:10px}

/* scores page */
.dnav{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.dnav button,.dnav a{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;padding:8px 13px;border:1px solid var(--ln);color:var(--ink2)}
.dnav .on{border-color:var(--red);color:#fff}
.mcard{background:var(--k1);border:1px solid var(--ln);padding:13px 15px;display:flex;flex-direction:column;gap:7px}
.mcard .st{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.15em;color:var(--mut);display:flex;justify-content:space-between}
.mcard .st .live{color:var(--red);font-weight:700}
.mcard .tr{display:flex;align-items:center;gap:9px;font-weight:600;font-size:14.5px}
.mcard .tr img{width:22px;height:22px;object-fit:contain}
.mcard .tr .mfb{width:22px;height:22px;border-radius:50%;font-size:9px;place-items:center;font-family:'Roboto Slab',serif}
.mcard .tr img.dead+.mfb{display:grid}
.mcard .tr .rec{color:var(--mut);font-size:9.5px;font-family:'JetBrains Mono',monospace}
.mcard .tr .sc{margin-left:auto;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:15px}
.mcard .tr.los{color:var(--ink2)}.mcard .tr.los .sc{color:var(--mut)}
.mcard .sets{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--mut);letter-spacing:.1em;border-top:1px solid #1f1f1f;padding-top:7px}

/* article page */
.abody{max-width:760px;margin:0 auto}
.abody .cv{margin:16px 0 0;border-radius:10px}
.abody h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(24px,4vw,36px);line-height:1.05;text-transform:uppercase;margin:16px 0 8px}
.abody .byl{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mut);border-bottom:1px solid var(--ln);padding-bottom:14px;margin-bottom:18px}
.abody .byl b{color:var(--red)}
.abody p{font-size:16px;line-height:1.75;color:#E8E8E8;margin:0 0 18px}
.abody .dek{font-size:18px;line-height:1.55;color:#BDBDBD;font-weight:500;margin:0 0 16px;border:none}
.abody h2{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(18px,2.6vw,23px);line-height:1.15;text-transform:uppercase;margin:30px 0 12px;padding-top:18px;border-top:1px solid var(--ln)}
.abody p.grade{font-family:'Roboto Slab',serif;font-weight:900;font-size:19px;text-transform:uppercase;color:var(--red);margin:2px 0 22px}
.pullq{display:flex;flex-direction:column;gap:6px;background:var(--k1);border-left:4px solid var(--red);padding:18px 22px;margin:26px 0}
.pullq .big{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(34px,6vw,52px);line-height:.95;color:#fff}
.pullq .lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mut)}
.srcs{margin:24px 0 0;border-left:3px solid var(--red);padding:6px 0 6px 12px}
.srcs .t{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mut);margin-bottom:6px}
.srcs a{display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ink2);padding:2px 0;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.srcs a:hover{color:#fff}
.finep{margin-top:26px;padding-top:12px;border-top:1px solid var(--ln);font-size:10.5px;line-height:1.6;color:#6E6E6E}
.abody .src{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--mut);border-left:3px solid var(--red);padding:4px 0 4px 12px;margin:22px 0}
.tagrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
.tagrow a{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;border:1px solid var(--ln);padding:5px 10px;color:var(--ink2)}
.tagrow a:hover{border-color:var(--red);color:#fff}

/* newsletter page + legal */
.nlbox{max-width:640px;margin:30px auto;background:var(--k1);border:1px solid var(--ln);padding:34px 30px}
.nlbox h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:28px;text-transform:uppercase;margin:0 0 6px;line-height:1.05}
.nlbox .sub{color:var(--ink2);font-size:14.5px;margin-bottom:20px}
.nlrow{display:flex;gap:10px}
.nlrow input{flex:1;background:var(--k0);border:1px solid var(--ln);color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px 14px;outline:none;min-width:0}
.nlrow input:focus{border-color:var(--red)}
.nlrow button{background:var(--red);color:#fff;font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;font-size:13px;padding:0 22px;letter-spacing:.04em}
.consent{font-size:11.5px;color:var(--mut);line-height:1.6;margin-top:14px}
.consent a{color:var(--ink2);text-decoration:underline}
.consent a:hover{color:#fff}
.nlok{background:#12210f;border:1px solid #2d5f23;color:#9fdd8e;font-family:'JetBrains Mono',monospace;font-size:11px;padding:12px 14px;margin-top:14px;display:none}
.legal{max-width:760px;margin:0 auto}
.legal h2{font-family:'Roboto Slab',serif;font-weight:900;font-size:16px;text-transform:uppercase;margin:26px 0 8px}
.legal p{color:#D8D8D8;font-size:14.5px;line-height:1.7}
.draft{background:#241d0d;border:1px solid #7a5c1d;color:#c9a227;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;padding:10px 13px;margin-top:16px}

/* NEWSLETTER POPUP (v2) */
.nlov{position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:90;display:none;align-items:center;justify-content:center;padding:18px}
.nlov.on{display:flex;animation:fadein .25s ease}
.nlpop{background:var(--k0);border:1px solid var(--ln);border-bottom:4px solid var(--red);max-width:520px;width:100%;padding:40px 34px 26px;text-align:center;position:relative;animation:popin .3s ease}
@keyframes popin{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.nlx{position:absolute;top:12px;right:14px;font-size:17px;color:var(--ink2);width:32px;height:32px}
.nlx:hover{color:var(--red)}
.nlic{display:flex;justify-content:center;margin-bottom:16px}
.nlh{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(21px,3vw,27px);line-height:1.08;text-transform:uppercase}
.nls{color:var(--ink2);font-size:14.5px;margin:10px 0 20px}
.nlpop input{width:100%;background:var(--k1);border:1px solid var(--ln);color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;padding:13px 14px;outline:none;text-align:center}
.nlpop input:focus{border-color:var(--red)}
.nlj{display:block;width:100%;background:var(--red);color:#fff;font-family:'Roboto Slab',serif;font-weight:900;font-size:14px;letter-spacing:.05em;text-transform:uppercase;padding:13px;margin-top:12px;transition:.15s}
.nlj:hover{background:#ff4560}
.nlno{display:inline-block;margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--ink2);text-decoration:underline;letter-spacing:.06em}
.nlno:hover{color:#fff}
.nlfine{font-size:10.5px;color:var(--mut);line-height:1.6;margin:18px 0 0;text-align:center}
.nlfine a{color:var(--ink2);text-decoration:underline}
.nlfine a:hover{color:#fff}
.nlokp{display:none;background:#12210f;border:1px solid #2d5f23;color:#9fdd8e;font-family:'JetBrains Mono',monospace;font-size:10.5px;padding:10px 12px;margin-top:12px}

/* colors registry */
.crow{display:flex;align-items:center;gap:12px;background:var(--k1);border:1px solid var(--ln);padding:10px 13px}
.crow .sw{display:flex;gap:5px}
.crow .sw i{width:26px;height:26px;border:1px solid rgba(255,255,255,.18)}
.crow .n{font-family:'Roboto Slab',serif;font-weight:900;font-size:12.5px;text-transform:uppercase;flex:1;line-height:1.1}
.crow .hx{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--mut);letter-spacing:.06em}
.crow .vf{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.12em;padding:2px 6px;border:1px solid}
.crow .vf.y{color:#9fdd8e;border-color:#2d5f23}
.crow .vf.n{color:#c9a227;border-color:#7a5c1d}

/* footer */
footer{border-top:1px solid var(--ln);background:var(--k1);margin-top:40px}
.fb{max-width:1240px;margin:0 auto;padding:26px 16px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between}
.fl{display:flex;gap:16px;flex-wrap:wrap}
.fl a{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:var(--mut)}
.fl a:hover{color:#fff}
.fcopy{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--mut);letter-spacing:.1em}

@media(max-width:480px){.hb{gap:8px;padding:0 12px}.proto{display:none}.bword{font-size:13.5px}.bicon{width:28px;height:28px}.bicon svg{width:28px;height:28px}}
.secmod.rev{grid-template-columns:1fr 1.65fr}
.nlstrip{background:var(--k1);border:1px solid var(--ln);padding:24px 26px;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:46px}
.reclay{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}
.reclay>*{min-width:0}
@media(max-width:860px){.reclay{grid-template-columns:1fr}.secmod.rev{grid-template-columns:1fr}.secmod.rev .stack{order:2}}
.pl2h{display:flex;align-items:center;gap:11px;padding:13px 18px;border-bottom:1px solid var(--ln);font-family:'Roboto Slab',serif;font-weight:900;font-size:16px;text-transform:uppercase}
.pconf{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.18em;color:var(--mut);padding:12px 18px 5px}
.ptmlbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.2em;color:var(--ink2);padding:14px 18px 2px;border-top:1px solid var(--ln);margin-top:10px;font-weight:700}
.ptm{display:flex;align-items:center;gap:10px;padding:7px 18px;font-size:13.5px;font-weight:600;border-bottom:1px solid #1a1a1a}
.ptm:hover{background:#191919;color:#fff}
.ptm .plt{width:26px;height:26px;padding:3px;border-radius:5px}
/* ===== v4: readable label typography (Inter bold caps replaces letterspaced mono for LABELS; mono stays for scores/data) ===== */
.kick{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:11.5px;letter-spacing:.09em;color:#C9C9C9}
.pconf{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:10px;letter-spacing:.07em;color:#8E8E8E}
.ptmlbl{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:10.5px;letter-spacing:.09em;color:#CFCFCF}
.ph .t{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:10px;letter-spacing:.12em}
.chip{font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:8.5px;letter-spacing:.06em}
.proto{font-family:Inter,system-ui,sans-serif;font-weight:700;letter-spacing:.1em}
.qn a,.qn button{font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.07em;color:var(--ink2);padding:9px 12px 11px;border-bottom:2px solid transparent;white-space:nowrap;transition:color .15s;display:inline-flex;align-items:center;gap:6px}
.qn a:hover,.qn button:hover{color:#fff}
.qn a.on,.qn button.on{color:#fff;border-color:var(--red)}
.qn .qlg{font-weight:800;font-size:11.5px;gap:8px}
.qn .qlg img{width:20px;height:20px;object-fit:contain;background:#fff;border-radius:4px;padding:2px}
.sect .mr{font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:9.5px;letter-spacing:.07em}
.tkday{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:9.5px;letter-spacing:.1em}
.acard .mt,.rail a .m{font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:9px;letter-spacing:.05em}
.dnav button,.dnav a{font-family:Inter,system-ui,sans-serif;font-weight:700;letter-spacing:.07em}
.abody .byl{font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:10.5px;letter-spacing:.05em}
.tb th{font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:9px;letter-spacing:.08em}
:focus-visible{outline:2px solid var(--red);outline-offset:2px}
/* ===== v4: TEAMS mega-dropdown (B/R pattern) ===== */
.tdd{position:absolute;left:0;right:0;top:100%;background:#0D0D0D;border-bottom:1px solid var(--ln);box-shadow:0 18px 40px rgba(0,0,0,.5);display:none;z-index:55;max-height:70vh;overflow-y:auto}
.tdd.on{display:block;animation:dropin .2s ease}
.tddw{max-width:1080px;margin:0 auto;padding:22px 20px 26px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px 34px}
@media(max-width:760px){.tddw{grid-template-columns:1fr}}
.tddc{break-inside:avoid}
.tddc .pconf{padding:10px 0 6px}
.tddc .ptm{padding:7px 4px;border-bottom:none;border-radius:6px}
/* ===== v4: photo covers ===== */
.cvph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
.cvph.dead{display:none}
.cvscrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,10,.22),rgba(10,10,10,0) 42%,rgba(10,10,10,.6));z-index:2}
.cvph.dead~.cvcred{display:none}
.cvcred{position:absolute;right:10px;bottom:34px;font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:7.5px;letter-spacing:.05em;color:rgba(255,255,255,.85);background:rgba(10,10,10,.55);padding:2px 7px;z-index:5;border-radius:3px}
/* ===== v4: slim continuous page tops ===== */
.hubslim{display:flex;align-items:center;gap:10px;margin:2px 0 4px}
.hubslim h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(19px,2.6vw,26px);margin:0;text-transform:uppercase;line-height:1}
.hubslim .r{font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:10px;letter-spacing:.06em;color:var(--mut)}
.teamrail{height:4px;border-radius:2px;width:56px}
.tbwrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.tbwrap .tb th,.tbwrap .tb td{white-space:nowrap}
.tddx{position:absolute;top:10px;right:14px;width:34px;height:34px;display:grid;place-items:center;font-size:15px;color:var(--ink2);z-index:2}
.tddx:hover{color:var(--red)}
.nlpop{max-height:92vh;overflow-y:auto}
@media(max-width:700px){.qn{-webkit-mask-image:linear-gradient(90deg,#000 0,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 0,#000 88%,transparent);justify-content:flex-start}}
@media(prefers-reduced-motion:reduce){
    .tkc .tl .st.live i,.pit{animation:none;opacity:1;transform:none}
  main{animation:none}
  html{scroll-behavior:auto}
  .nlov.on,.nlpop{animation:none}
}
/* WARM GRADE — outwittcreations-style: dark grey (not black) + soft warm white (not pure) */
:root{--k0:#171614;--k1:#201E1B;--ln:#312E2A;--w:#F6F2EA;--ink2:#B3ADA2;--mut:#7D776C}
body{background:var(--k0);color:#E7E2D8}
.abody p{color:#DCD6CB}
.abody .dek{color:#B3ADA2}
.ovl p{color:#DCD6CB}
header{background:rgba(23,22,20,.94)!important}

/* ---- editor surfaces: the PIN-gated approval queue, kept out of the public grade ---- */
.hubhd{margin-top:16px}
.hubhd h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(24px,4vw,34px);text-transform:uppercase;color:var(--w)}
.hubhd .sub{font-size:10px;letter-spacing:.14em;font-weight:800;color:var(--mut);text-transform:uppercase;margin-top:4px}
.apr{max-width:820px;margin:0 auto}
.apr .card{background:var(--k1);border:1px solid var(--ln);border-radius:10px;padding:16px 18px;margin:14px 0}
.apr .card h3{font-family:'Roboto Slab',serif;font-weight:900;font-size:16px;text-transform:uppercase;color:var(--w)}
.apr .meta{font-size:10px;letter-spacing:.08em;color:var(--mut);text-transform:uppercase;margin:6px 0 10px}
.apr .dk{color:var(--ink2);font-size:13.5px;margin-bottom:12px}
.apr .btns{display:flex;gap:10px}
.apr .btns a{font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;font-size:12px;padding:9px 16px;border-radius:6px}
.apr .pub{background:#1d5c2e;color:#d9f2df}
.apr .rej{background:#5C1B24;color:#FFD9DE}
.apr input[type=password],.apr input[type=text]{background:var(--k0);border:1px solid var(--ln);color:var(--w);font-family:'JetBrains Mono',monospace;padding:12px 14px;border-radius:6px;width:220px}
.apr button{background:var(--red);color:#fff;font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;padding:11px 20px;border:none;border-radius:6px;cursor:pointer}
.notice{background:#132a17;border:1px solid #2d5f23;color:#9fdd8e;padding:12px 16px;border-radius:8px;font-size:13px;margin:14px 0}
.warnbox{background:#2A1114;border:1px solid #5C1B24;color:#FFB4BE;padding:12px 16px;border-radius:8px;font-size:13px;margin:14px 0}`;
