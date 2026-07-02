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
   function showModal(html,cls=""){ const d=document.createElement("div"); d.className="modal-bg"; d.id="modal"; d.onclick=e=>{if(e.target===d)closeModal();}; d.innerHTML=`<div class="modal ${cls}">${html}</div>`; document.body.appendChild(d); }
   function closeModal(){ const m=$("#modal"); m&&m.remove(); }

   /* real scannable QR (qr.js); falls back to decorative if lib missing */
   function qrSvg(seed){ return (window.QR&&QR.svg)?QR.svg(seed):`<svg viewBox="0 0 1 1"></svg>`; }

   /* logo lookup order: admin-uploaded -> file in /assets -> text initials */
   const LOGO_DEFAULTS={ tournament:"assets/logo-tournament.png", excap:"assets/logo-excap.png", scpsc:"assets/logo-scpsc.png" };
   function logoImg(key,fallback,cls=""){
     const up=App.logos&&App.logos[key];
     if(up) return `<img class="${cls}" src="${up}" alt="">`;
     const def=LOGO_DEFAULTS[key];
     if(def) return `<img class="${cls}" src="${def}" alt="" data-fb="${esc(fallback)}" data-cls="${esc(cls)}" onerror="logoFallback(this)">`;
     return `<span class="${cls} lf">${esc(fallback)}</span>`;
   }
   function logoFallback(img){ try{ const s=document.createElement("span"); s.className=(img.getAttribute("data-cls")||"")+" lf"; s.textContent=img.getAttribute("data-fb")||""; img.replaceWith(s); }catch(e){} }

   /* ---- derived data ---- */
   /* team data: use full registrations when available (admin), else the
      PII-free public mirror (public visitors). */
   function allTeams(){ return (App.isAdmin && App.regs && App.regs.length) ? App.regs.filter(r=>r.type==="team") : (App.publicTeams||[]); }
   /* affiliated clubs (admin-editable via settings.clubs) */
   function getClubs(){ return (App.settings && App.settings.clubs && App.settings.clubs.length) ? App.settings.clubs : (cfg.settings.clubs||[]); }
   /* emergency contact — opens as a nice card modal from a button/FAB */
   function emergencyInfo(){ return (App.settings && App.settings.emergency) || cfg.emergency || {}; }
   function emergencyModal(){
     const e=emergencyInfo(); const tel=(e.phone||"").replace(/[^\d+]/g,"");
     showModal(`<div class="emerg-card">
       <div class="emerg-ic">🆘</div>
       <h3>Need help?</h3>
       <p class="emerg-msg">Facing a problem with registration or anything else? Reach our team directly — we're happy to help.</p>
       <div class="emerg-person">
         <div class="ep-ava">${esc(initials(e.name||"EX"))}</div>
         <div><b>${esc(e.name||"")}</b><span>${esc(e.role||"")}</span></div>
       </div>
       <div class="emerg-actions">
         ${e.phone?`<a class="btn btn-primary" href="tel:${esc(tel)}">📞 Call ${esc(e.phone)}</a>`:""}
         ${e.email?`<a class="btn btn-line" href="mailto:${esc(e.email)}">✉ Email us</a>`:""}
       </div>
       <button class="btn btn-ghost btn-block" style="margin-top:6px" onclick="closeModal()">Close</button>
     </div>`,"narrow");
   }
   /* floating help button shown on every page */
   function ensureHelpFab(){
     const e=emergencyInfo(); if(!e.phone && !e.email){ const x=document.getElementById("help-fab"); if(x)x.remove(); return; }
     let b=document.getElementById("help-fab");
     if(!b){ b=document.createElement("button"); b.id="help-fab"; b.type="button"; b.setAttribute("aria-label","Get help");
       b.innerHTML=`<span class="hf-ic">🆘</span><span class="hf-tx">Need help?</span>`;
       b.onclick=emergencyModal; document.body.appendChild(b); }
   }
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
   const NAV=[["home","Home"],["live","Live"],["fixtures","Fixtures"],["teams","Teams"],["register","Register"]];
   function navHTML(active){
     return `
     <header class="nav"><div class="wrap nav-in">
       <div class="brand" onclick="go('home')"><div class="mark logo-stage"><span class="logo-aura" aria-hidden="true"></span>${logoImg("tournament","EX")}</div>
         <div><b>EX-CAP</b><span>SCPSC Alumni Football</span></div></div>
       <nav class="links">${NAV.map(([h,l])=>`<a class="${active===h?'active':''}" onclick="go('${h}')">${l}</a>`).join("")}</nav>
       <div class="nav-cta">
         <button class="btn btn-soft" onclick="emergencyModal()">🆘 Help</button>
         <button class="btn btn-primary" onclick="go('register')">Register now</button>
       </div>
       <button class="hamb" aria-label="Menu" onclick="$('#drawer').classList.add('open')">☰</button>
     </div></header>
     <div id="drawer" class="drawer">
       <button class="close" aria-label="Close" onclick="$('#drawer').classList.remove('open')">✕</button>
       ${NAV.map(([h,l])=>`<a onclick="$('#drawer').classList.remove('open');go('${h}')">${l}</a>`).join("")}
       <a onclick="$('#drawer').classList.remove('open');go('register')" style="color:var(--magenta)">Register now →</a>
       <a onclick="$('#drawer').classList.remove('open');emergencyModal()">🆘 Need help?</a>
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
   function go(hash){ if(location.hash==="#"+hash) route(); else location.hash=hash; }
   function currentRoute(){ return location.hash.replace(/^#/,"").split("?")[0]; }

   /* ---- maintenance gate ---- */
   function maintenanceActive(){ return !!(App.settings && App.settings.maintenance===true); }
   function previewUnlocked(){ try{ return localStorage.getItem("excap_preview")==="1"; }catch(e){ return false; } }
   function canBypassMaintenance(){ return !!(App.authed || App.isAdmin || previewUnlocked()); }

   async function route(){
     window.scrollTo(0,0);
     clearCountdowns();
     const r=currentRoute();
     // public sees the holding page; admins (#admin / logged-in) and preview links pass through
     if(maintenanceActive() && !canBypassMaintenance() && r!=="admin" && r!=="unlock"){
       renderMaintenance(); updateMaintBadge(); ensureHelpFab(); return;
     }
     const fn=Routes[r]||Routes.home;
     await fn();
     observeReveal(); animateCounts();
     updateMaintBadge(); ensureHelpFab();
   }
   window.addEventListener("hashchange",route);

   /* floating badge shown to admins/preview while the site is in maintenance */
   function updateMaintBadge(){
     let b=document.getElementById("maint-badge");
     const show = maintenanceActive() && canBypassMaintenance() && currentRoute()!=="admin";
     if(show){
       if(!b){ b=document.createElement("div"); b.id="maint-badge"; document.body.appendChild(b); }
       const who=App.authed||App.isAdmin?"Organizer view":"Preview";
       b.innerHTML=`<span class="mb-dot"></span> Maintenance mode · <b>${who}</b><span class="mb-sub">Public sees the coming-soon page</span>`;
     } else if(b){ b.remove(); }
   }

   /* preview unlock: #unlock  (enter the key) OR ?preview=KEY in the URL */
   function applyPreviewParam(){
     try{
       const m=location.search.match(/[?&]preview=([^&]+)/);
       if(m && decodeURIComponent(m[1])===(App.settings.previewKey||cfg.settings.previewKey)){
         localStorage.setItem("excap_preview","1");
         history.replaceState({},"",location.pathname+location.hash);
       }
     }catch(e){}
   }
   Routes.unlock=function(){
     $("#app").innerHTML=`<div class="maint"><div class="maint-card" style="max-width:420px">
       <div class="maint-badge">Preview access</div>
       <h1>Enter preview key</h1>
       <p>For organizers and the developer to preview the site before launch.</p>
       <input id="pv-key" type="password" placeholder="Preview key" style="margin:8px 0 12px">
       <button class="btn btn-primary btn-block" onclick="tryUnlock()">Unlock preview</button>
       <a class="maint-link" onclick="go('admin')">Organizer login instead →</a>
     </div></div>`;
   };
   function tryUnlock(){
     const k=$("#pv-key").value.trim();
     if(k && k===(App.settings.previewKey||cfg.settings.previewKey)){
       try{ localStorage.setItem("excap_preview","1"); }catch(e){}
       toast("Preview unlocked"); location.hash="home"; route();
     } else toast("Wrong key","err");
   }
   function lockPreview(){ try{ localStorage.removeItem("excap_preview"); }catch(e){} location.hash="home"; route(); }

   /* ============================================================
      BOOT
      ============================================================ */
   async function boot(){
     if ("scrollRestoration" in history) history.scrollRestoration = "manual";
     window.scrollTo(0,0);

     // 1) INSTANT first paint from config defaults (no waiting on the network)
     App.settings = App.settings || {...cfg.settings};
     App.logos    = App.logos || {};
     App.publicTeams = App.publicTeams || [];
     App.regs = App.regs || [];
     applyPreviewParam();
     applyBrand((App.settings && App.settings.brand) || cfg.brand);
     route();                                  // page is visible immediately

     // 2) Hydrate from the backend, then re-render only if data actually changed
     try{ await Store.ready; }catch(e){}

     // Wait briefly for Firebase to restore the previous session before deciding
     // whether the user is an admin — otherwise a page refresh flashes them out.
     await new Promise(res=>{
       let done=false; const finish=()=>{ if(!done){done=true; res();} };
       if(Store.onAuth) Store.onAuth(u=>{ App.authed=!!u; if(u){ App.isAdmin=true; } finish(); });
       setTimeout(finish, 1200);   // don't wait forever if there's no session
     });

     const before = JSON.stringify({s:App.settings, l:App.logos, t:App.publicTeams});
     try{ App.settings = await Store.getSettings(); }catch(e){}
     try{ App.logos = await Store.getLogos(); }catch(e){}
     try{ App.publicTeams = await Store.listPublicTeams(); }catch(e){}
     const after = JSON.stringify({s:App.settings, l:App.logos, t:App.publicTeams});
     applyBrand((App.settings && App.settings.brand) || cfg.brand);
     if(window.Notify && Notify.initEmail) Notify.initEmail();

     // If the user is signed in, load their profile + registrations so admin panel
     // works immediately after refresh instead of showing "Please log in".
     if(App.authed){
       try{ if(Store.getProfile) await Store.getProfile(); }catch(e){}
       try{ App.regs = await Store.listRegs(); }catch(e){}
     }

     // re-render once at the end
     if(App.authed || before !== after) route();
   }
   document.addEventListener("DOMContentLoaded",boot);