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
      FOOTER (rich) — contact form, socials, dev credit, countdown
      ============================================================ */
   function svgIcon(name){
     const I={
       facebook:'<path d="M13 22v-8h2.7l.4-3.1H13V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H8v3.1h2.6V22H13z"/>',
       instagram:'<path d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.8 4.8 0 0 0 12 7.2zm0 7.9A3.1 3.1 0 1 1 15.1 12 3.1 3.1 0 0 1 12 15.1zm6.1-8.1a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1zM21 7a5.5 5.5 0 0 0-1.5-3.9A5.5 5.5 0 0 0 15.6 1.6C14.1 1.5 9.9 1.5 8.4 1.6A5.5 5.5 0 0 0 4.5 3.1 5.5 5.5 0 0 0 3 7c-.1 1.5-.1 5.7 0 7.2a5.5 5.5 0 0 0 1.5 3.9 5.5 5.5 0 0 0 3.9 1.5c1.5.1 5.7.1 7.2 0a5.5 5.5 0 0 0 3.9-1.5 5.5 5.5 0 0 0 1.5-3.9c.1-1.5.1-5.7 0-7.2zm-2 8.8a3.1 3.1 0 0 1-1.8 1.8c-1.2.5-4.2.4-5.6.4s-4.3.1-5.6-.4a3.1 3.1 0 0 1-1.8-1.8c-.5-1.2-.4-4.2-.4-5.6s-.1-4.3.4-5.6A3.1 3.1 0 0 1 6.4 4c1.2-.5 4.2-.4 5.6-.4s4.3-.1 5.6.4A3.1 3.1 0 0 1 19.4 5.8c.5 1.2.4 4.2.4 5.6s.1 4.3-.4 5.6z"/>',
       youtube:'<path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.7C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.9.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.7c1.6.4 8.9.4 8.9.4s7.3 0 8.9-.4a2.5 2.5 0 0 0 1.7-1.7C23 15.2 23 12 23 12zM9.8 15.2V8.8l6 3.2z"/>',
       whatsapp:'<path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4s-1.3.3-4.2-1A9.3 9.3 0 0 1 7 13.4c-.3-.5-1-1.5-1-2.9s.7-2 1-2.3a1 1 0 0 1 .8-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7a7 7 0 0 0 3.3 2.9c.3.2.5.1.7-.1l.8-.9c.2-.2.4-.2.6-.1l1.8.9c.3.1.5.2.5.4a3 3 0 0 1-.1 1.3z"/>',
       linkedin:'<path d="M6.9 8.2H3.6V20h3.3V8.2zM5.2 3.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM20.4 20v-6.5c0-3.5-1.9-5.1-4.4-5.1a3.8 3.8 0 0 0-3.4 1.9V8.2H9.2V20h3.3v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.9 2 3.3V20h3.3z"/>',
       github:'<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8a2 2 0 0 1 .6-1.3c-2.2-.2-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1a3.6 3.6 0 0 1 .1 2.7 3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5a2.2 2.2 0 0 1 .6 1.7v2.5c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/>',
       portfolio:'<path d="M12 2 2 7l10 5 10-5-10-5zm0 7L4 6m8 3 8-3M2 12l10 5 10-5M2 17l10 5 10-5"/>',
       email:'<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7L4 6.5V18h16V6.5L12 12z"/>'
     };
     return `<svg viewBox="0 0 24 24" aria-hidden="true">${I[name]||I.portfolio}</svg>`;
   }
   function socialLinks(map,cls="soc"){
     return Object.entries(map).filter(([,u])=>u&&!u.endsWith("//")).map(([k,u])=>
       `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${k}">${svgIcon(k)}</a>`).join("");
   }
   function footerHTML(){
     const c=cfg.contact, d=cfg.developer;
     return `<footer class="site-foot">
       <div class="foot-wave" aria-hidden="true">
         <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
           <path class="w1" d="M0,64 C240,110 480,10 720,48 C960,86 1200,20 1440,60 L1440,120 L0,120 Z"/>
           <path class="w2" d="M0,80 C260,40 520,110 780,70 C1040,30 1260,96 1440,72 L1440,120 L0,120 Z"/>
         </svg>
         <span class="fw-ball f1">⚽</span><span class="fw-ball f2">⚽</span>
       </div>
   
       <div class="foot-cta-wrap wrap">
         <div class="foot-cta-card">
           <div class="fcc-glow"></div>
           <div class="fcc-text"><h2>Ready to play on the <span class="g">SCPSC field?</span></h2>
             <p>Build your team, claim a slot and be part of the EX-CAP reunion tournament.</p></div>
           <button class="btn btn-primary" onclick="go('register-team')">Register your team →</button>
         </div>
       </div>
   
       <div class="foot-main wrap"><div class="foot-grid">
         <div class="foot-brand">
           <div class="brand"><div class="mark">${logoImg("excap","EX")}</div><div><b>EX-CAP</b><span>Alumni Association of SCPSC</span></div></div>
           <p class="desc">Reconnecting current and former students of SCPSC through football, played on home ground — organized by EX-CAP and supported by SCPSC's clubs.</p>
           <div class="socials">${socialLinks(cfg.socials,"soc")}</div>
           <div class="emergency"><span class="ed">●</span> Event-day / emergency: <b>${esc(c.emergency)}</b></div>
         </div>
         <div class="foot-col">
           <h5>Tournament</h5>
           <a onclick="go('home')">Home</a><a onclick="go('live')">Live scoreboard</a>
           <a onclick="go('fixtures')">Fixtures</a><a onclick="go('results')">Champions &amp; awards</a>
           <a onclick="go('teams')">Teams</a><a onclick="go('help')">Help &amp; FAQ</a>
         </div>
         <div class="foot-col">
           <h5>Register</h5>
           <a onclick="go('register-team')">Team</a><a onclick="go('register-guest')">Team guest</a>
           <a onclick="go('register-visitor')">Visitor</a><a onclick="go('register-student')">Current student</a>
           <a onclick="go('register-volunteer')">Volunteer</a>
           <a onclick="go('admin')" class="muted">Organizer login</a>
         </div>
         <div class="foot-contact">
           <h5>Get in touch</h5>
           <div class="fc-field"><input id="cf-name" placeholder="Your name" autocomplete="name"></div>
           <div class="fc-field"><input id="cf-email" type="email" placeholder="Your email" autocomplete="email"></div>
           <div class="fc-field"><textarea id="cf-msg" placeholder="Your message" rows="3"></textarea></div>
           <button class="btn btn-primary btn-block" id="cf-send" onclick="submitContact()">Send message</button>
           <p class="fc-direct">✉ <a href="mailto:${esc(c.email)}">${esc(c.email)}</a> &nbsp;·&nbsp; ☎ ${esc(c.phone)}</p>
         </div>
       </div></div>
   
       <div class="wrap"><div class="dev-card">
         <div class="dev-ring"></div>
         <div class="dev-left">
           <div class="dev-ava">${initials(d.name)}</div>
           <div class="dev-meta"><span class="l">Designed &amp; developed by</span><b>${esc(d.name)}</b><span class="role">${esc(d.role)}</span></div>
         </div>
         <div class="dev-socials">${socialLinks(d.socials,"soc dark")}</div>
       </div></div>
   
       <div class="wrap"><div class="foot-bottom">
         <span>© ${new Date().getFullYear()} EX-CAP · Alumni Association of SCPSC. All rights reserved.</span>
         <span class="links"><span onclick="go('help')">Privacy</span><span onclick="go('help')">Terms &amp; rules</span><a href="https://excapscpsc.com" target="_blank" rel="noopener">excapscpsc.com</a></span>
       </div></div>
     </footer>`;
   }
   async function submitContact(){
     const name=$("#cf-name").value.trim(), email=$("#cf-email").value.trim(), msg=$("#cf-msg").value.trim();
     if(!name||!email||!msg){ toast("Fill in name, email and message","warn"); return; }
     const btn=$("#cf-send"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
     const r=await Notify.sendContact({name,email,message:msg});
     btn.disabled=false; btn.textContent="Send message";
     if(r.ok){ toast("Message sent — we'll get back to you"); $("#cf-name").value=$("#cf-email").value=$("#cf-msg").value=""; }
     else if(r.skipped) toast("Contact form not configured yet (EmailJS)","warn");
     else toast("Could not send — try email instead","err");
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
     const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");obs.unobserve(e.target);}}),{threshold:.12});
     els.forEach(el=>obs.observe(el));
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