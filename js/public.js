/* ============================================================
   EX-CAP Sports — public.js
   Home + info pages + all registration flows.
   ============================================================ */

/* ---------- form primitives ---------- */
function field(id,label,o={}){
  const{type="text",ph="",req=false,help="",options,val=""}=o;
  const lab=`<label class="fl" for="${id}">${esc(label)} ${req?'<span class="req">*</span>':'<span class="opt">(optional)</span>'}</label>`;
  const helpEl=help?`<div class="help">${esc(help)}</div>`:"";
  let input;
  if(type==="select") input=`<select id="${id}">${options.map(op=>`<option ${op===val?"selected":""}>${esc(op)}</option>`).join("")}</select>`;
  else if(type==="textarea") input=`<textarea id="${id}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;
  else input=`<input id="${id}" type="${type}" placeholder="${esc(ph)}" value="${esc(val)}">`;
  return `${lab}${helpEl}${input}<div class="field-err" id="${id}-err"></div>`;
}
function uploader(id,label,note="PNG/JPG · max 2MB"){
  return `<label class="fl">${esc(label)} <span class="opt">(optional)</span></label>
  <div class="uploader" onclick="$('#${id}').click()"><div class="prev" id="${id}-prev">📷</div>
  <div class="ut"><b id="${id}-name">Click to upload</b><span>${note}</span></div></div>
  <input id="${id}" type="file" accept="image/*" class="hidden" onchange="handleUpload(event,'${id}')">`;
}
const uploadData={};
function handleUpload(e,id){
  const f=e.target.files[0]; if(!f) return;
  if(f.size>2.5*1024*1024){ toast("Image too large — keep under 2MB","warn"); return; }
  const rd=new FileReader();
  rd.onload=()=>{ uploadData[id]=rd.result; const p=$("#"+id+"-prev"); if(p)p.innerHTML=`<img src="${rd.result}">`; const n=$("#"+id+"-name"); if(n)n.textContent=f.name.slice(0,22); };
  rd.readAsDataURL(f);
}
const val=id=>{ const e=$("#"+id); return e?e.value.trim():""; };
function setErr(id,msg){ const e=$("#"+id),er=$("#"+id+"-err"); if(e)e.classList.toggle("err",!!msg); if(er){er.textContent=msg||"";er.classList.toggle("show",!!msg);} }
function validate(rules){ let ok=true,first=null; for(const[id,test,msg] of rules){ const bad=!test(val(id)); setErr(id,bad?msg:""); if(bad){ok=false;first=first||id;} } if(first){const e=$("#"+first);e&&e.scrollIntoView({behavior:"smooth",block:"center"});} return ok; }
const isPhone=v=>/^01[3-9]\d{8}$/.test(v.replace(/\D/g,""))||/^\d{6,15}$/.test(v.replace(/\D/g,""));
const nonEmpty=v=>v.length>0;
const isEmail=v=>!v||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
function stepsBar(steps,active){ return `<div class="steps">${steps.map((s,i)=>`<div class="step ${i===active?'active':''} ${i<active?'done':''}"><div class="b">${i<active?'✓':i+1}</div>${s}</div>${i<steps.length-1?'<div class="sep"></div>':''}`).join("")}</div>`; }

/* phase helper: is registration open? */
function regPhase(){
  const now=Date.now(), open=new Date(App.settings.regOpen).getTime(), close=new Date(App.settings.regDeadline).getTime();
  if(now<open) return "before";
  if(now>close) return "closed";
  return "open";
}

/* ============================================================
   HOME
   ============================================================ */
registerRoute("home",renderHome);
registerRoute("",renderHome);
function renderHome(){
  const s=App.settings, max=s.maxTeams, used=slotsUsed(), remaining=Math.max(0,max-used), pct=Math.min(100,Math.round(used/max*100));
  const confirmed=confirmedTeams();
  const stats=[[max,"Teams"],[max*s.playersPerTeam,"Players"],[2,"Fields"],[31,"Matches"],[20,"Min / match"],[4,"Clubs"]];
  const phase=regPhase();
  const reg=[
    ["⚽","Register a team",`For captains. Build your squad of ${s.playersPerTeam}, invite guests and pay online or at the desk.`,[["Approval","By organizers"],["You get","Team + player passes"]],"register-team"],
    ["🎟️","Team guest","For supporters invited by a registered team using the captain's invite code.",[["Approval","Yes"],["You get","Guest QR pass"]],"register-guest"],
    ["👥","Visitor","For alumni, guardians, club reps and supporters not attached to a team.",[["Approval","Yes"],["You get","Visitor QR pass"]],"register-visitor"],
    ["🎓","Current student","For current SCPSC students. ID collected online, checked at the gate.",[["Approval","Auto, ID at gate"],["You get","Student QR pass"]],"register-student"],
    ["🤝","Volunteer","Join the crew that runs match day. Pick a role; organizers assign your zone and shift.",[["Approval","By organizers"],["You get","Crew pass + duty"]],"register-volunteer"]
  ];
  $("#app").innerHTML=anncHTML()+navHTML("home")+`
  <section class="hero"><div class="pitch-bg"></div>${pitchLines()}
    <div class="wrap hero-in">
      <div>
        <span class="eyebrow"><span class="live"></span>${phase==="open"?"Registration open":phase==="before"?"Registration opening soon":"Registration closed"} · ${fmtDate(s.regDeadline)}</span>
        <h1 class="title">The SCPSC field<br><span class="g">is calling again</span></h1>
        <p class="lead">EX-CAP brings students, players, alumni and the SCPSC community together through football. Build your team, claim a slot and play on home ground.</p>
        <div class="hero-cta">
          <button class="btn btn-primary" onclick="go('register-team')">Register your team</button>
          <button class="btn btn-ghost" onclick="go('register-visitor')">Register as visitor</button>
          <button class="btn btn-line" onclick="go('tournament')">▶ Tournament info</button>
        </div>
        <div class="org-line"><b>Organized by EX-CAP</b> · Supported by SCPSC Business & Career · IT Club · Cyber Hub · Sports Club</div>
      </div>
      <div class="hero-card">
        <div class="hc-top"><span class="hc-label">Kick-off in</span><span class="pill ok">Live</span></div>
        <div class="cd" id="cd-event">${["Days","Hours","Min","Sec"].map(k=>`<div class="cd-cell"><div class="v num">--</div><div class="k">${k}</div></div>`).join("")}</div>
        <div class="cd-cap">until ${fmtDate(s.tournamentDate)} · ${esc(s.venue)}</div>
        <div class="slots">
          <div class="row"><span class="hc-label">Team slots</span><span class="big num"><b>${used}</b> / ${max}</span></div>
          <div class="bar"><i style="width:0" id="slot-bar"></i></div>
          <small><b style="color:var(--pitch)">${remaining}</b> slots remaining</small>
        </div>
      </div>
    </div>
  </section>

  <div class="ball-band"><div class="line"></div><div class="foot-ball ball-roll"></div></div>

  <section class="block"><div class="wrap">
    <div class="cd-strip">
      <div class="cd-mini ${phase!=="before"?"done":""}" data-fmt="compact"><div class="lbl">Registration opens</div><div class="t">—</div><div class="sub">${fmtDate(s.regOpen)}</div></div>
      <div class="cd-mini ${phase==="closed"?"done":""}" data-fmt="compact"><div class="lbl">Registration closes</div><div class="t">—</div><div class="sub">${fmtDate(s.regDeadline)}</div></div>
      <div class="cd-mini" data-fmt="compact"><div class="lbl">Tournament kick-off</div><div class="t">—</div><div class="sub">${fmtDate(s.tournamentDate)}</div></div>
    </div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap">
    <div class="stats">${stats.map(([v,k])=>`<div class="stat reveal"><div class="v num" data-count="${v}">0</div><div class="k">${k}</div></div>`).join("")}</div>
  </div></section>

  <section class="block" id="home-live-sec" style="padding-top:0;display:none"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Happening now</div><h2 class="sec">Live & latest</h2></div>
      <button class="btn btn-line" onclick="go('live')">Full scoreboard →</button></div>
    <div class="match-grid" id="home-live"></div>
  </div></section>

  <section class="block" id="home-champ-sec" style="padding-top:0;display:none"><div class="wrap" id="home-champ"></div></section>

  <section class="block"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Choose your entry</div><h2 class="sec">Register in minutes</h2><p class="sec-sub">Four clear paths. Every approved registration gets a QR pass for gate check-in.</p></div></div>
    <div class="reg-grid">${reg.map(([ic,t,d,meta,r],i)=>`
      <div class="reg-card reveal d${i}" onclick="go('${r}')"><div class="ic">${ic}</div><h3>${t}</h3><p>${d}</p>
        <div class="meta">${meta.map(([a,b])=>`<div>${a}: <b>${b}</b></div>`).join("")}</div>
        <div class="go">Start registration <span class="arr">→</span></div></div>`).join("")}</div>
  </div></section>

  <section class="block" style="background:var(--navy-2)"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Teams entering the field</div><h2 class="sec">Confirmed teams</h2><p class="sec-sub">Approved squads appear here automatically. Private details are never shown publicly.</p></div>
      <button class="btn btn-line" onclick="go('teams')">View all teams</button></div>
    <div class="team-grid">${confirmed.length?confirmed.slice(0,8).map(teamCard).join(""):`<div class="empty-wall">No confirmed teams yet — be the first to claim a slot.<br><br><button class="btn btn-primary" onclick="go('register-team')">Register your team</button></div>`}</div>
  </div></section>

  <section class="block eco-block"><div class="wrap">
    <div class="section-head" style="justify-content:center;text-align:center"><div>
      <div class="kicker">Organized &amp; supported by</div>
      <h2 class="sec">The people behind it</h2>
      <p class="sec-sub" style="margin:10px auto 0">EX-CAP — the alumni association of SCPSC — brings everyone back to the school's own ground. SCPSC is the institution it all started in, and its clubs power the execution on the day.</p>
    </div></div>

    <div class="ecosystem">
      <div class="eco-row">
        <span class="eco-tag organizer">Organizer</span>
        <div class="eco-node node-org reveal">
          <div class="eco-logo">${logoImg("excap","EX")}</div>
          <div class="eco-info"><b>EX-CAP</b><span>Alumni Association of SCPSC</span></div>
          <div class="eco-badge">Hosts &amp; runs the tournament</div>
        </div>
      </div>

      <div class="eco-connector"><span class="dotline"></span><em>is the alumni association of</em><span class="dotline"></span></div>

      <div class="eco-row">
        <span class="eco-tag institution">Institution</span>
        <div class="eco-node node-inst reveal">
          <div class="eco-logo">${logoImg("scpsc","SC")}</div>
          <div class="eco-info"><b>SCPSC</b><span>The school &amp; home ground where it all began</span></div>
          <div class="eco-badge">Venue &amp; host institution</div>
        </div>
      </div>

      <div class="eco-connector"><span class="dotline"></span><em>powered on the day by its clubs</em><span class="dotline"></span></div>

      <div class="eco-row">
        <span class="eco-tag clubs">Supporting clubs of SCPSC</span>
        <div class="eco-clubs">
          ${[["business","Business &amp; Career Club","Sponsorship & operations"],["it","IT Club","Platform & tech"],["cyber","Cyber Hub","Security & media"],["sports","Sports Club","On-field management"]].map(([k,n,role])=>`
            <div class="eco-club reveal"><div class="eco-logo sm">${logoImg(k,initials(n.replace(/&amp;/g,'&')))}</div>
              <div class="eco-info"><b>${n}</b><span>${role}</span></div></div>`).join("")}
        </div>
      </div>
    </div>
  </div></section>
  `+footerHTML();

  registerCountdown($("#cd-event"),s.tournamentDate);
  registerCountdown($$(".cd-mini")[0],s.regOpen);
  registerCountdown($$(".cd-mini")[1],s.regDeadline);
  registerCountdown($$(".cd-mini")[2],s.tournamentDate);
  setTimeout(()=>{const b=$("#slot-bar");if(b)b.style.width=pct+"%";},300);

  // live + champions strips (real-time)
  if(window.clearLiveSubs) clearLiveSubs();
  if(window.Store && Store.subscribeMatches){
    _liveUnsub=Store.subscribeMatches(matches=>{
      const sec=$("#home-live-sec"), wrap=$("#home-live"); if(!wrap) return;
      const liveM=matches.filter(m=>m.status==="live"||m.status==="halftime");
      const done=matches.filter(m=>m.status==="finished").slice(-3).reverse();
      const show=(liveM.length?liveM:done).slice(0,3);
      if(show.length){ sec.style.display=""; wrap.innerHTML=show.map(m=>matchCard(m,liveM.length>0)).join(""); }
      else sec.style.display="none";
    });
    _resUnsub=Store.subscribeResults(res=>{
      const sec=$("#home-champ-sec"), wrap=$("#home-champ"); if(!wrap) return;
      if(res&&res.published&&res.champion){
        sec.style.display="";
        wrap.innerHTML=`<div class="champ-banner"><div class="cb-glow"></div>
          <div class="cb-trophy">🏆</div><div class="cb-label">Champions ${esc(s.edition)}</div>
          <div class="cb-name">${esc(res.champion)}</div>
          ${res.runnerUp?`<div class="cb-sub">Runners-up · ${esc(res.runnerUp)}</div>`:""}
          <button class="btn btn-primary" style="margin-top:16px" onclick="go('results')">See all awards →</button></div>`;
      } else sec.style.display="none";
    });
  }
}
function teamCard(r){
  const d=r.data||{},hue=teamHue(d.teamName);
  const st=r.status==="approved"?["ok","Confirmed"]:r.status==="waitlist"?["wait","Waiting list"]:["rev","Under review"];
  return `<div class="team-card reveal">
    <div class="tc-top"><div class="tc-logo" style="background:${d.logo?'transparent':`hsl(${hue} 70% 45%)`}">${d.logo?`<img src="${d.logo}">`:esc(d.shortName||initials(d.teamName))}</div>
    <div><div class="tc-name">${esc(d.teamName||"Team")}</div><div class="tc-cat">${esc(d.category||"")} ${d.batch?"· "+esc(d.batch):""}</div></div></div>
    <div class="tc-row"><span>Captain</span><b>${esc(d.captainName||"—")}</b></div>
    <div class="tc-row"><span>Players</span><b>${(r.players||[]).length}/${App.settings.playersPerTeam}</b></div>
    <div class="tc-row" style="border-bottom:0;padding-bottom:0"><span>Status</span><span class="pill ${st[0]}">${st[1]}</span></div></div>`;
}

/* ============================================================
   TEAMS / TOURNAMENT / HELP
   ============================================================ */
registerRoute("teams",function(){
  const list=teamRegs().filter(r=>["approved","review","submitted","waitlist"].includes(r.status));
  $("#app").innerHTML=anncHTML()+navHTML("teams")+`<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Teams</h1>
    <p class="ph-sub">${confirmedTeams().length} confirmed · ${list.length} entries · ${Math.max(0,App.settings.maxTeams-slotsUsed())} slots remaining</p></div>
    <div class="team-grid">${list.length?list.map(teamCard).join(""):`<div class="empty-wall">No teams yet.<br><br><button class="btn btn-primary" onclick="go('register-team')">Be the first</button></div>`}</div>
  </div>`+footerHTML();
});
registerRoute("tournament",function(){
  const s=App.settings;
  const rows=[["Format","Group stage → knockouts"],["Teams",s.maxTeams],["Squad size",s.playersPerTeam+" players"],["Fields","2 (parallel matches)"],["Match length","20 minutes"],["Venue",s.venue],["Tournament date",fmtDate(s.tournamentDate)],["Registration",fmtDate(s.regOpen)+" → "+fmtDate(s.regDeadline)]];
  $("#app").innerHTML=anncHTML()+navHTML("tournament")+`<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Tournament format</h1>
    <p class="ph-sub">Groups and fixtures are generated automatically once registration closes.</p></div>
    <div class="form-shell" style="max-width:560px">${rows.map(([k,v])=>`<div class="rv" style="padding:13px 0"><span>${k}</span><b>${esc(String(v))}</b></div>`).join("")}
    <div class="note-box" style="margin-top:20px"><span class="i">📋</span><div>Group draw, fixtures, live scores and the knockout bracket appear here once organizers publish them.</div></div>
    <div class="form-actions" style="justify-content:center"><button class="btn btn-primary" onclick="go('register-team')">Register your team</button></div></div>
  </div>`+footerHTML();
});
registerRoute("help",function(){
  const s=App.settings;
  const faqs=[
    ["How do I register a team?",`Pick “Register a team”, verify your mobile, add team details and ${s.playersPerTeam} players, optionally add guests, pay (bKash online or cash at the desk) and submit. Organizers approve it and your QR passes activate.`],
    ["What's the entry fee?",`৳${s.teamFee} per team. Pay online with bKash, or at the registration desk — the admin records cash/manual payments.`],
    ["Can guests come with my team?",`Yes — up to ${s.guestsPerTeam} guests per team. Add them during registration or share your invite code.`],
    ["I'm a current SCPSC student.",`Use “Current student”. Register online with your student ID; bring the physical card to the gate.`],
    ["When does registration close?",`${fmtDate(s.regDeadline)}. After that, new teams join a waiting list.`]
  ];
  $("#app").innerHTML=anncHTML()+navHTML("help")+`<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Help & FAQ</h1></div>
    <div class="form-shell" style="max-width:680px">${faqs.map(([q,a])=>`<div class="review-sec"><h4 style="color:var(--ink);text-transform:none;font-size:15px;font-family:var(--font-body);font-weight:700">${esc(q)}</h4><p style="color:var(--muted);font-size:14px;margin:6px 0 0">${esc(a)}</p></div>`).join("")}
    <div class="note-box"><span class="i">✉️</span><div>Still stuck? Contact organizers at <b>${esc(cfg.contact.email)}</b>.</div></div></div>
  </div>`+footerHTML();
});

/* ============================================================
   TEAM REGISTRATION (multi-step)
   ============================================================ */
let draft=null;
registerRoute("register-team",()=>renderTeamReg());
function renderTeamReg(step){
  const s=App.settings;
  if(regPhase()==="before") return renderInfo("Registration opens soon","Team registration opens on "+fmtDate(s.regOpen)+". Check back then to claim your slot.","🕓");
  if(slotsUsed()>=s.maxTeams && !draft) return renderInfo("Team slots are full","All "+s.maxTeams+" slots are taken. Contact organizers to join the waiting list.","⏳");
  draft = draft || {data:{},players:Array.from({length:s.playersPerTeam},()=>({status:"empty"})),guests:[],payment:{},step:0};
  const st=typeof step==="number"?step:draft.step; draft.step=st;
  const steps=["Captain","Team","Players","Guests","Payment","Review"];
  const shell=inner=>anncHTML()+navHTML("register-team")+`<div class="wrap page"><div class="page-head">
    <span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Register a team</h1>
    <p class="ph-sub">${s.playersPerTeam} players · entry fee ৳${esc(s.teamFee)} · approval by organizers.</p></div>
    <div class="form-shell">${stepsBar(steps,st)}${inner}</div></div>`+footerHTML();

  if(st===0){
    $("#app").innerHTML=shell(`
      <div class="note-box"><span class="i">📱</span><div>We verify the captain by mobile number. In production this sends an OTP by SMS (SMSQ); in demo mode any 6 digits work.</div></div>
      ${field("cap-phone","Captain mobile number",{type:"tel",ph:"01XXXXXXXXX",req:true,help:"This number manages the whole team."})}
      ${field("cap-otp","Verification code (OTP)",{type:"tel",ph:"Enter 6 digits",req:true})}
      ${field("cap-email","Email",{type:"email",ph:"captain@email.com",help:"Approval email is sent here."})}
      <div class="form-actions"><span></span><button class="btn btn-primary" onclick="teamStep0()">Verify & continue →</button></div>`);
  } else if(st===1){
    const d=draft.data;
    $("#app").innerHTML=shell(`
      <div class="grid2"><div>${field("t-name","Team name",{req:true,ph:"e.g. Batch '18 United",val:d.teamName})}</div><div>${field("t-short","Short tag",{req:true,ph:"B18",val:d.shortName,help:"Up to 4 letters."})}</div></div>
      <div class="grid2"><div>${field("t-cat","Category",{type:"select",options:["Alumni","Batch","Mixed","Open"],val:d.category})}</div><div>${field("t-batch","Batch / year",{ph:"2018",val:d.batch})}</div></div>
      ${field("t-slogan","Team slogan",{ph:"Optional",val:d.slogan})}
      <div class="grid2"><div><label class="fl">Primary colour</label><div class="swatch"><input type="color" id="t-c1" value="${d.c1||'#7c3aed'}"><span class="help" style="margin:0">Main kit</span></div></div>
      <div><label class="fl">Alternate colour</label><div class="swatch"><input type="color" id="t-c2" value="${d.c2||'#db2777'}"><span class="help" style="margin:0">Away kit</span></div></div></div>
      <div class="grid2"><div>${field("t-cap","Captain name",{req:true,val:d.captainName})}</div><div>${field("t-vice","Vice-captain",{val:d.viceName})}</div></div>
      ${uploader("t-logo","Team logo")}
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(0)">← Back</button><button class="btn btn-primary" onclick="teamStep1()">Continue →</button></div>`);
    if(d.logo)$("#t-logo-prev").innerHTML=`<img src="${d.logo}">`;
  } else if(st===2){
    $("#app").innerHTML=shell(`
      <div class="note-box"><span class="i">👥</span><div>Add each player's name and mobile. Add at least 4 to continue; fill all ${s.playersPerTeam} before final submission.</div></div>
      <div id="players">${draft.players.map((p,i)=>playerRow(p,i)).join("")}</div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(1)">← Back</button><button class="btn btn-primary" onclick="teamStep2()">Continue →</button></div>`);
  } else if(st===3){
    $("#app").innerHTML=shell(`
      <div class="note-box"><span class="i">🎟️</span><div>Each team may bring up to <b>${s.guestsPerTeam} guests</b>. Add them now or share your invite code after approval.</div></div>
      <div id="guests">${draft.guests.map((g,i)=>guestRow(g,i)).join("")||'<p style="color:var(--muted);font-size:13.5px;margin-bottom:14px">No guests added yet.</p>'}</div>
      <button class="btn btn-line btn-sm" onclick="addGuestRow()" ${draft.guests.length>=s.guestsPerTeam?'disabled':''}>+ Add guest (${draft.guests.length}/${s.guestsPerTeam})</button>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(2)">← Back</button><button class="btn btn-primary" onclick="renderTeamReg(4)">Continue →</button></div>`);
  } else if(st===4){
    const bkashOn=cfg.bkash.enabled;
    $("#app").innerHTML=shell(`
      <div class="note-box"><span class="i">💳</span><div>Entry fee: <b>৳${esc(s.teamFee)}</b>. Pay instantly with bKash, or submit your manual payment details (the desk records cash too).</div></div>
      <label class="fl">Payment method</label>
      <div class="pay-methods" id="pm">
        <div class="pay-opt ${draft.payment.mode==='bkash'?'sel':''}" onclick="selectPay('bkash')"><div class="ic">📲</div><b>bKash online</b><span>${bkashOn?'Instant':'Sandbox/demo'}</span></div>
        <div class="pay-opt ${draft.payment.mode!=='bkash'?'sel':''}" onclick="selectPay('manual')"><div class="ic">🧾</div><b>Manual / other</b><span>Enter transaction</span></div>
      </div>
      <div id="pay-body"></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(3)">← Back</button><button class="btn btn-primary" onclick="teamStep4()">Continue →</button></div>`);
    selectPay(draft.payment.mode||"manual");
  } else if(st===5){
    const d=draft.data, filled=draft.players.filter(p=>p.name).length;
    $("#app").innerHTML=shell(`
      <div class="review-sec"><h4>Team</h4>
        <div class="rv"><span>Name</span><b>${esc(d.teamName)} (${esc(d.shortName)})</b></div>
        <div class="rv"><span>Category / batch</span><b>${esc(d.category)} · ${esc(d.batch||"—")}</b></div>
        <div class="rv"><span>Captain</span><b>${esc(d.captainName)} · ${esc(draft.capPhone)}</b></div></div>
      <div class="review-sec"><h4>Roster (${filled}/${s.playersPerTeam})</h4>${draft.players.map((p,i)=>`<div class="rv"><span>Player ${i+1}</span><b>${p.name?esc(p.name):'<span style="color:var(--amber)">empty</span>'}</b></div>`).join("")}</div>
      <div class="review-sec"><h4>Guests (${draft.guests.length})</h4>${draft.guests.length?draft.guests.map(g=>`<div class="rv"><span>${esc(g.relation||'Guest')}</span><b>${esc(g.name)}</b></div>`).join(""):'<div class="rv"><span>None added</span><b>—</b></div>'}</div>
      <div class="review-sec"><h4>Payment</h4><div class="rv"><span>Method</span><b>${esc(draft.payment.method||draft.payment.mode)}</b></div><div class="rv"><span>Reference</span><b>${esc(draft.payment.txn||'—')}</b></div><div class="rv"><span>Amount</span><b>৳${esc(s.teamFee)}</b></div></div>
      <div class="note-box"><span class="i">✓</span><div>By submitting you confirm the roster is accurate and your team accepts the tournament rules.</div></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(4)">← Back</button><button class="btn btn-pitch" id="submit-btn" onclick="teamSubmit()">Submit registration ✓</button></div>`);
  }
}
function playerRow(p,i){ return `<div class="player-row"><div class="pn">${i+1}</div>
  <input placeholder="Player ${i+1} name" value="${esc(p.name||'')}" oninput="draft.players[${i}].name=this.value;const r=this.closest('.player-row').querySelector('.st');r.className='st '+(this.value?'green':'gray');r.textContent=this.value?'Ready':'Empty'">
  <input placeholder="Mobile" value="${esc(p.phone||'')}" oninput="draft.players[${i}].phone=this.value">
  <span class="st ${p.name?'green':'gray'}">${p.name?'Ready':'Empty'}</span></div>`; }
function guestRow(g,i){ return `<div class="player-row" style="grid-template-columns:1fr 1fr 1fr auto">
  <input placeholder="Guest name" value="${esc(g.name||'')}" oninput="draft.guests[${i}].name=this.value">
  <input placeholder="Mobile" value="${esc(g.phone||'')}" oninput="draft.guests[${i}].phone=this.value">
  <input placeholder="Relation" value="${esc(g.relation||'')}" oninput="draft.guests[${i}].relation=this.value">
  <button class="btn btn-sm btn-line" onclick="draft.guests.splice(${i},1);renderTeamReg(3)">✕</button></div>`; }
function addGuestRow(){ if(draft.guests.length>=App.settings.guestsPerTeam)return; draft.guests.push({}); renderTeamReg(3); }

function selectPay(mode){
  draft.payment.mode=mode;
  $$("#pm .pay-opt").forEach((el,i)=>el.classList.toggle("sel",(mode==="bkash"&&i===0)||(mode!=="bkash"&&i===1)));
  const body=$("#pay-body"); if(!body)return;
  if(mode==="bkash"){
    body.innerHTML=`<div class="note-box"><span class="i">📲</span><div>${cfg.bkash.enabled?'You will be redirected to bKash to pay ৳'+esc(App.settings.teamFee)+'. After payment you return here automatically.':'bKash is in sandbox/demo mode. For now, continue and the payment is marked pending — switch to live in config when ready.'}</div></div>`;
  } else {
    const p=draft.payment;
    body.innerHTML=`<div class="grid2"><div>${field("p-method","Method",{type:"select",options:App.settings.paymentNumbers.map(n=>n.method).concat(["Bank","Cash","Other"]),val:p.method})}</div><div>${field("p-txn","Transaction ID",{req:true,ph:"e.g. 9X8Y7Z",val:p.txn})}</div></div>
      <div class="note-box" style="margin-top:8px"><span class="i">🔢</span><div>Send to: ${App.settings.paymentNumbers.map(n=>`<b>${esc(n.method)}</b> ${esc(n.number)}`).join(" · ")}</div></div>
      <div class="grid2"><div>${field("p-sender","Sender number",{type:"tel",req:true,ph:"Number you paid from",val:p.sender})}</div><div>${field("p-date","Payment date",{type:"date",req:true,val:p.date})}</div></div>
      ${uploader("p-shot","Payment screenshot")}`;
    if(p.shot)$("#p-shot-prev").innerHTML=`<img src="${p.shot}">`;
  }
}
function teamStep0(){
  if(!validate([["cap-phone",isPhone,"Enter a valid mobile number"],["cap-otp",v=>v.replace(/\D/g,"").length>=6,"Enter the 6-digit code"]]))return;
  if(teamRegs().some(r=>r.data.captainPhone===val("cap-phone"))){ setErr("cap-phone","This number already registered a team"); return; }
  draft.capPhone=val("cap-phone"); draft.capEmail=val("cap-email"); renderTeamReg(1);
}
function teamStep1(){
  if(!validate([["t-name",nonEmpty,"Team name is required"],["t-short",nonEmpty,"Short tag is required"],["t-cap",nonEmpty,"Captain name is required"]]))return;
  if(teamRegs().some(r=>(r.data.teamName||"").toLowerCase()===val("t-name").toLowerCase())){ setErr("t-name","A team with this name exists"); return; }
  draft.data={teamName:val("t-name"),shortName:val("t-short").slice(0,4).toUpperCase(),category:val("t-cat"),batch:val("t-batch"),slogan:val("t-slogan"),c1:$("#t-c1").value,c2:$("#t-c2").value,captainName:val("t-cap"),viceName:val("t-vice"),captainPhone:draft.capPhone,email:draft.capEmail,logo:uploadData["t-logo"]||draft.data.logo};
  renderTeamReg(2);
}
function teamStep2(){ if(draft.players.filter(p=>p.name).length<4){ toast("Add at least 4 players","warn"); return; } renderTeamReg(3); }
function teamStep4(){
  if(draft.payment.mode==="bkash"){ draft.payment={mode:"bkash",method:"bKash",txn:"(online)"}; renderTeamReg(5); return; }
  if(!validate([["p-txn",nonEmpty,"Transaction ID is required"],["p-sender",isPhone,"Enter the sender number"],["p-date",nonEmpty,"Select the payment date"]]))return;
  if(App.regs.some(r=>r.payment?.txn && r.payment.txn===val("p-txn"))){ setErr("p-txn","This transaction ID was already used"); return; }
  draft.payment={mode:"manual",method:val("p-method"),txn:val("p-txn"),sender:val("p-sender"),date:val("p-date"),shot:uploadData["p-shot"]};
  renderTeamReg(5);
}
async function teamSubmit(){
  const btn=$("#submit-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
  const s=App.settings;
  const id=await Store.nextId("team","EXCAP-FT"+s.edition.slice(-2)+"-T",3);
  const rec={ id,type:"team",status:"review",created:Date.now(),
    data:draft.data, captainEmail:draft.capEmail,
    players:draft.players.filter(p=>p.name).map(p=>({name:p.name,phone:p.phone,status:"registered"})),
    guests:draft.guests.filter(g=>g.name),
    payment:draft.payment, paymentStatus:draft.payment.mode==="bkash"?"pending":"submitted",
    contact:draft.capPhone };

  // bKash online path: create payment then redirect
  if(draft.payment.mode==="bkash" && cfg.bkash.enabled){
    await Store.saveReg(rec); App.regs.unshift(rec);
    try{
      sessionStorage.setItem("excap_pending_reg",id);
      const {bkashURL}=await Bkash.createPayment({amount:s.teamFee, ref:rec.contact, regId:id});
      location.href=bkashURL; return;
    }catch(e){ toast("bKash unavailable — saved as pending","warn"); }
  }
  await Store.saveReg(rec); App.regs.unshift(rec); draft=null; renderConfirm("team",rec);
}

/* ============================================================
   GUEST / VISITOR / STUDENT
   ============================================================ */
registerRoute("register-guest",function(){
  $("#app").innerHTML=anncHTML()+navHTML("register-team")+`<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
    <h1 class="ph">Team guest</h1><p class="ph-sub">Attending with a registered team. You'll need the invite code from the captain.</p></div>
    <div class="form-shell">
      ${field("g-code","Team invite code",{req:true,ph:"EXCAP-FT26-T001",help:"Ask your captain."})}
      ${field("g-name","Full name",{req:true})}
      <div class="grid2"><div>${field("g-phone","Mobile",{type:"tel",req:true,ph:"01XXXXXXXXX"})}</div><div>${field("g-cat","Category",{type:"select",options:["Family","Friend","Supporter","Other"]})}</div></div>
      ${field("g-relation","Relationship with team",{ph:"e.g. captain's family"})}
      ${field("g-email","Email",{type:"email"})}
      ${uploader("g-photo","Photo")}
      ${field("g-rules","",{type:"select",options:["I accept the venue rules","I do not accept"],help:"Venue rules acceptance"})}
      <div class="form-actions"><span></span><button class="btn btn-pitch" id="submit-btn" onclick="submitGuest()">Submit ✓</button></div></div>
  </div>`+footerHTML();
});
async function submitGuest(){
  if(!validate([["g-code",nonEmpty,"Invite code required"],["g-name",nonEmpty,"Name required"],["g-phone",isPhone,"Valid mobile required"],["g-email",isEmail,"Valid email"]]))return;
  const team=teamRegs().find(r=>r.id===val("g-code").toUpperCase());
  if(!team){ setErr("g-code","No team found for this code"); return; }
  if($("#g-rules").value.startsWith("I do not")){ toast("You must accept the venue rules","warn"); return; }
  const btn=$("#submit-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
  const id=await Store.nextId("guest","EXCAP-FT"+App.settings.edition.slice(-2)+"-G",4);
  const rec={id,type:"guest",status:"review",created:Date.now(),data:{name:val("g-name"),category:val("g-cat"),relation:val("g-relation"),email:val("g-email"),photo:uploadData["g-photo"],teamId:team.id,teamName:team.data.teamName},contact:val("g-phone")};
  await Store.saveReg(rec); App.regs.unshift(rec); renderConfirm("guest",rec);
}
registerRoute("register-visitor",function(){
  $("#app").innerHTML=anncHTML()+navHTML("register-team")+`<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
    <h1 class="ph">Visitor registration</h1><p class="ph-sub">For alumni, guardians, club reps and supporters not attached to a team.</p></div>
    <div class="form-shell">
      ${field("v-name","Full name",{req:true})}
      <div class="grid2"><div>${field("v-phone","Mobile",{type:"tel",req:true,ph:"01XXXXXXXXX"})}</div><div>${field("v-cat","Category",{type:"select",options:["EX-CAP member","Ex-student","Parent / guardian","Invited guest","Club representative","General supporter","Other"]})}</div></div>
      <div class="grid2"><div>${field("v-batch","SCPSC batch (if any)",{ph:"2015"})}</div><div>${field("v-email","Email",{type:"email"})}</div></div>
      ${uploader("v-photo","Photo")}
      ${field("v-rules","",{type:"select",options:["I accept the event rules","I do not accept"],help:"Event rules acceptance"})}
      <div class="form-actions"><span></span><button class="btn btn-pitch" id="submit-btn" onclick="submitVisitor()">Submit ✓</button></div></div>
  </div>`+footerHTML();
});
async function submitVisitor(){
  if(!validate([["v-name",nonEmpty,"Name required"],["v-phone",isPhone,"Valid mobile required"],["v-email",isEmail,"Valid email"]]))return;
  if($("#v-rules").value.startsWith("I do not")){ toast("You must accept the event rules","warn"); return; }
  const btn=$("#submit-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
  const id=await Store.nextId("visitor","EXCAP-FT"+App.settings.edition.slice(-2)+"-V",4);
  const rec={id,type:"visitor",status:"review",created:Date.now(),data:{name:val("v-name"),category:val("v-cat"),batch:val("v-batch"),email:val("v-email"),photo:uploadData["v-photo"]},contact:val("v-phone")};
  await Store.saveReg(rec); App.regs.unshift(rec); renderConfirm("visitor",rec);
}
registerRoute("register-student",function(){
  $("#app").innerHTML=anncHTML()+navHTML("register-team")+`<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
    <h1 class="ph">Current student</h1><p class="ph-sub">For current SCPSC students. Register online; student ID checked at the gate.</p></div>
    <div class="form-shell">
      <div class="note-box"><span class="i">🎓</span><div>Bring your valid SCPSC student ID on event day. Your QR pass is scanned and ID checked together.</div></div>
      ${field("s-name","Full name",{req:true})}
      <div class="grid2"><div>${field("s-id","Student ID",{req:true,ph:"Roll / ID"})}</div><div>${field("s-class","Class / dept",{req:true,ph:"e.g. HSC 1st year"})}</div></div>
      <div class="grid2"><div>${field("s-phone","Mobile",{type:"tel",req:true,ph:"01XXXXXXXXX"})}</div><div>${field("s-email","Email",{type:"email"})}</div></div>
      ${uploader("s-photo","Photo")}
      ${field("s-rules","",{type:"select",options:["I accept the event rules","I do not accept"],help:"Event rules acceptance"})}
      <div class="form-actions"><span></span><button class="btn btn-pitch" id="submit-btn" onclick="submitStudent()">Submit ✓</button></div></div>
  </div>`+footerHTML();
});
async function submitStudent(){
  if(!validate([["s-name",nonEmpty,"Name required"],["s-id",nonEmpty,"Student ID required"],["s-class",nonEmpty,"Class required"],["s-phone",isPhone,"Valid mobile required"],["s-email",isEmail,"Valid email"]]))return;
  if($("#s-rules").value.startsWith("I do not")){ toast("You must accept the event rules","warn"); return; }
  const btn=$("#submit-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
  const id=await Store.nextId("student","EXCAP-FT"+App.settings.edition.slice(-2)+"-S",4);
  const rec={id,type:"student",status:"approved",created:Date.now(),data:{name:val("s-name"),studentId:val("s-id"),class:val("s-class"),email:val("s-email"),photo:uploadData["s-photo"]},contact:val("s-phone")};
  await Store.saveReg(rec); App.regs.unshift(rec);
  Notify.onApproved(rec,App.settings); // students auto-approved → notify
  renderConfirm("student",rec);
}

/* ---------- VOLUNTEER ---------- */
registerRoute("register-volunteer",function(){
  const roles=App.settings.volunteerRoles||[];
  $("#app").innerHTML=anncHTML()+navHTML("register-team")+`<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
    <h1 class="ph">Volunteer registration</h1><p class="ph-sub">Join the crew that makes match day run. Organizers review and assign you a role and zone.</p></div>
    <div class="form-shell">
      <div class="note-box"><span class="i">🤝</span><div>Tell us where you'd like to help. You'll get an email + SMS once an organizer confirms your role and shift.</div></div>
      ${field("vol-name","Full name",{req:true})}
      <div class="grid2"><div>${field("vol-phone","Mobile",{type:"tel",req:true,ph:"01XXXXXXXXX"})}</div><div>${field("vol-email","Email",{type:"email",help:"Confirmation is sent here."})}</div></div>
      <div class="grid2"><div>${field("vol-role","Preferred role",{type:"select",options:roles})}</div><div>${field("vol-batch","SCPSC batch (if any)",{ph:"2018"})}</div></div>
      <div class="grid2"><div>${field("vol-avail","Availability",{type:"select",options:["Full day","Morning only","Afternoon only","Flexible"]})}</div><div>${field("vol-tshirt","T-shirt size",{type:"select",options:["S","M","L","XL","XXL"]})}</div></div>
      ${field("vol-exp","Relevant experience",{type:"textarea",ph:"Optional — past events, skills, etc."})}
      ${field("vol-emergency","Emergency contact",{type:"tel",ph:"Family member's number"})}
      ${uploader("vol-photo","Photo")}
      ${field("vol-rules","",{type:"select",options:["I agree to volunteer guidelines","I do not agree"],help:"Volunteer guidelines"})}
      <div class="form-actions"><span></span><button class="btn btn-pitch" id="submit-btn" onclick="submitVolunteer()">Submit ✓</button></div></div>
  </div>`+footerHTML();
});
async function submitVolunteer(){
  if(!validate([["vol-name",nonEmpty,"Name required"],["vol-phone",isPhone,"Valid mobile required"],["vol-email",isEmail,"Valid email"]]))return;
  if($("#vol-rules").value.startsWith("I do not")){ toast("You must agree to the volunteer guidelines","warn"); return; }
  const btn=$("#submit-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
  const id=await Store.nextId("volunteer","EXCAP-FT"+App.settings.edition.slice(-2)+"-VL",3);
  const rec={id,type:"volunteer",status:"review",created:Date.now(),
    data:{name:val("vol-name"),email:val("vol-email"),preferredRole:val("vol-role"),batch:val("vol-batch"),
      availability:val("vol-avail"),tshirt:val("vol-tshirt"),experience:val("vol-exp"),emergency:val("vol-emergency"),photo:uploadData["vol-photo"],
      assignedRole:"",assignedZone:"",shift:"",dutyStatus:"Pending"},
    contact:val("vol-phone")};
  await Store.saveReg(rec); App.regs.unshift(rec); renderConfirm("volunteer",rec);
}

/* ============================================================
   CONFIRMATION + bKash return handling
   ============================================================ */
function renderConfirm(type,rec){
  const titles={team:"Team registration submitted",guest:"Guest registration submitted",visitor:"Visitor registration submitted",student:"Student registration submitted",volunteer:"Volunteer application submitted"};
  const name=rec.data.teamName||rec.data.name||"You";
  const approved=rec.status==="approved";
  const msg=approved?"You're confirmed. Show this QR pass at the gate.":"Your registration is with the organizers for review. You'll get an email and SMS once it's approved, and your QR pass will activate.";
  $("#app").innerHTML=navHTML("")+`<div class="wrap page"><div class="confirm">
    <div class="tick">${approved?'✓':'🕓'}</div><h1 class="ph" style="font-size:30px">${titles[type]}</h1>
    <p class="ph-sub" style="margin:12px auto 0">${msg}</p>
    <div style="margin-top:18px"><div style="font-size:12px;color:var(--muted-2);text-transform:uppercase;letter-spacing:.1em">Your registration ID</div><div class="id-chip">${rec.id}</div></div>
    <div class="ticket"><div class="tk-top"><b>${esc(type)} pass</b><span class="pill ${approved?'ok':'rev'}" style="background:rgba(255,255,255,.18);color:#fff;border:0">${approved?'Confirmed':'Pending'}</span></div>
      <div class="tk-body"><div class="qr">${qrSvg(rec.id)}</div><div class="tk-info">
        <div class="l">Name</div><div class="v">${esc(name)}</div>
        <div class="l">Venue · Date</div><div class="v">${esc(App.settings.venue)} · ${fmtDate(App.settings.tournamentDate)}</div>
        <div class="l">ID</div><div class="v num">${rec.id}</div></div></div></div>
    <div class="form-actions" style="justify-content:center;margin-top:26px">
      <button class="btn btn-ghost" onclick="go('home')">Back to home</button>
      <button class="btn btn-primary" onclick="go('teams')">View teams</button></div>
  </div></div>`+footerHTML();
}
function renderInfo(title,msg,icon){
  $("#app").innerHTML=navHTML("")+`<div class="wrap page"><div class="confirm">
    <div class="tick" style="background:rgba(245,165,36,.14);border-color:var(--amber)">${icon}</div>
    <h1 class="ph" style="font-size:28px">${title}</h1><p class="ph-sub" style="margin:12px auto 0">${msg}</p>
    <div class="form-actions" style="justify-content:center;margin-top:24px"><button class="btn btn-primary" onclick="go('home')">Back to home</button></div>
  </div></div>`+footerHTML();
}

/* On any page load, if we returned from bKash, finish the payment. */
(async function handleBkashReturn(){
  const {paymentID,status}=Bkash.readCallback();
  if(!paymentID) return;
  const regId=sessionStorage.getItem("excap_pending_reg");
  history.replaceState({},"",location.pathname+location.hash);
  if(status!=="success"){ toast("bKash payment "+(status||"cancelled"),"warn"); return; }
  try{
    const out=await Bkash.executePayment(paymentID);
    await Store.ready; const rec=await Store.getReg(regId);
    if(rec){ rec.paymentStatus = out.transactionStatus==="Completed"?"verified":"pending"; rec.payment.txn=out.trxID||paymentID; await Store.saveReg(rec); }
    toast("bKash payment "+(out.transactionStatus||"received"));
  }catch(e){ toast("Could not confirm bKash payment","err"); }
})();