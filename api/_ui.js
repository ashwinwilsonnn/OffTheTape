// OFF THE TAPE — client-side chrome: ticker drag, slide-in panel, teams dropdown,
// search over the embedded index, newsletter signup (real POST to /api/subscribe).
// Written as an ordinary function and serialised with toString() at require time, so the
// browser payload stays plain readable JavaScript in the repo — diffable, no escaping games.
function ui() {
var $=function(s){return document.querySelector(s)};
var die="this.classList.add('dead')";

/* ---------- TICKER ----------
   A finger is not a mouse. The old version ran an auto-scroll loop and a scroll handler that
   rewrote scrollLeft to fake an infinite loop — and on iOS, writing scrollLeft while a flick
   or its momentum is in flight cancels the gesture outright. That is why the ticker felt dead
   on a phone: every swipe was being killed mid-flick by the site's own code.
   On a touch screen it is now a plain native scroller: one copy of the cards, no auto-scroll,
   nothing ever writes scrollLeft. Desktop keeps the drag and the endless loop. */
(function(){
 var tk=$('#tick'),tr=$('#tkt');
 if(!tk||!tr)return;
 var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 var touch=matchMedia('(hover: none) and (pointer: coarse)').matches;

 if(touch){
  // The track ships doubled so the desktop loop can wrap seamlessly. With no loop to feed,
  // the second copy is just the same scores again — drop it so a swipe reaches a real end.
  var kids=tr.children,n=kids.length/2;
  if(n>=1&&n===Math.floor(n))for(var i=kids.length-1;i>=n;i--)tr.removeChild(kids[i]);
  tk.style.cursor='auto';
  return;                       // no loop, no wrap, no scrollLeft writes. Native momentum only.
 }

 var auto=!rm,tmr=null,drag=false,sx=0,sl=0,moved=0;
 var half=function(){return tr.scrollWidth/2};
 function loop(){if(auto&&!drag){tk.scrollLeft+=0.55;if(tk.scrollLeft>=half())tk.scrollLeft-=half()}requestAnimationFrame(loop)}
 var pause=function(){auto=false;clearTimeout(tmr);tmr=setTimeout(function(){if(!rm)auto=true},3000)};
 tk.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return pause();drag=true;moved=0;sx=e.clientX;sl=tk.scrollLeft;tk.classList.add('dragging');pause()});
 addEventListener('pointermove',function(e){if(drag){var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));tk.scrollLeft=sl-dx}});
 addEventListener('pointerup',function(){if(drag){drag=false;tk.classList.remove('dragging');pause()}});
 tk.addEventListener('click',function(e){if(moved>8){e.preventDefault();e.stopPropagation();moved=0}},true);
 tk.addEventListener('wheel',pause,{passive:true});
 tk.addEventListener('scroll',function(){if(tk.scrollLeft>=half())tk.scrollLeft-=half();else if(tk.scrollLeft<=0&&half()>0)tk.scrollLeft+=half()});
 requestAnimationFrame(loop);
})();

/* ---------- SLIDE-IN PANEL (server-rendered levels, JS only slides them) ---------- */
var panel=$('#panel'),ov=$('#ov');
function pL1(){var a=$('#pl1'),b=$('#pl2');if(!a||!b)return;a.classList.remove('off-l');b.classList.add('off-r');
 [].forEach.call(document.querySelectorAll('.pl2'),function(n){n.classList.add('off-r')})}
function pL2(k){var a=$('#pl1'),b=$('#pl2');if(!a||!b)return;
 [].forEach.call(document.querySelectorAll('.pl2'),function(n){n.style.display=n.getAttribute('data-k')===k?'block':'none'});
 a.classList.add('off-l');b.classList.remove('off-r')}
function pOpen(){if(!panel)return;panel.classList.add('on');ov.classList.add('on');pL1()}
function pClose(){if(!panel)return;panel.classList.remove('on');ov.classList.remove('on')}
window.pL1=pL1;window.pL2=pL2;window.pClose=pClose;
if($('#bg'))$('#bg').onclick=pOpen;
if($('#px'))$('#px').onclick=pClose;
if(ov)ov.onclick=pClose;

/* ---------- TEAMS DROPDOWN (content server-rendered, hidden until toggled) ---------- */
var tdd=$('#tdd');
function tddClose(){if(!tdd)return;tdd.classList.remove('on');var b=$('#tddbtn');if(b)b.classList.remove('on')}
function tddToggle(){if(!tdd)return;var on=tdd.classList.toggle('on');var b=$('#tddbtn');if(b)b.classList.toggle('on',on)}
window.tddClose=tddClose;window.tddToggle=tddToggle;

/* ---------- SEARCH over the index the server embedded ---------- */
var sb=$('#sb'),sw=$('#sw'),si=$('#si'),sr=$('#sr');
function sClose(){if(sw)sw.classList.remove('on');if(sr)sr.innerHTML=''}
if(sb)sb.onclick=function(){if(!sw)return;var on=sw.classList.toggle('on');if(on&&si)si.focus();else sClose()};
if(si)si.oninput=function(){
 var q=si.value.trim().toLowerCase();
 if(!sr)return;
 if(q.length<2){sr.innerHTML='';return}
 var IDX=(window.OTT&&window.OTT.idx)||{a:[],t:[]};
 var teams=IDX.t.filter(function(t){return t.n.toLowerCase().indexOf(q)>=0}).slice(0,6);
 var arts=IDX.a.filter(function(a){return a.h.toLowerCase().indexOf(q)>=0}).slice(0,6);
 var h='';
 if(teams.length)h+='<div class="shd">TEAMS</div>'+teams.map(function(t){
  return '<a href="/team/'+t.i+'"><b>'+t.n+'</b><i>'+t.l+'</i></a>'}).join('');
 if(arts.length)h+='<div class="shd">STORIES</div>'+arts.map(function(a){
  return '<a href="/news/'+a.i+'"><b>'+a.h+'</b><i>'+a.c+'</i></a>'}).join('');
 sr.innerHTML=h||'<div class="shd">NOTHING MATCHES</div>';
};

/* ---------- NEWSLETTER (popup + inline strip; both POST for real) ---------- */
function join(inp,out){
 var e=inp&&inp.value?inp.value.trim():'';
 if(!out)return;
 out.textContent='…';
 fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e})})
  .then(function(r){return r.json()})
  .then(function(d){out.textContent=d.message||(d.ok?'You are in.':'That did not work.');
   if(d.ok){try{localStorage.setItem('ott_nl','1')}catch(x){}if(inp)inp.value=''}})
  .catch(function(){out.textContent='Network hiccup — try again.'});
}
var nsj=$('#nsj');if(nsj)nsj.onclick=function(){join($('#nse'),$('#nsk'))};
var nlj=$('#nlj');if(nlj)nlj.onclick=function(){join($('#nlpe'),$('#nlokp'))};

/* ---------- NEWSLETTER POPUP: once per visitor, and only after they have read a little ---------- */
(function(){
 var ov2=$('#nlov');if(!ov2)return;
 var seen=false;try{seen=localStorage.getItem('ott_nl')==='1'}catch(x){seen=true}
 if(seen){ov2.remove();return}
 var fired=false;
 function show(){if(fired)return;fired=true;ov2.classList.add('on')}
 function dismiss(){ov2.classList.remove('on');try{localStorage.setItem('ott_nl','1')}catch(x){}}
 var nlx=$('#nlx');if(nlx)nlx.onclick=dismiss;
 var nlno=$('#nlno');if(nlno)nlno.onclick=dismiss;
 ov2.addEventListener('click',function(e){if(e.target===ov2)dismiss()});
 setTimeout(show,25000);
 addEventListener('scroll',function(){if(scrollY>1200)show()},{passive:true});
})();

/* ---------- MOST READ arrows ---------- */
window.mrScroll=function(d){var e=$('#mr');if(e)e.scrollBy({left:d,behavior:'smooth'})};

/* ---------- ESC closes whatever is open ---------- */
addEventListener('keydown',function(e){
 if(e.key!=='Escape')return;
 pClose();tddClose();sClose();
 var n=$('#nlov');if(n)n.classList.remove('on');
});
}
module.exports = '(' + ui.toString() + ')();';
