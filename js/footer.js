/* ============================================================
   EX-CAP Sports — footer.js  (standalone, manage on its own)
   Rich site footer: brand, links, contact/support, club credits,
   developer credit, socials. Reads live values from App.settings /
   config so editing the admin panel / config.js updates it.
   Exposes: footerHTML(), submitContact(), socialLinks(), svgIcon()
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
    return Object.entries(map||{}).filter(([,u])=>u&&!u.endsWith("//")&&u!=="https://"&&u!=="mailto:hello@example.com").map(([k,u])=>
      `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(k)}">${svgIcon(k)}</a>`).join("");
  }
  
  /* club credits (SCPSC is venue only; the clubs get the credit) */
  function footerClubs(){
    const clubs=[
      ["business","Business &amp; Career Club","Sponsorship & operations"],
      ["it","IT Club","Platform & technology"],
      ["cyber","Cyber Hub","Security & media"],
      ["sports","Sports Club","On-field management"]
    ];
    return clubs.map(([k,n,role])=>`<div class="fclub">
      <div class="fclub-logo">${logoImg(k,initials(n.replace(/&amp;/g,'&')))}</div>
      <div class="fclub-info"><b>${n}</b><span>${role}</span></div></div>`).join("");
  }
  
  function footerHTML(){
    const c=cfg.contact, d=cfg.developer, s=(App.settings||cfg.settings);
    const tel=(c.phone||"").replace(/[^\d+]/g,"");
    const phase=(typeof regPhase==="function")?regPhase():"open";
    const statusTxt=phase==="open"?"Registration open":phase==="before"?"Opening soon":"Registration closed";
    return `<footer class="site-foot">
      <div class="foot-aurora" aria-hidden="true"></div>
      <div class="foot-pitch" aria-hidden="true">${pitchLines()}</div>
  
      <div class="wrap foot-cta">
        <div class="foot-cta-inner">
          <div class="fc-copy">
            <span class="foot-kick">⚽ Kick-off ${fmtDate(s.tournamentDate)}</span>
            <h2>Your team belongs on the <span class="g">field</span></h2>
            <p>Build your squad, claim one of the ${s.maxTeams} slots and join the EX-CAP reunion tournament.</p>
          </div>
          <div class="fc-actions">
            <button class="btn btn-primary" onclick="go('register-team')">Register your team →</button>
            <button class="btn foot-ghost" onclick="go('live')">▶ Live scores</button>
          </div>
        </div>
      </div>
  
      <div class="wrap foot-cols">
        <div class="foot-brand">
          <div class="brand"><div class="mark">${logoImg("excap","EX")}</div><div><b>EX-CAP</b><span>Alumni Association of SCPSC</span></div></div>
          <p class="desc">The EX-CAP reunion football tournament — bringing alumni and current students back together on the field.</p>
          <div class="foot-info">
            <div class="fi-row"><span class="fi-ic">📍</span> Venue: <b>${esc(s.venue||"SCPSC field")}</b></div>
            <div class="fi-row"><span class="fi-ic">📅</span> ${fmtDate(s.tournamentDate)}</div>
            <div class="fi-row"><span class="fi-stat ${phase}"></span> ${statusTxt}</div>
          </div>
          <div class="socials">${socialLinks(cfg.socials,"soc")}</div>
        </div>
  
        <div class="foot-links">
          <div class="fl-col">
            <h5>Tournament</h5>
            <a onclick="go('home')">Home</a>
            <a onclick="go('live')">Live scoreboard</a>
            <a onclick="go('fixtures')">Fixtures</a>
            <a onclick="go('results')">Champions</a>
            <a onclick="go('teams')">Teams</a>
          </div>
          <div class="fl-col">
            <h5>Register</h5>
            <a onclick="go('register-team')">Team</a>
            <a onclick="go('register-guest')">Guest</a>
            <a onclick="go('register-visitor')">Visitor</a>
            <a onclick="go('register-student')">Student</a>
            <a onclick="go('register-volunteer')">Volunteer</a>
          </div>
          <div class="fl-col">
            <h5>EX-CAP</h5>
            <a href="https://excapscpsc.com" target="_blank" rel="noopener">Official site ↗</a>
            <a href="https://excapscpsc.com/login" target="_blank" rel="noopener">Member portal ↗</a>
            <a onclick="go('help')">Help &amp; FAQ</a>
            <a onclick="go('help')">Rules &amp; terms</a>
            <a onclick="go('admin')" class="lock">🔐 Organizer login</a>
          </div>
        </div>
  
        <div class="foot-contact">
          <h5>Contact &amp; support</h5>
          <div class="fc-field"><input id="cf-name" placeholder="Your name" autocomplete="name"></div>
          <div class="fc-field"><input id="cf-email" type="email" placeholder="Your email" autocomplete="email"></div>
          <div class="fc-field"><textarea id="cf-msg" placeholder="How can we help?" rows="3"></textarea></div>
          <div class="fc-btns">
            <button class="btn btn-primary" id="cf-send" onclick="submitContact()">Send message</button>
            <button class="btn foot-ghost" onclick="go('help')">Support</button>
          </div>
          <div class="fc-direct">
            <a href="mailto:${esc(c.email)}">${svgIcon("email")} ${esc(c.email)}</a>
            <a href="tel:${esc(tel)}"><span class="fi-ic">☎</span> ${esc(c.phone)}</a>
          </div>
          <div class="emergency"><span class="ed">●</span> Event-day hotline: <b>${esc(c.emergency)}</b></div>
        </div>
      </div>
  
      <div class="wrap foot-clubs">
        <div class="fclubs-head"><span class="kicker">Supported by</span><h4>The SCPSC clubs powering match day</h4></div>
        <div class="fclubs-grid">${footerClubs()}</div>
      </div>
  
      <div class="wrap"><div class="dev-card"><div class="dev-inner">
        <div class="dev-glow" aria-hidden="true"></div>
        <div class="dev-left">
          <div class="dev-ava">${initials(d.name)}</div>
          <div class="dev-meta"><span class="l">Crafted &amp; developed by</span><b>${esc(d.name)}</b><span class="role">${esc(d.role)}</span></div>
        </div>
        <div class="dev-right">
          <span class="dev-tag"><span class="dot"></span> Available for projects</span>
          <div class="dev-socials">${socialLinks(d.socials,"soc")}</div>
        </div>
      </div></div></div>
  
      <div class="wrap foot-bottom">
        <span>© ${new Date().getFullYear()} EX-CAP · Alumni Association of SCPSC. All rights reserved.</span>
        <span class="links">
          <a onclick="go('help')">Privacy</a>
          <a onclick="go('help')">Rules</a>
          <a href="https://excapscpsc.com" target="_blank" rel="noopener">excapscpsc.com</a>
        </span>
      </div>
    </footer>`;
  }
  
  async function submitContact(){
    const name=$("#cf-name").value.trim(), email=$("#cf-email").value.trim(), msg=$("#cf-msg").value.trim();
    if(!name||!email||!msg){ toast("Fill in name, email and message","warn"); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast("Enter a valid email","warn"); return; }
    const btn=$("#cf-send"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
    const r=await Notify.sendContact({name,email,message:msg});
    btn.disabled=false; btn.textContent="Send message";
    if(r.ok){ toast("Message sent — we'll get back to you"); $("#cf-name").value=$("#cf-email").value=$("#cf-msg").value=""; }
    else if(r.skipped) toast("Contact form not configured yet (EmailJS)","warn");
    else toast("Could not send — try emailing us instead","err");
  }