/* ============================================================
   EX-CAP Sports — footer.js  (standalone, manage on its own)
   Light footer modelled on the official EX-CAP site: brand, links,
   newsletter, install/support, live Dhaka clock, status, developer
   credit and socials. Reads live values from App.settings / config.
   The tournament illustration banner sits on top.
   ============================================================ */
function svgIcon(name){
  const I={
    facebook:'<path d="M13 22v-8h2.7l.4-3.1H13V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H8v3.1h2.6V22H13z"/>',
    instagram:'<path d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.8 4.8 0 0 0 12 7.2zm0 7.9A3.1 3.1 0 1 1 15.1 12 3.1 3.1 0 0 1 12 15.1zm6.1-8.1a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1zM21 7a5.5 5.5 0 0 0-1.5-3.9A5.5 5.5 0 0 0 15.6 1.6C14.1 1.5 9.9 1.5 8.4 1.6A5.5 5.5 0 0 0 4.5 3.1 5.5 5.5 0 0 0 3 7c-.1 1.5-.1 5.7 0 7.2a5.5 5.5 0 0 0 1.5 3.9 5.5 5.5 0 0 0 3.9 1.5c1.5.1 5.7.1 7.2 0a5.5 5.5 0 0 0 3.9-1.5 5.5 5.5 0 0 0 1.5-3.9c.1-1.5.1-5.7 0-7.2zm-2 8.8a3.1 3.1 0 0 1-1.8 1.8c-1.2.5-4.2.4-5.6.4s-4.3.1-5.6-.4a3.1 3.1 0 0 1-1.8-1.8c-.5-1.2-.4-4.2-.4-5.6s-.1-4.3.4-5.6A3.1 3.1 0 0 1 6.4 4c1.2-.5 4.2-.4 5.6-.4s4.3-.1 5.6.4A3.1 3.1 0 0 1 19.4 5.8c.5 1.2.4 4.2.4 5.6s.1 4.3-.4 5.6z"/>',
    linkedin:'<path d="M6.9 8.2H3.6V20h3.3V8.2zM5.2 3.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM20.4 20v-6.5c0-3.5-1.9-5.1-4.4-5.1a3.8 3.8 0 0 0-3.4 1.9V8.2H9.2V20h3.3v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.9 2 3.3V20h3.3z"/>',
    twitter:'<path d="M18.2 2H21l-6.4 7.3L22 22h-6.3l-4.9-6.4L5.1 22H2.3l6.9-7.9L2 2h6.4l4.4 5.9L18.2 2zm-1.1 18h1.6L7 3.7H5.3L17.1 20z"/>',
    threads:'<path d="M16.5 11.2c-.1 0-.2-.1-.3-.1-.2-2.9-1.8-4.6-4.4-4.6-1.6 0-2.9.7-3.7 1.9l1.4 1c.6-.9 1.5-1.1 2.3-1.1 1.4 0 2.4.9 2.6 2.5-.6-.1-1.2-.2-1.9-.1-2.1.1-3.6 1.3-3.5 3.1.1 1.6 1.5 2.6 3.1 2.5 1.6-.1 3.4-.9 3.7-3.6.5.3.8.7 1 1.2.3.9.3 2.3-.7 3.3-.9.9-2 1.3-3.6 1.3-1.8 0-3.1-.6-4-1.7-.8-1.1-1.3-2.6-1.3-4.6s.5-3.5 1.3-4.6c.9-1.1 2.2-1.7 4-1.7 1.8 0 3.1.6 4.1 1.8.5.6.8 1.3 1.1 2.2l1.7-.5c-.3-1.1-.8-2-1.4-2.8-1.3-1.6-3.1-2.4-5.4-2.4-2.3 0-4.2.8-5.4 2.4C5.6 7.4 5 9.4 5 11.9s.6 4.5 1.8 6.1C8 19.6 9.9 20.4 12.2 20.4c2 0 3.6-.5 4.8-1.7 1.6-1.6 1.5-3.6 1-4.9-.4-.9-1-1.6-1.5-2.6zm-4.3 3.9c-.9.1-1.4-.4-1.5-1-.1-.7.6-1.2 1.6-1.3.4 0 .8 0 1.3.1-.1 1.5-.8 2.1-1.4 2.2z"/>',
    youtube:'<path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.7C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.9.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.7c1.6.4 8.9.4 8.9.4s7.3 0 8.9-.4a2.5 2.5 0 0 0 1.7-1.7C23 15.2 23 12 23 12zM9.8 15.2V8.8l6 3.2z"/>',
    whatsapp:'<path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4s-1.3.3-4.2-1A9.3 9.3 0 0 1 7 13.4c-.3-.5-1-1.5-1-2.9s.7-2 1-2.3a1 1 0 0 1 .8-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7a7 7 0 0 0 3.3 2.9c.3.2.5.1.7-.1l.8-.9c.2-.2.4-.2.6-.1l1.8.9c.3.1.5.2.5.4a3 3 0 0 1-.1 1.3z"/>',
    github:'<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8a2 2 0 0 1 .6-1.3c-2.2-.2-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1a3.6 3.6 0 0 1 .1 2.7 3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5a2.2 2.2 0 0 1 .6 1.7v2.5c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/>',
    website:'<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.9 6h-2.5a14.6 14.6 0 0 0-1.1-3.1A8 8 0 0 1 18.9 8zM12 4c.6 0 1.5 1.4 2 3.9H10c.5-2.5 1.4-3.9 2-3.9zM4.3 14a7.7 7.7 0 0 1 0-4h2.8a16.8 16.8 0 0 0 0 4zm.8 2h2.5a14.6 14.6 0 0 0 1.1 3.1A8 8 0 0 1 5.1 16zm2.5-8H5.1a8 8 0 0 1 3.6-3.1A14.6 14.6 0 0 0 7.6 8zM12 20c-.6 0-1.5-1.4-2-3.9h4c-.5 2.5-1.4 3.9-2 3.9zm2.4-5.9H9.6a14.6 14.6 0 0 1 0-4h4.8a14.6 14.6 0 0 1 0 4zm.5 5a14.6 14.6 0 0 0 1.1-3.1h2.5a8 8 0 0 1-3.6 3.1zM17 14a16.8 16.8 0 0 0 0-4h2.8a7.7 7.7 0 0 1 0 4z"/>',
    portfolio:'<path d="M12 2 2 7l10 5 10-5-10-5zm0 7L4 6m8 3 8-3M2 12l10 5 10-5M2 17l10 5 10-5"/>',
    email:'<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7L4 6.5V18h16V6.5L12 12z"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${I[name]||I.website}</svg>`;
}
function socialLinks(map,cls="soc"){
  const order=["facebook","instagram","linkedin","twitter","threads","youtube","whatsapp","github","portfolio","website","email"];
  const entries=Object.entries(map||{}).filter(([,u])=>u&&!u.endsWith("//")&&u!=="https://"&&u!=="mailto:hello@example.com");
  entries.sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
  return entries.map(([k,u])=>`<a class="${cls}" data-tip="${esc(k)}" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(k)}">${svgIcon(k)}</a>`).join("");
}

function nowDhaka(){
  try{ return new Date().toLocaleTimeString("en-US",{timeZone:"Asia/Dhaka",hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
  catch(e){ return new Date().toLocaleTimeString(); }
}

function footerHTML(){
  const c=cfg.contact, d=cfg.developer, s=(App.settings||cfg.settings);
  const phase=(typeof regPhase==="function")?regPhase():"open";
  const statusTxt=phase==="open"?"Registrations open":phase==="before"?"Opening soon":"Registrations closed";
  const link=(label,route,icon)=>`<a onclick="go('${route}')">${svgIcon(icon||"arrow")} ${label}</a>`;
  return `<footer class="site-foot">


    <div class="wrap foot-shell">
      <div class="foot-card">
        <div class="fc-glow a"></div><div class="fc-glow b"></div>

        <div class="foot-grid">
          <!-- brand -->
          <div class="fcol brand-col">
            <div class="foot-logos">
              <span class="flogo">${logoImg("scpsc","SC")}</span>
              <span class="flogo">${logoImg("excap","EX")}</span>
              <span class="flogo">${logoImg("tournament","FT")}</span>
            </div>
            <h3 class="foot-name">${esc(s.tournamentName||"EX-CAP Football Tournament")}</h3>
            <p class="foot-kicker">Organized by EX-CAP · Alumni of SCPSC</p>
            <p class="foot-desc">The reunion football tournament bringing alumni and current students back together — played at the SCPSC field.</p>
            <div class="foot-meta">
              <div class="fm-row"><span class="fm-ic loc">◉</span> Venue: <b>${esc(s.venue||"SCPSC field")}</b></div>
              <div class="fm-row"><span class="fm-ic clk">◴</span> Dhaka: <b id="foot-clock">${nowDhaka()}</b></div>
              <div class="fm-row"><span class="fm-ic net">◆</span> Kick-off: <b>${fmtDate(s.tournamentDate)}</b></div>
            </div>
          </div>

          <!-- links -->
          <div class="fcol links-col">
            <h4>Tournament</h4>
            ${link("Home","home")}${link("Live scoreboard","live")}${link("Fixtures","fixtures")}${link("Champions","results")}${link("Teams","teams")}
          </div>
          <div class="fcol links-col">
            <h4>Get involved</h4>
            ${link("Register","register")}${link("Help & FAQ","help")}${link("Rules & terms","help")}
            <a onclick="go('admin')" class="lock">${svgIcon("arrow")} Organizer login</a>
            <a href="https://excapscpsc.com" target="_blank" rel="noopener">${svgIcon("arrow")} EX-CAP main site ↗</a>
          </div>

          <!-- newsletter / status / install -->
          <div class="fcol right-col">
            <span class="sys-pill"><span class="sys-dot"></span> ${statusTxt}</span>
            <h4>Stay updated</h4>
            <p class="news-sub">Get an email for announcements, fixtures and results.</p>
            <form class="news-form" onsubmit="footerSubscribe(event)">
              <input id="news-email" type="email" placeholder="Enter your email…" autocomplete="email">
              <button type="submit" aria-label="Subscribe">${svgIcon("arrow")}</button>
            </form>
            <div class="foot-btns">
              <button class="btn fbtn-dark" onclick="installApp()">⤓ Install app</button>
              <button class="btn fbtn-light" onclick="contactModal()">✉ Contact us</button>
            </div>
          </div>
        </div>

        <div class="foot-dev-row">
          <a class="dev-card" href="${esc((d.socials&&d.socials.portfolio)||'#')}" target="_blank" rel="noopener" data-tip="View developer portfolio">
            <span class="dev-eyebrow">Developed &amp; engineered by</span>
            <span class="dev-body">
              <span class="dev-ava">${initials(d.name)}</span>
              <span class="dev-meta">
                <b>${esc(d.name)} ${svgIcon("website")}</b>
                <span class="dev-role">${esc(d.role)}</span>
                ${d.org?`<span class="dev-org">${esc(d.org)}</span>`:""}
              </span>
            </span>
          </a>
          <div class="foot-socials">${socialLinks(cfg.socials,"soc")}</div>
        </div>

        <div class="foot-bottom">
          <span class="fb-copy">© ${new Date().getFullYear()} EX-CAP · Alumni Association of SCPSC</span>
          <span class="fb-ver">v.${esc(cfg.build?cfg.build.version:"1.0")} <i>|</i> ${esc(cfg.build?cfg.build.date:"")}</span>
          <button class="foot-top" onclick="scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">↑</button>
        </div>
      </div>
    </div>
  </footer>`;
}

(function footClock(){
  if(window._footClock) return;
  window._footClock=setInterval(()=>{ const el=document.getElementById("foot-clock"); if(el) el.textContent=nowDhaka(); },1000);
})();

/* newsletter subscribe → stored as a ticket the admin can see */
async function footerSubscribe(e){
  e.preventDefault();
  const email=($("#news-email").value||"").trim();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast("Enter a valid email","warn"); return; }
  try{ await Store.saveTicket({id:"NL"+Date.now().toString(36).toUpperCase(),name:"Newsletter",email,message:"Newsletter subscription.",status:"open",created:Date.now()}); }catch(_){}
  toast("Subscribed — we'll keep you posted!"); $("#news-email").value="";
}

/* contact modal (keeps the support/ticket flow) */
function contactModal(){
  showModal(`<h3>Contact us</h3><p>Send us a message — it reaches the organizers and we'll reply by email.</p>
    <div class="fc-field"><input id="cf-name" placeholder="Your name" autocomplete="name"></div>
    <div class="fc-field"><input id="cf-email" type="email" placeholder="Your email" autocomplete="email"></div>
    <div class="fc-field"><textarea id="cf-msg" placeholder="How can we help?" rows="4"></textarea></div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="cf-send" onclick="submitContact()">Send message</button></div>`);
}
async function submitContact(){
  const name=$("#cf-name").value.trim(), email=$("#cf-email").value.trim(), msg=$("#cf-msg").value.trim();
  if(!name||!email||!msg){ toast("Fill in name, email and message","warn"); return; }
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast("Enter a valid email","warn"); return; }
  const btn=$("#cf-send"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
  try{ await Store.saveTicket({ id:"TK"+Date.now().toString(36).toUpperCase(), name, email, message:msg, status:"open", created:Date.now() }); }catch(e){}
  const r=await Notify.sendContact({name,email,message:msg});
  if(typeof closeModal==="function") closeModal();
  if(r.ok || !r.error) toast("Message sent — we'll get back to you");
  else toast("Saved — we received your message","warn");
}

/* PWA install */
function installApp(){
  const p=window.__pwaInstallPrompt;
  if(p){ p.prompt(); p.userChoice.finally(()=>{ window.__pwaInstallPrompt=null; }); return; }
  if(/iphone|ipad|ipod/i.test(navigator.userAgent)){ toast("On iPhone: tap Share ↑ then 'Add to Home Screen'","info"); return; }
  if(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches){ toast("Already installed on this device","info"); return; }
  toast("Open in Chrome/Edge to install, or use your browser's 'Add to Home screen'","info");
}
