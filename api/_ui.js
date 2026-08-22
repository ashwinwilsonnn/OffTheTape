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
function tddToggle(){if(!tdd)return;if(tdd.classList.contains('on'))return tddClose();
 tdd.classList.add('on');var b=$('#tddbtn');if(b)b.classList.add('on')}
window.tddClose=tddClose;window.tddToggle=tddToggle;

/* ---------- SEARCH over a compact server-embedded index ---------- */
var sw=$('#sw'),si=$('#si'),sr=$('#sr'),sb=$('#sb');
var IDX=(window.OTT&&window.OTT.idx)||{a:[],t:[]};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
if(sb&&sw&&si&&sr){
 sb.onclick=function(){sw.classList.toggle('on');if(sw.classList.contains('on'))si.focus();else sr.innerHTML=''};
 si.oninput=function(){
  var q=si.value.trim().toLowerCase();
  if(q.length<2){sr.innerHTML='';return}
  var ar=IDX.a.filter(function(a){return (a.h+' '+a.c).toLowerCase().indexOf(q)>=0}).slice(0,5)
   .map(function(a){return '<a href="/news/'+encodeURIComponent(a.i)+'"><b>ARTICLE</b> — '+esc(a.h)+'</a>'});
  var tm=IDX.t.filter(function(t){return t.n.toLowerCase().indexOf(q)>=0}).slice(0,5)
   .map(function(t){return '<a href="/team/'+encodeURIComponent(t.i)+'"><b>TEAM</b> — '+esc(t.n)+' · '+esc(t.l)+'</a>'});
  sr.innerHTML=ar.concat(tm).join('')||'<div class="non">NO MATCHES — TRY A TEAM OR LEAGUE NAME</div>';
 };
}

/* ---------- NEWSLETTER POPUP — real signup, posts to /api/subscribe ---------- */
var nlov=$('#nlov');
function nlClose(){if(nlov)nlov.classList.remove('on');try{localStorage.setItem('ott_nl','1')}catch(e){}}
window.nlClose=nlClose;
if(nlov){
 if($('#nlx'))$('#nlx').onclick=nlClose;
 if($('#nlno'))$('#nlno').onclick=nlClose;
 nlov.addEventListener('click',function(e){if(e.target===nlov)nlClose()});
 if($('#nlj'))$('#nlj').onclick=function(){
  var v=$('#nlpe').value,ok=$('#nlokp');
  ok.style.display='block';
  if(!/.+@.+\..+/.test(v)){ok.textContent='ENTER A VALID EMAIL ADDRESS.';return}
  ok.textContent='SIGNING YOU UP…';
  fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:v})})
   .then(function(r){return r.ok})
   .then(function(good){
    ok.textContent=good?'YOU’RE ON THE LIST. FIRST OTT AM LANDS ON THE NEXT PUBLISHING MORNING.':'SIGNUP HICCUP ON OUR SIDE — TRY AGAIN IN A MINUTE.';
    if(good)setTimeout(nlClose,2200);
   })
   .catch(function(){ok.textContent='SIGNUP HICCUP ON OUR SIDE — TRY AGAIN IN A MINUTE.'});
 };
 var seen=false;try{seen=localStorage.getItem('ott_nl')==='1'}catch(e){}
 if(!seen&&location.pathname.indexOf('newsletter')<0)setTimeout(function(){nlov.classList.add('on')},6000);
}

/* ---------- INLINE NEWSLETTER STRIP ---------- */
var nsj=$('#nsj');
if(nsj)nsj.onclick=function(){
 var v=$('#nse').value,ok=$('#nsk');
 ok.style.display='block';
 if(!/.+@.+\..+/.test(v)){ok.textContent='ENTER A VALID EMAIL ADDRESS.';return}
 ok.textContent='SIGNING YOU UP…';
 fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:v})})
  .then(function(r){return r.ok})
  .then(function(good){ok.textContent=good?'YOU’RE ON THE LIST 🤝':'SIGNUP HICCUP — TRY AGAIN IN A MINUTE.'})
  .catch(function(){ok.textContent='SIGNUP HICCUP — TRY AGAIN IN A MINUTE.'});
};

/* ---------- MOST READ CAROUSEL ---------- */
window.mrScroll=function(dx){var m=$('#mr');if(m)m.scrollBy({left:dx,behavior:'smooth'})};

/* ---------- ESC closes everything ---------- */
document.addEventListener('keydown',function(e){
 if(e.key==='Escape'){nlClose();pClose();if(sw)sw.classList.remove('on');tddClose()}
});
}

module.exports = '(' + ui.toString() + ')();';
