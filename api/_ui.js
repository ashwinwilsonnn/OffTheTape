// OFF THE TAPE — client-side chrome: ticker drag, slide-in panel, teams dropdown,
// search over the embedded index, newsletter signup (real POST to /api/subscribe).
// Written as an ordinary function and serialised with toString() at require time, so the
// browser payload stays plain readable JavaScript in the repo — diffable, no escaping games.
function ui() {
var $=function(s){return document.querySelector(s)};
var die="this.classList.add('dead')";

/* ---------- TICKER ----------
   A finger is not a mouse. The original ran an auto-scroll loop and a scroll handler that both
   rewrote scrollLeft to fake an infinite loop — and on iOS, writing scrollLeft while a flick or
   its momentum is in flight cancels the gesture outright. The ticker was killing every swipe
   with its own code. Removing the loop fixed the swipe and lost the crawl, which is the half of
   it people actually notice.
   So on touch nothing goes near scrollLeft. The container stops scrolling and the track is
   moved with a transform: the crawl is a transform, the drag is a transform, the flick is a
   transform. Because the track ships doubled, wrapping is one modulo and never shows a seam.
   Desktop keeps its scrollLeft loop, where it has always worked. */
(function(){
 var tk=$('#tick'),tr=$('#tkt');
 if(!tk||!tr)return;
 var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 var touch=matchMedia('(hover: none) and (pointer: coarse)').matches;

 if(touch){
  tk.classList.add('tkmove');                       // overflow:hidden + touch-action:pan-y
  var SPD=32;                                       // px per second — a crawl, not a slide
  var C=0,W=0;
  var measure=function(){C=tr.scrollWidth/2;W=tk.clientWidth};
  measure();
  addEventListener('resize',measure);addEventListener('load',measure);
  // Card widths move when the webfonts swap in, and the loop length is measured in pixels.
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  var pos=0,vel=0,down=false,sx=0,spos=0,moved=0,lt=0,lx=0,lts=0,lv=0,hold=0;
  // pos runs negative forever; the modulo folds it back into one copy width, so the second
  // copy is always the thing filling the right-hand edge. No jump, no reset, no seam.
  var put=function(){if(!C)return;var x=pos%C;if(x>0)x-=C;tr.style.transform='translate3d('+x.toFixed(2)+'px,0,0)'};
  // Fewer matches than fit on screen: there is nothing to loop, and the doubled track would
  // show the same fixtures twice side by side. Drop the spare copy and stand still.
  var dead=false;
  var strip=function(){
   dead=true;tr.style.transform='';
   var kids=tr.children,n=kids.length/2;
   if(n>=1&&n===Math.floor(n))for(var i=kids.length-1;i>=n;i--)tr.removeChild(kids[i]);
  };
  var frame=function(t){
   if(dead)return;
   requestAnimationFrame(frame);
   if(!C)return;
   if(C<W)return strip();
   var dt=lt?Math.min(64,t-lt):16;lt=t;
   if(down)return;                                  // the finger owns it
   if(vel){                                         // our own inertia, since nothing is scrolling
    pos+=vel*dt;vel*=Math.pow(.995,dt);
    if(Math.abs(vel)<.02){vel=0;hold=t+900}         // let a flick settle before taking it back
   }else if(!rm&&t>hold){pos-=SPD*dt/1000}
   put();
  };
  tk.addEventListener('pointerdown',function(e){
   down=true;vel=0;moved=0;sx=e.clientX;spos=pos;lx=e.clientX;lts=e.timeStamp||0;lv=0});
  addEventListener('pointermove',function(e){
   if(!down)return;
   var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));
   // px per millisecond off the clock, not per event — a 120Hz phone fires twice as often
   // as a 60Hz one and would otherwise read as half the flick.
   var ts=e.timeStamp||0,d=ts-lts;
   if(d>0){lv=(e.clientX-lx)/d;lx=e.clientX;lts=ts}
   pos=spos+dx;put()});
  var lift=function(){if(!down)return;down=false;hold=0;vel=Math.max(-3,Math.min(3,lv))};
  addEventListener('pointerup',lift);addEventListener('pointercancel',lift);
  // A swipe that ends on a card is a swipe, not a tap.
  tk.addEventListener('click',function(e){if(moved>8){e.preventDefault();e.stopPropagation();moved=0}},true);
  requestAnimationFrame(frame);
  return;                                           // scrollLeft is never written on touch
 }

 var auto=!rm,tmr=null,drag=false,sx=0,sl=0,moved=0;
 var half=function(){return tr.scrollWidth/2};
 /* Speed is pixels per SECOND, not per frame. The old loop added 0.55px per
    requestAnimationFrame tick, and rAF fires at the monitor's refresh rate — right at 60Hz,
    double-to-triple speed on the 120-165Hz panels most widescreen monitors run at. Same fix
    the touch path already carries: scale by elapsed time. A float accumulator does the
    bookkeeping so sub-pixel steps never get lost to scrollLeft rounding; it resyncs from the
    real scroll position whenever the user has had the wheel or a drag. */
 var SPD=32,lt=0,px=null;
 function loop(t){
  if(auto&&!drag){
   var dt=lt?Math.min(64,t-lt):16;
   if(px===null)px=tk.scrollLeft;
   px+=SPD*dt/1000;
   if(px>=half())px-=half();
   tk.scrollLeft=px;
  }else px=null;
  lt=t;
  requestAnimationFrame(loop);
 }
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
 // Six seconds ambushes someone who has not read a word yet. Twenty-five seconds, or the
 // moment they scroll like they mean it — whichever comes first.
 var seen2=seen,shown=false;
 function nlShow(){if(shown||seen2)return;shown=true;nlov.classList.add('on')}
 if(!seen&&location.pathname.indexOf('newsletter')<0){
  setTimeout(nlShow,25000);
  addEventListener('scroll',function(){if(scrollY>1200)nlShow()},{passive:true});
 }
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
