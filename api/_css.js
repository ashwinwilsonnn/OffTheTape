// OFF THE TAPE — warm grade production CSS (single source)
module.exports = `
:root{--k0:#171614;--k1:#201E1B;--ln:#312E2A;--w:#F6F2EA;--red:#FF1F3D;--ink2:#B3ADA2;--mut:#7D776C}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--k0);color:#E7E2D8;font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%}
.mono{font-family:'JetBrains Mono',monospace}
/* header */
header{position:sticky;top:0;z-index:60;background:rgba(23,22,20,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--ln)}
.hwrap{max-width:1140px;margin:0 auto;padding:14px 16px 10px;text-align:center}
.bm{font-family:'Roboto Slab',serif;font-weight:900;font-size:22px;color:var(--w);letter-spacing:.01em}
.bm s{text-decoration-color:var(--red);text-decoration-thickness:3px}
.bm i{color:var(--red);font-style:normal}
.qn{display:flex;gap:18px;justify-content:center;margin-top:9px;overflow-x:auto;scrollbar-width:none}
.qn::-webkit-scrollbar{display:none}
.qn a{font-weight:800;font-size:11px;letter-spacing:.12em;color:var(--ink2);white-space:nowrap;padding:2px 0}
.qn a:hover{color:var(--w)}
/* ticker */
.tick{background:var(--k1);border-bottom:1px solid var(--ln);overflow-x:auto;overflow-y:hidden;height:74px;cursor:grab;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.tick::-webkit-scrollbar{display:none}.tick.dragging{cursor:grabbing}
.tkt{display:inline-flex;height:100%}
.tkc{display:inline-flex;flex-direction:column;justify-content:center;gap:3px;padding:8px 19px;border-right:1px solid var(--ln);min-width:218px;white-space:nowrap;user-select:none}
.tkhead{display:flex;justify-content:space-between;align-items:center;gap:14px}
.tkdayl{font-weight:800;font-size:8.5px;letter-spacing:.08em;color:#C9C3B8}.tkdayl b{color:var(--red)}
.tklgl{font-weight:800;font-size:8.5px;letter-spacing:.08em;color:var(--mut)}
.tkrow{display:flex;justify-content:space-between;align-items:center;gap:10px}
.tkteam{display:flex;align-items:center;gap:6px;font-weight:700;font-size:11.5px}
.tkteam img{width:14px;height:14px;object-fit:contain;background:#fff;border-radius:3px;padding:1px}
.tkteam.w{color:var(--w)}.tkteam.l{color:var(--mut)}
.tks{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;color:var(--w)}.tks.l{color:var(--mut)}
.tktime{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:10.5px;color:var(--w);text-align:right;line-height:1.25}
.tktime span{display:block;font-family:Inter;font-weight:800;font-size:8px;letter-spacing:.1em;color:var(--mut)}
img.dead{display:none}
.mfb{display:none}
/* layout */
main{max-width:1140px;margin:0 auto;padding:24px 16px 60px}
.kick{font-weight:800;font-size:10px;letter-spacing:.14em;color:var(--ink2);text-transform:uppercase}
.sect{display:flex;align-items:baseline;justify-content:space-between;font-family:'Roboto Slab',serif;font-weight:900;font-size:18px;text-transform:uppercase;color:var(--w);border-bottom:2px solid var(--red);padding-bottom:7px;margin:34px 0 16px}
.sect a{font-family:Inter;font-weight:800;font-size:10px;letter-spacing:.12em;color:var(--mut)}
.sect a:hover{color:var(--w)}
.cols{display:grid;grid-template-columns:1.9fr 1fr;gap:26px;margin-top:18px}
@media(max-width:860px){.cols{grid-template-columns:1fr}}
.rail a{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--ln);align-items:flex-start}
.rail .rlg{flex:none;width:30px;height:30px;background:#fff;border-radius:6px;display:grid;place-items:center;padding:3px}
.rail .rlg img{max-width:100%;max-height:100%;object-fit:contain}
.rail .h{font-family:'Roboto Slab',serif;font-weight:900;font-size:13px;line-height:1.3;color:var(--w);text-transform:uppercase;display:block}
.rail .m{display:block;font-size:9px;letter-spacing:.08em;font-weight:700;color:var(--mut);text-transform:uppercase;margin-top:3px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media(max-width:860px){.grid2,.grid3{grid-template-columns:1fr}}
.secmod{display:grid;grid-template-columns:1.5fr 1fr;gap:20px}
.secmod.rev{grid-template-columns:1fr 1.5fr}
.secmod .stack{display:grid;gap:20px;align-content:start}
@media(max-width:860px){.secmod,.secmod.rev{grid-template-columns:1fr}}
/* covers + cards */
.cv{aspect-ratio:16/9;position:relative;overflow:hidden;background:var(--k1);border-radius:8px}
.cvph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
.cvph.dead{display:none}
.cvscrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,22,20,.25),rgba(23,22,20,0) 42%,rgba(23,22,20,.62));z-index:2}
.cvph.dead~.cvscrim{display:none}
.cvph.dead~.cvcred{display:none}
.cvcred{position:absolute;right:10px;bottom:34px;font-weight:600;font-size:7.5px;letter-spacing:.05em;color:rgba(255,255,255,.9);background:rgba(23,22,20,.6);padding:2px 7px;z-index:5;border-radius:3px}
.chip{position:absolute;left:10px;top:10px;z-index:5;background:#171614;color:#F6F2EA;font-weight:800;font-size:8.5px;letter-spacing:.13em;padding:4px 8px;text-transform:uppercase;border-radius:3px}
.gdbar{position:absolute;left:0;right:0;bottom:0;background:rgba(23,22,20,.82);padding:6px 12px;z-index:4}
.gdbar .m{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#C9C3B8}
.vsx{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-family:'Roboto Slab',serif;font-weight:900;font-size:15px;color:#fff;background:#171614;border:2px solid rgba(255,255,255,.4);padding:4px 10px;z-index:4}
.bignum{position:absolute;right:-18px;top:-40px;font-family:'Roboto Slab',serif;font-weight:900;font-size:170px;line-height:1;color:rgba(255,255,255,.14)}
.cvmeta{position:absolute;left:12px;bottom:12px;font-size:8px;letter-spacing:.13em;color:rgba(246,242,234,.75)}
.cvlg{position:absolute;right:12px;bottom:32px;width:46px;height:46px;background:#fff;border-radius:9px;display:grid;place-items:center;padding:6px;z-index:3}
.cvlg img{max-width:100%;max-height:100%;object-fit:contain}
.acard{display:block}
.acard:hover .ttl{color:var(--red)}
.acard .ttl{font-family:'Roboto Slab',serif;font-weight:900;font-size:16px;line-height:1.28;color:var(--w);text-transform:uppercase;margin-top:10px;transition:color .15s}
.acard.lead .ttl{font-size:clamp(20px,3vw,28px)}
.acard.sm .ttl{font-size:13.5px}
.acard .mt{font-size:9.5px;letter-spacing:.07em;font-weight:700;color:var(--mut);text-transform:uppercase;margin-top:6px}
.acard .mt b{color:var(--red)}
/* article */
.abody{max-width:760px;margin:0 auto}
.abody .cv{margin:16px 0 0;aspect-ratio:16/8}
.abody h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(24px,4vw,36px);line-height:1.08;text-transform:uppercase;color:var(--w);margin:16px 0 8px}
.abody .dek{font-size:18px;line-height:1.55;color:var(--ink2);font-weight:500;margin:0 0 16px}
.abody .byl{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mut);border-bottom:1px solid var(--ln);padding-bottom:14px;margin-bottom:18px}
.abody .byl b{color:var(--red)}
.abody p{font-size:16px;line-height:1.75;color:#DCD6CB;margin:0 0 18px}
.abody h2{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(18px,2.6vw,23px);line-height:1.15;text-transform:uppercase;color:var(--w);margin:30px 0 12px;padding-top:18px;border-top:1px solid var(--ln)}
.abody p.grade{font-family:'Roboto Slab',serif;font-weight:900;font-size:19px;text-transform:uppercase;color:var(--red);margin:2px 0 22px}
.pullq{display:flex;flex-direction:column;gap:6px;background:var(--k1);border-left:4px solid var(--red);padding:18px 22px;margin:26px 0;border-radius:0 8px 8px 0}
.pullq .big{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(34px,6vw,52px);line-height:.95;color:var(--w)}
.pullq .lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mut)}
.emb{margin:20px 0;display:flex;justify-content:center}
.srcs{margin:24px 0 0;border-left:3px solid var(--red);padding:6px 0 6px 12px}
.srcs .t{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mut);margin-bottom:6px}
.srcs a{display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ink2);padding:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.srcs a:hover{color:var(--w)}
.tagrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
.tagrow a{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;border:1px solid var(--ln);padding:5px 10px;color:var(--ink2);border-radius:4px}
.tagrow a:hover{border-color:var(--red);color:var(--w)}
.finep{margin-top:26px;padding-top:12px;border-top:1px solid var(--ln);font-size:10.5px;line-height:1.6;color:var(--mut)}
.finep a{text-decoration:underline}
/* tables */
.tbwrap{overflow-x:auto}
.tb{width:100%;border-collapse:collapse;font-size:12.5px}
.tb th{text-align:left;font-size:9px;letter-spacing:.12em;font-weight:800;color:var(--mut);text-transform:uppercase;padding:8px 10px;border-bottom:1px solid var(--ln);white-space:nowrap}
.tb td{padding:9px 10px;border-bottom:1px solid var(--ln);white-space:nowrap}
.tb .rk{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--red);width:34px}
.tb .tmc{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--w)}
.tb .tmc img{width:18px;height:18px;object-fit:contain;background:#fff;border-radius:4px;padding:2px}
.tb .fpv{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--ink2)}
.srcnote{margin-top:9px;font-size:10.5px;color:var(--mut)}
/* scores */
.mcard{background:var(--k1);border:1px solid var(--ln);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:7px}
.mcard .st{display:flex;justify-content:space-between;font-weight:800;font-size:8.5px;letter-spacing:.1em;color:var(--mut);text-transform:uppercase}
.mcard .tr{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;color:var(--w)}
.mcard .tr.los{color:var(--mut)}
.mcard .tr img{width:20px;height:20px;object-fit:contain;background:#fff;border-radius:4px;padding:2px}
.mcard .sc{margin-left:auto;font-family:'JetBrains Mono',monospace;font-weight:700}
.mcard .sets{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--mut);letter-spacing:.06em}
/* hub/team */
.hubhd{margin-top:16px}
.hubhd h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(24px,4vw,34px);text-transform:uppercase;color:var(--w)}
.hubhd .sub{font-size:10px;letter-spacing:.14em;font-weight:800;color:var(--mut);text-transform:uppercase;margin-top:4px}
.tabs{display:flex;gap:16px;border-bottom:1px solid var(--ln);margin-top:14px}
.tabs a{font-weight:800;font-size:11px;letter-spacing:.1em;color:var(--mut);padding:8px 2px;border-bottom:2px solid transparent}
.tabs a.on{color:var(--w);border-color:var(--red)}
.teamrail{height:6px;border-radius:3px;margin-top:16px}
/* newsletter + legal + approve */
.nlstrip{display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--k1);border:1px solid var(--ln);border-radius:10px;padding:22px 24px;margin:36px 0}
.nlstrip .slab{font-family:'Roboto Slab',serif;font-weight:900;font-size:19px;text-transform:uppercase;color:var(--w)}
.nlstrip .nlsub{color:var(--ink2);font-size:13.5px;margin-top:4px}
.nlrow{display:flex;gap:10px;flex:1;min-width:280px;max-width:430px}
.nlrow input{flex:1;background:var(--k0);border:1px solid var(--ln);color:var(--w);font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px 14px;outline:none;min-width:0;border-radius:6px}
.nlrow input:focus{border-color:var(--red)}
.nlrow button{background:var(--red);color:#fff;font-family:'Roboto Slab',serif;font-weight:900;text-transform:uppercase;font-size:13px;padding:0 22px;letter-spacing:.04em;border:none;border-radius:6px;cursor:pointer}
.legal{max-width:760px;margin:0 auto}
.legal h1{font-family:'Roboto Slab',serif;font-weight:900;font-size:clamp(22px,4vw,30px);text-transform:uppercase;color:var(--w);margin:20px 0 6px}
.legal h2{font-family:'Roboto Slab',serif;font-weight:900;font-size:16px;text-transform:uppercase;color:var(--w);margin:26px 0 8px}
.legal p,.legal li{color:#DCD6CB;font-size:14.5px;line-height:1.7}
.legal ul{margin:8px 0 8px 20px}
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
.warnbox{background:#2A1114;border:1px solid #5C1B24;color:#FFB4BE;padding:12px 16px;border-radius:8px;font-size:13px;margin:14px 0}
/* footer */
footer{border-top:1px solid var(--ln);margin-top:50px}
.fwrap{max-width:1140px;margin:0 auto;padding:28px 16px 40px;text-align:center}
footer nav{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:14px 0}
footer nav a{font-weight:800;font-size:9.5px;letter-spacing:.12em;color:var(--mut)}
footer nav a:hover{color:var(--w)}
footer p{font-size:10px;color:var(--mut);line-height:1.7;max-width:620px;margin:0 auto}
`;
