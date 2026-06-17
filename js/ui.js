/* ============================================================
   EX-CAP Sports — ui.js
   Shared chrome (nav, footer), helpers, countdowns, scroll
   reveal, count-up, modal/toast, and the hash router.
   ============================================================ */
   const cfg = window.EXCAP;

   /* ---- state shared across modules ---- */
   const App = { settings:null, logos:{}, regs:[] };
   
   /* ---- dom + format helpers ---- */
   const $  = (s,el=document)=>el.querySelector(s);
   const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
   const esc= s=>(s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
   function fmtDate(iso){ if(!iso) return "TBA"; return new Date(iso).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); }
   function fmtDateTime(ts){ return new Date(ts).toLocaleString(undefined,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}); }
   function initials(n){ return (n||"?").split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase(); }
   function teamHue(n){ let h=0; for(const c of (n||"x")) h=(h*31+c.charCodeAt(0))%360; return h; }
   
   function toast(msg,kind=""){ const t=$("#toast"); $("#toast-msg").textContent=msg; t.className="toast show "+kind; clearTimeout(t._t); t._t=setTimeout(()=>t.className="toast "+kind,2800); }
   function showModal(html){ const d=document.createElement("div"); d.className="modal-bg"; d.id="modal"; d.onclick=e=>{if(e.target===d)closeModal();}; d.innerHTML=`<div class="modal">${html}</div>`; document.body.appendChild(d); }
   function closeModal(){ const m=$("#modal"); m&&m.remove(); }
   
   /* real scannable QR (qr.js); falls back to decorative if lib missing */
   function qrSvg(seed){ return (window.QR&&QR.svg)?QR.svg(seed):`<svg viewBox="0 0 1 1"></svg>`; }
   
   function logoImg(key,fallback,cls=""){ return App.logos[key]?`<img class="${cls}" src="${App.logos[key]}" alt="">`:`<span class="${cls}">${esc(fallback)}</span>`; }
   
   /* ---- derived data ---- */
   /* team data: use full registrations when available (admin), else the
      PII-free public mirror (public visitors). */
   function allTeams(){ return (App.isAdmin && App.regs && App.regs.length) ? App.regs.filter(r=>r.type==="team") : (App.publicTeams||[]); }
   function findTeam(id){ return (App.regs||[]).find(r=>r.id===id) || (App.publicTeams||[]).find(r=>r.id===id) || null; }
   function teamRegs(){ return allTeams(); }
   function confirmedTeams(){ return allTeams().filter(r=>r.status==="approved"); }
   function slotsUsed(){ return allTeams().filter(r=>["approved","review","submitted"].includes(r.status)).length; }
   
   /* ---- apply brand colours ---- */
   function applyBrand(b){
     const root=document.documentElement.style;
     root.setProperty("--purple",b.purple); root.setProperty("--magenta",b.magenta);
     root.setProperty("--grad",`linear-gradient(120deg,${b.purple},${b.magenta})`);
     root.setProperty("--grad-soft",`linear-gradient(120deg,${hexA(b.purple,.18)},${hexA(b.magenta,.18)})`);
   }
   function hexA(hex,a){ const m=hex.replace("#",""); const r=parseInt(m.slice(0,2),16),g=parseInt(m.slice(2,4),16),bl=parseInt(m.slice(4,6),16); return `rgba(${r},${g},${bl},${a})`; }
   
   /* ============================================================
      NAV + DRAWER
      ============================================================ */
   const NAV=[["home","Home"],["live","Live"],["fixtures","Fixtures"],["teams","Teams"],["register-team","Register"],["help","Help"]];
   function navHTML(active){
     return `
     <header class="nav"><div class="wrap nav-in">
       <div class="brand" onclick="go('home')"><div class="mark">${logoImg("excap","EX")}</div>
         <div><b>EX-CAP</b><span>SCPSC Alumni Football</span></div></div>
       <nav class="links">${NAV.map(([h,l])=>`<a class="${active===h?'active':''}" onclick="go('${h}')">${l}</a>`).join("")}</nav>
       <div class="nav-cta">
         <button class="btn btn-line" onclick="go('teams')">View teams</button>
         <button class="btn btn-primary" onclick="go('register-team')">Register now</button>
       </div>
       <button class="hamb" aria-label="Menu" onclick="$('#drawer').classList.add('open')">☰</button>
     </div></header>
     <div id="drawer" class="drawer">
       <button class="close" aria-label="Close" onclick="$('#drawer').classList.remove('open')">✕</button>
       ${NAV.map(([h,l])=>`<a onclick="$('#drawer').classList.remove('open');go('${h}')">${l}</a>`).join("")}
       <a onclick="$('#drawer').classList.remove('open');go('register-team')" style="color:var(--magenta)">Register now →</a>
     </div>`;
   }
   function anncHTML(){
     const a=App.settings.annc; if(!a||!a.active) return "";
     return `<div id="annc" class="${a.urgent?'urgent':''}"><span class="dot"></span><span>${esc(a.text)}</span>
       ${a.link?`<a onclick="${a.link.startsWith('#')?`go('${a.link.slice(1)}')`:`window.open('${esc(a.link)}','_blank')`}">${esc(a.linkLabel||'More')} →</a>`:""}</div>`;
   }
   
   
   /* ============================================================
      PITCH LINES SVG (hero + footer ambience)
      ============================================================ */
   function pitchLines(){
     return `<svg class="pitch-lines" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
       <g fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1.4">
         <rect x="40" y="40" width="1120" height="520" rx="6"/>
         <line x1="600" y1="40" x2="600" y2="560"/>
         <circle class="spin-c" cx="600" cy="300" r="92"/>
         <rect x="40" y="180" width="150" height="240"/><rect x="1010" y="180" width="150" height="240"/>
         <rect x="40" y="240" width="60" height="120"/><rect x="1100" y="240" width="60" height="120"/>
         <circle cx="600" cy="300" r="3" fill="rgba(255,255,255,.2)" stroke="none"/>
       </g></svg>`;
   }
   
   /* ============================================================
      COUNTDOWN ENGINE (multiple targets) + count-up + reveal
      ============================================================ */
   const Countdowns=[];
   function registerCountdown(el,targetISO,onZero){ Countdowns.push({el,target:new Date(targetISO).getTime(),onZero,fired:false}); }
   function clearCountdowns(){ Countdowns.length=0; }
   function parts(ms){ ms=Math.max(0,ms); const d=Math.floor(ms/864e5); ms-=d*864e5; const h=Math.floor(ms/36e5); ms-=h*36e5; const m=Math.floor(ms/6e4); ms-=m*6e4; const s=Math.floor(ms/1e3); return {d,h,m,s}; }
   setInterval(()=>{
     const now=Date.now();
     for(const c of Countdowns){
       if(!document.body.contains(c.el)) continue;
       const p=parts(c.target-now);
       const cells=$$(".v",c.el);
       if(cells.length>=4){ [p.d,p.h,p.m,p.s].forEach((val,i)=>{ const v=String(val).padStart(2,"0"); if(cells[i].textContent!==v){cells[i].textContent=v;cells[i].parentElement.classList.add("tick");setTimeout(()=>cells[i].parentElement.classList.remove("tick"),300);} }); }
       else if(c.el.dataset.fmt==="compact"){ c.el.querySelector(".t").textContent = p.d>0?`${p.d}d ${p.h}h ${p.m}m`:`${p.h}h ${p.m}m ${p.s}s`; }
       if(c.target-now<=0 && !c.fired){ c.fired=true; c.onZero&&c.onZero(c.el); }
     }
   },1000);
   
   function observeReveal(){
     const els=$$(".reveal:not(.in)");
     if(!("IntersectionObserver" in window)){ els.forEach(el=>el.classList.add("in")); return; }
     const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");obs.unobserve(e.target);}}),{threshold:.08, rootMargin:"0px 0px -5% 0px"});
     els.forEach(el=>obs.observe(el));
     // safety net: never let content stay hidden (e.g. odd mobile viewport cases)
     setTimeout(()=>$$(".reveal:not(.in)").forEach(el=>{ const r=el.getBoundingClientRect(); if(r.top<innerHeight*1.4) el.classList.add("in"); }),1200);
   }
   function animateCounts(){
     $$("[data-count]").forEach(el=>{
       const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){rampTo(el,+el.dataset.count);obs.unobserve(el);}}));
       obs.observe(el);
     });
   }
   function rampTo(el,to){
     if(matchMedia("(prefers-reduced-motion:reduce)").matches){el.textContent=to;return;}
     const dur=1100,t0=performance.now();
     (function f(t){const p=Math.min(1,(t-t0)/dur);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f);})(t0);
   }
   
   /* ============================================================
      ROUTER
      ============================================================ */
   const Routes={};
   function registerRoute(name,fn){ Routes[name]=fn; }
   function go(hash){ if(location.hash==="#"+hash) route(); else location.hash=hash; window.scrollTo(0,0); }
   function currentRoute(){ return location.hash.replace(/^#/,"").split("?")[0]; }
   async function route(){
     clearCountdowns();
     const fn=Routes[currentRoute()]||Routes.home;
     await fn();
     observeReveal(); animateCounts();
   }
   window.addEventListener("hashchange",route);
   
   /* ============================================================
      BOOT
      ============================================================ */
   async function boot(){
     try{ await Store.ready; }catch(e){}
     try{ App.settings = await Store.getSettings(); }catch(e){ App.settings = {...cfg.settings}; }
     try{ App.logos = await Store.getLogos(); }catch(e){ App.logos = {}; }
     try{ App.publicTeams = await Store.listPublicTeams(); }catch(e){ App.publicTeams = []; }
     App.regs = App.regs || [];   // populated only after admin signs in
     applyBrand((App.settings && App.settings.brand) || cfg.brand);
     Notify.initEmail();
     route();
   }
   document.addEventListener("DOMContentLoaded",boot);