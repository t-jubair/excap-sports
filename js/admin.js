/* ============================================================
   EX-CAP Sports — admin.js
   Organizer control panel. Approving a registration fires the
   approval email (EmailJS) + SMS (SMSQ via serverless).
   ============================================================ */
   const LOGO_SLOTS=[
    {key:"excap",name:"EX-CAP",sub:"Main organizer"},
    {key:"tournament",name:"Tournament",sub:"Event logo"},
    {key:"scpsc",name:"SCPSC",sub:"Venue / institution"},
    {key:"business",name:"Business & Career",sub:"Supporting club"},
    {key:"sports",name:"Sports Club",sub:"Supporting club"}
  ];
  let adminTab="dashboard", regFilter="all";
  
  registerRoute("admin",renderAdmin);
  function renderAdmin(){
    if(!Store.user) return renderAdminLogin();
    const tabs=[["dashboard","📊","Dashboard"],["scoreboard","🏟️","Scoreboard"],["results","🏆","Results & awards"],["checkin","📲","Check-in"],["teams","⚽","Teams"],["registrations","📋","Registrations"],["volunteers","🤝","Volunteers"],["messages","💬","Messages"],["payments","💳","Payments"],["manual","🧾","Record payment"],["broadcast","📡","Broadcast center"],["branding","🎨","Branding & logos"],["announcement","📣","Announcement"],["settings","⚙️","Settings"],["profile","👤","My profile"],["log","🗒️","Activity log"]];
    const me=Store.adminInfo();
    $("#app").innerHTML=`<div class="admin-shell">
      <aside class="admin-side" id="aside">
        <div class="brand"><div class="mark">${logoImg("excap","EX")}</div><div><b>EX-CAP</b><span>Control panel</span></div></div>
        <nav class="admin-nav">${tabs.map(([k,ic,l])=>`<a class="${adminTab===k?'active':''}" onclick="adminTab='${k}';renderAdmin();$('#aside').classList.remove('open')"><span class="ic">${ic}</span>${l}</a>`).join("")}</nav>
        <div style="margin-top:18px;border-top:1px solid var(--line-soft);padding-top:14px">
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:6px">
            <div class="dev-ava" style="width:34px;height:34px;border-radius:10px;font-size:13px">${(Store._profile&&Store._profile.photo)?`<img src="${Store._profile.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`:initials(me.name)}</div>
            <div style="min-width:0"><b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(me.name)}</b><span style="font-size:11px;color:var(--muted-2)">${esc((Store._profile&&Store._profile.role)||"Organizer")}</span></div>
          </div>
          <a class="" style="display:flex;gap:11px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer;align-items:center" onclick="go('home')"><span class="ic">🌐</span>View public site</a>
          <a style="display:flex;gap:11px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer;align-items:center" onclick="adminSignOut()"><span class="ic">🚪</span>Sign out</a>
        </div></aside>
      <main class="admin-main">
        <div class="admin-top">
          <button class="hamb" style="display:block" onclick="$('#aside').classList.add('open')">☰</button>
          <h1>${tabs.find(t=>t[0]===adminTab)[2]}</h1>
          <button class="btn btn-line btn-sm" onclick="refreshAdmin()">↻ Refresh</button>
        </div><div id="admin-body"></div></main></div>`;
    if(window._ciScanner){ _ciScanner.stop&&_ciScanner.stop(); window._ciScanner=null; }
    if(window._admMatchUnsub){ _admMatchUnsub(); window._admMatchUnsub=null; }
    ({dashboard:adminDashboard,scoreboard:adminScoreboard,results:adminResults,checkin:adminCheckin,teams:adminTeams,registrations:adminRegistrations,volunteers:adminVolunteers,messages:adminMessages,payments:adminPayments,manual:adminManual,broadcast:adminBroadcast,branding:adminBranding,announcement:adminAnnouncement,settings:adminSettings,profile:adminProfile,log:adminLog}[adminTab])();
  }
  async function refreshAdmin(){ App.regs=await Store.listRegs(); App.settings=await Store.getSettings(); App.logos=await Store.getLogos(); renderAdmin(); toast("Data refreshed"); }
  async function adminSignOut(){ await Store.logAction("Signed out"); App.isAdmin=false; App.regs=[]; await Store.adminLogout(); go("home"); }
  
  function renderAdminLogin(){
    const local=Store.mode==="local";
    $("#app").innerHTML=`<div style="min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 500px at 50% 0,rgba(124,58,237,.3),transparent),var(--navy);padding:20px">
      <div class="form-shell" style="max-width:380px;text-align:center">
        <div class="brand" style="justify-content:center;margin-bottom:14px"><div class="mark" style="height:54px;width:54px;border-radius:15px;font-size:20px">${logoImg("excap","EX")}</div></div>
        <h1 class="ph" style="font-size:24px">Organizer login</h1>
        <p class="ph-sub" style="margin:8px auto 20px">EX-CAP control panel</p>
        ${field("adm-email","Email",{type:"email",ph:"admin@excapscpsc.com"})}
        ${field("adm-pass","Password",{type:"password",ph:"Password"})}
        ${local?'<div class="help" style="text-align:left;margin-top:10px">Demo mode: any email + password <b>excap2026</b></div>':''}
        <button class="btn btn-primary btn-block" style="margin-top:18px" id="login-btn" onclick="adminLogin()">Sign in</button>
        <a onclick="go('home')" style="display:block;margin-top:16px;color:var(--muted);font-size:13px;cursor:pointer">← Back to public site</a>
      </div></div>`;
    const inp=$("#adm-pass"); inp&&inp.addEventListener("keydown",e=>{if(e.key==="Enter")adminLogin();});
  }
  async function adminLogin(){
    const btn=$("#login-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
    try{
      await Store.adminLogin(val("adm-email"),val("adm-pass"));
      await Store.getProfile();
      try{ App.regs = await Store.listRegs(); }catch(e){ App.regs=[]; }
      App.isAdmin=true;
      await Store.logAction("Signed in");
      renderAdmin();
    }
    catch(e){ btn.disabled=false; btn.textContent="Sign in"; setErr("adm-pass",e.message||"Login failed"); }
  }
  
  /* ---------- dashboard ---------- */
  function adminDashboard(){
    const t=teamRegs(),pending=App.regs.filter(r=>r.status==="review").length,
      players=t.reduce((a,r)=>a+(r.players?.length||0),0),
      guests=App.regs.filter(r=>r.type==="guest").length+t.reduce((a,r)=>a+(r.guests?.length||0),0),
      visitors=App.regs.filter(r=>r.type==="visitor").length,
      students=App.regs.filter(r=>r.type==="student").length,
      volunteers=App.regs.filter(r=>r.type==="volunteer").length,
      payPending=t.filter(r=>r.paymentStatus&&r.paymentStatus!=="verified").length;
    const kpis=[["accent",slotsUsed()+" / "+App.settings.maxTeams,"Team slots used"],["",confirmedTeams().length,"Confirmed teams"],["",pending,"Pending review"],["",players,"Players"],["",guests,"Guests"],["",visitors,"Visitors"],["",students,"Students"],["",volunteers,"Volunteers"],["",payPending,"Payments to verify"]];
    $("#admin-body").innerHTML=`<div class="kpis">${kpis.map(([c,v,k])=>`<div class="kpi ${c}"><div class="v num">${v}</div><div class="k">${k}</div></div>`).join("")}</div>
      <div class="panel"><h3>Latest registrations</h3><p class="ph-help">Newest submissions across all categories.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Status</th><th>Submitted</th></tr></thead><tbody>
        ${App.regs.slice(0,10).map(r=>`<tr><td class="num">${r.id}</td><td style="text-transform:capitalize">${r.type}</td><td>${esc(r.data.teamName||r.data.name)}</td><td>${statusPill(r.status)}</td><td>${fmtDateTime(r.created)}</td></tr>`).join("")||`<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No registrations yet.</td></tr>`}
        </tbody></table></div></div>`;
  }
  function statusPill(s){ const m={approved:["ok","Approved"],review:["rev","Review"],submitted:["rev","Submitted"],waitlist:["wait","Waitlist"],rejected:["red","Rejected"]}; const[c,l]=m[s]||["rev",s]; return `<span class="pill ${c}">${l}</span>`; }
  
  /* ---------- teams (with approved details) ---------- */
  function adminTeams(){
    const list=teamRegs();
    $("#admin-body").innerHTML=`<div class="panel"><h3>Teams</h3><p class="ph-help">Approve to confirm a team — it appears publicly and the captain is notified by email + SMS. Click View for full roster.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Team</th><th>Captain</th><th>Players</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${list.map(r=>`<tr>
        <td class="num">${r.id}</td>
        <td class="nm"><b>${esc(r.data.teamName)}</b><span>${esc(r.data.category||"")} ${r.data.batch?"· "+esc(r.data.batch):""}</span></td>
        <td>${esc(r.data.captainName||"—")}<br><span style="color:var(--muted-2);font-size:12px">${esc(r.contact||"")}</span></td>
        <td>${(r.players||[]).length}/${App.settings.playersPerTeam}</td>
        <td><span class="pill ${r.paymentStatus==='verified'?'ok':'rev'}">${esc(r.paymentStatus||'—')}</span></td>
        <td>${statusPill(r.status)}</td>
        <td>${actions(r)}</td></tr>`).join("")||`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No teams yet.</td></tr>`}
      </tbody></table></div></div>`;
  }
  function adminRegistrations(){
    const types=["all","team","guest","visitor","student","volunteer"];
    const list=regFilter==="all"?App.regs:App.regs.filter(r=>r.type===regFilter);
    $("#admin-body").innerHTML=`<div class="tabs">${types.map(t=>`<button class="tab ${regFilter===t?'active':''}" onclick="regFilter='${t}';adminRegistrations()">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}</div>
      <div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${list.map(r=>`<tr><td class="num">${r.id}</td>
        <td class="nm"><b>${esc(r.data.teamName||r.data.name)}</b><span>${r.type==="team"?(r.players?.length||0)+" players":esc(r.data.category||r.data.class||r.data.teamName||"")}</span></td>
        <td style="text-transform:capitalize">${r.type}</td><td>${esc(r.contact||"—")}</td><td>${statusPill(r.status)}</td>
        <td>${actions(r)}</td></tr>`).join("")||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Nothing here yet.</td></tr>`}
      </tbody></table></div></div>`;
  }
  function actions(r){
    return `<div style="display:flex;gap:6px;flex-wrap:wrap">
      ${r.status!=="approved"?`<button class="btn btn-sm btn-pitch" onclick="approveReg('${r.id}')">Approve</button>`:""}
      ${r.type==="team"&&r.status!=="waitlist"?`<button class="btn btn-sm btn-line" onclick="setStatus('${r.id}','waitlist')">Waitlist</button>`:""}
      ${r.status!=="rejected"?`<button class="btn btn-sm btn-line" onclick="setStatus('${r.id}','rejected')">Reject</button>`:""}
      <button class="btn btn-sm btn-line" onclick="viewReg('${r.id}')">View</button></div>`;
  }
  async function approveReg(id){
    const r=App.regs.find(x=>x.id===id); if(!r)return;
    r.status="approved"; if(r.paymentStatus&&r.paymentStatus==="submitted")r.paymentStatus="verified";
    await Store.saveReg(r);
    await Store.logAction("Approved registration", r.id+" — "+(r.data.teamName||r.data.name||r.type));
    toast("Approved — sending email & SMS…");
    const res=await Notify.onApproved(r,App.settings);
    const e=res.email, s=res.sms;
    let m="Approved. ";
    m+= e? (e.ok?"Email sent. ":e.skipped?"Email skipped (configure EmailJS). ":"Email failed. ") : "No email on file. ";
    m+= s? (s.ok?"SMS sent.":"SMS pending (configure SMSQ).") : "No mobile on file.";
    toast(m, (e&&e.ok)||(s&&s.ok)?"":"warn");
    renderAdmin();
  }
  async function setStatus(id,status){ const r=App.regs.find(x=>x.id===id); if(!r)return; r.status=status; await Store.saveReg(r); await Store.logAction("Changed status → "+status, r.id+" — "+(r.data.teamName||r.data.name||"")); toast("Marked "+status); renderAdmin(); }
  function viewReg(id){
    const r=App.regs.find(x=>x.id===id); if(!r)return; const d=r.data||{};
    const name=d.teamName||d.name||"Participant";
    const sub=r.type==="team"?(d.category||"Team")+(d.batch?" · "+d.batch:""):(d.role||d.relation||r.type);
    const tel=(r.contact||d.phone||d.captainPhone||"").replace(/[^\d+]/g,"");
    const email=d.email||r.captainEmail||"";
    const logo=d.logo||d.photo||"";
    // detail rows by type
    let rows;
    if(r.type==="team"){
      rows=[["Category",d.category],["Batch",d.batch],
        ["Captain",d.captainName],["Captain phone",d.captainPhone],["Vice-captain",d.viceName],["Email",r.captainEmail]];
    } else {
      rows=Object.entries(d).filter(([k])=>!["photo","logo","name"].includes(k)).map(([k,v])=>[flabel(k),v]);
      rows.push(["Contact",r.contact]);
    }
    const detailHTML=rows.filter(([,v])=>v).map(([k,v])=>`<div class="pf-row"><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join("");
    // squad
    let squad="";
    if(r.type==="team"){
      const players=(r.players||[]).filter(p=>p&&p.name);
      const guests=(r.guests||[]).filter(g=>g&&g.name);
      if(players.length) squad+=`<div class="pf-sec">Players · ${players.length}</div><div class="pf-people">${players.map((p,i)=>`<div class="pf-person"><span class="pf-n">${i+1}</span><b>${esc(p.name)}</b><span class="pf-ph">${esc(p.phone||"")}</span></div>`).join("")}</div>`;
      if(guests.length) squad+=`<div class="pf-sec">Guests · ${guests.length}</div><div class="pf-people">${guests.map((g,i)=>`<div class="pf-person"><span class="pf-n">G${i+1}</span><b>${esc(g.name)}</b><span class="pf-ph">${esc(g.phone||"")}</span></div>`).join("")}</div>`;
    }
    const pay=r.payment&&(r.payment.method||r.payment.txn)
      ? `<div class="pf-sec">Payment</div><div class="pf-row"><span>Method</span><b>${esc(r.payment.method||"—")}</b></div><div class="pf-row"><span>Txn ID</span><b>${esc(r.payment.txn||"—")}</b></div><div class="pf-row"><span>Status</span><b>${esc(r.paymentStatus||"pending")}</b></div>${r.payment.shot?`<img src="${r.payment.shot}" style="margin-top:10px;border-radius:10px;border:1px solid var(--line);max-width:100%">`:""}`
      : "";
    showModal(`<div class="pf">
      <div class="pf-head">
        <div class="pf-ava">${logo?`<img src="${esc(logo)}" alt="">`:esc(initials(name))}</div>
        <div class="pf-id">
          <h3>${esc(name)}</h3>
          <span class="pf-sub">${esc(sub)}</span>
          <div class="pf-tags"><span class="pill ${r.status==='approved'?'ok':r.status==='rejected'?'rev':''}">${esc(r.status)}</span><span class="pf-code">${esc(r.id)}</span><span class="pf-type">${esc(r.type)}</span></div>
        </div>
      </div>
      <div class="pf-quick">
        ${tel?`<a class="pf-q" href="tel:${esc(tel)}">📞 Call</a>`:""}
        ${email?`<a class="pf-q" href="mailto:${esc(email)}">✉ Email</a>`:""}
        <span class="pf-q ghost">📅 ${fmtDateTime(r.created)}</span>
      </div>
      <div class="pf-body">${detailHTML}${squad}${pay}</div>
      <div class="form-actions">
        ${r.status!=="approved"?`<button class="btn btn-pitch" onclick="closeModal();approveReg('${r.id}')">Approve & notify</button>`:""}
        <button class="btn btn-line" onclick="editReg('${r.id}')">✎ Edit all details</button>
        <button class="btn btn-line" onclick="passesModal('${r.id}')">QR passes</button>
        <button class="btn btn-line" onclick="downloadRegPdf('${r.id}')">⤓ PDF</button>
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    </div>`,"wide");
  }

  /* ---- full registration editor (works for every type + all member-filled fields) ---- */
  const FIELD_LABELS={teamName:"Team name",category:"Category",batch:"Batch",captainName:"Captain name",captainPhone:"Captain phone",viceName:"Vice-captain",name:"Full name",phone:"Phone",email:"Email",class:"Class / batch",roll:"Roll / ID",institution:"Institution",relation:"Relation",organization:"Organization",inviteCode:"Invite code",teamRef:"Team",role:"Preferred role",zone:"Zone",availability:"Availability",experience:"Experience",tshirt:"T-shirt size",emergency:"Emergency contact",address:"Address",note:"Note",reason:"Reason"};
  function flabel(k){ return FIELD_LABELS[k]||k.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase()); }
  function editReg(id){
    const r=App.regs.find(x=>x.id===id); if(!r)return; const d=r.data||{};
    const skip=["photo","logo"];
    const keys=Object.keys(d).filter(k=>!skip.includes(k));
    const fieldHTML=keys.map(k=>{
      const v=d[k]==null?"":d[k];
      const long=String(v).length>48||/address|note|reason|message|experience|availability/i.test(k);
      return `<label class="el"><span>${esc(flabel(k))}</span>${long
        ?`<textarea data-dk="${esc(k)}" rows="2">${esc(String(v))}</textarea>`
        :`<input data-dk="${esc(k)}" value="${esc(String(v))}">`}</label>`;
    }).join("");
    const meta=`<label class="el"><span>Contact phone</span><input id="er-contact" value="${esc(r.contact||"")}"></label>
      ${r.captainEmail!==undefined?`<label class="el"><span>Captain email</span><input id="er-cemail" value="${esc(r.captainEmail||"")}"></label>`:""}
      <label class="el"><span>Status</span><select id="er-status">${["pending","approved","rejected","waitlist"].map(st=>`<option ${r.status===st?"selected":""}>${st}</option>`).join("")}</select></label>`;
    let squad="";
    if(r.type==="team"){
      squad=`<div class="er-sec">Players (${(r.players||[]).length})</div>`+(r.players||[]).map((p,i)=>
        `<div class="er-row"><input data-pk="${i}" data-f="name" value="${esc(p.name||"")}" placeholder="Player ${i+1} name"><input data-pk="${i}" data-f="phone" value="${esc(p.phone||"")}" placeholder="Phone"></div>`).join("");
      if((r.guests||[]).length) squad+=`<div class="er-sec">Guests (${r.guests.length})</div>`+(r.guests||[]).map((g,i)=>
        `<div class="er-row"><input data-gk="${i}" data-f="name" value="${esc(g.name||"")}" placeholder="Guest ${i+1} name"><input data-gk="${i}" data-f="phone" value="${esc(g.phone||"")}" placeholder="Phone"></div>`).join("");
    }
    showModal(`<h3>Edit ${r.id}</h3><p style="text-transform:capitalize">${esc(r.type)} registration · all member-filled fields are editable</p>
      <div class="er-grid">${fieldHTML}${meta}</div>${squad}
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveRegEdit('${r.id}')">Save changes</button></div>`,"wide");
  }
  async function saveRegEdit(id){
    const r=App.regs.find(x=>x.id===id); if(!r)return;
    document.querySelectorAll("#modal [data-dk]").forEach(el=>{ r.data[el.getAttribute("data-dk")]=el.value; });
    const c=$("#er-contact"); if(c) r.contact=c.value;
    const ce=$("#er-cemail"); if(ce) r.captainEmail=ce.value;
    const st=$("#er-status"); if(st) r.status=st.value;
    if(r.players) document.querySelectorAll("#modal [data-pk]").forEach(el=>{ const i=+el.getAttribute("data-pk"); r.players[i]=r.players[i]||{}; r.players[i][el.getAttribute("data-f")]=el.value; });
    if(r.guests) document.querySelectorAll("#modal [data-gk]").forEach(el=>{ const i=+el.getAttribute("data-gk"); r.guests[i]=r.guests[i]||{}; r.guests[i][el.getAttribute("data-f")]=el.value; });
    try{ await Store.saveReg(r); await Store.logAction("Edited registration", r.id+" — "+(r.data.teamName||r.data.name||r.type)); toast("Registration updated"); closeModal(); renderAdmin(); }
    catch(e){ toast("Could not save: "+(e.message||"error"),"err"); }
  }
  function passesModal(id){
    const r=App.regs.find(x=>x.id===id); if(!r)return;
    const who=r.data.teamName||r.data.name||"Registrant";
    const tile=(code,name,sub)=>`<div class="pass-mini"><div class="qb">${qrSvg(code)}</div><b>${esc(name)}</b><span>${esc(sub)}</span><div style="font-size:9px;color:#888;margin-top:3px">${esc(code)}</div></div>`;
    let tiles=tile(r.id,who,(r.type||"")+" pass");
    if(r.type==="team"){
      (r.players||[]).forEach((p,i)=>{ tiles+=tile(r.id+"#P"+(i+1),p.name||("Player "+(i+1)),p.role||("Player "+(i+1))); });
      (r.guests||[]).forEach((g,i)=>{ tiles+=tile(r.id+"#G"+(i+1),g.name||("Guest "+(i+1)),"Guest"); });
    }
    showModal(`<h3>QR passes — ${esc(who)}</h3><p>Scan these at the gate. Each player & guest has a unique code. Download a printable PDF for the whole registration.</p>
      <div class="pass-print">${tiles}</div>
      <div class="form-actions"><button class="btn btn-primary" onclick="downloadRegPdf('${r.id}')">⤓ Download PDF</button><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>`,"wide");
  }
  
  /* ---------- payments ---------- */
  function adminPayments(){
    const pays=teamRegs().filter(r=>r.payment&&r.payment.txn);
    $("#admin-body").innerHTML=`<div class="panel"><h3>Payment verification</h3><p class="ph-help">Verify transaction details submitted with team registrations.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Team</th><th>Method</th><th>Reference</th><th>Sender</th><th>Status</th><th></th></tr></thead><tbody>
      ${pays.map(r=>`<tr><td class="nm"><b>${esc(r.data.teamName)}</b><span>${r.id}</span></td><td>${esc(r.payment.method)}</td><td class="num">${esc(r.payment.txn)}</td><td>${esc(r.payment.sender||"—")}</td>
        <td><span class="pill ${r.paymentStatus==='verified'?'ok':'rev'}">${esc(r.paymentStatus||'—')}</span></td>
        <td>${r.paymentStatus!=='verified'?`<button class="btn btn-sm btn-pitch" onclick="verifyPay('${r.id}')">Verify</button>`:'✓'}</td></tr>`).join("")||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No payments yet.</td></tr>`}
      </tbody></table></div></div>`;
  }
  async function verifyPay(id){ const r=App.regs.find(x=>x.id===id); if(!r)return; r.paymentStatus="verified"; await Store.saveReg(r); await Store.logAction("Verified payment", r.id+" — "+(r.data.teamName||"")); toast("Payment verified"); adminPayments(); }
  
  /* ---------- manual / cash payment recording ---------- */
  function adminManual(){
    const teams=teamRegs();
    $("#admin-body").innerHTML=`<div class="panel" style="max-width:560px"><h3>Record a manual payment</h3>
      <p class="ph-help">Use this when a team pays by cash or any non-bKash method at the desk. It marks the team's payment verified.</p>
      <label class="fl">Team</label>
      <select id="mp-team">${teams.map(t=>`<option value="${t.id}">${esc(t.data.teamName)} (${t.id})</option>`).join("")||"<option>No teams yet</option>"}</select>
      <div class="grid2"><div>${field("mp-method","Method",{type:"select",options:["Cash","bKash (manual)","Nagad","Bank","Other"]})}</div><div>${field("mp-amount","Amount (৳)",{val:App.settings.teamFee})}</div></div>
      ${field("mp-ref","Reference / note",{ph:"Receipt no. or note"})}
      <button class="btn btn-primary" style="margin-top:16px" onclick="recordManual()">Record payment ✓</button></div>`;
  }
  async function recordManual(){
    const id=$("#mp-team").value; const r=App.regs.find(x=>x.id===id);
    if(!r){ toast("Select a team","warn"); return; }
    r.payment={...(r.payment||{}),mode:"manual",method:val("mp-method"),txn:val("mp-ref")||("CASH-"+Date.now().toString().slice(-6)),amount:val("mp-amount"),recordedBy:Store.adminInfo().name,recordedAt:Date.now()};
    r.paymentStatus="verified";
    await Store.saveReg(r);
    await Store.logAction("Recorded "+val("mp-method")+" payment ৳"+val("mp-amount"), r.id+" — "+r.data.teamName);
    toast("Payment recorded for "+r.data.teamName); adminManual();
  }
  
  /* ---------- branding & logos ---------- */
  function adminBranding(){
    const baseSlots=LOGO_SLOTS;
    const clubSlots=getClubs().filter(c=>!baseSlots.some(s=>s.key===c.key)).map(c=>({key:c.key,name:c.name,sub:"Club logo"}));
    const slots=baseSlots.concat(clubSlots);
    $("#admin-body").innerHTML=`<div class="panel"><h3>Logos</h3><p class="ph-help">Upload or replace any logo — SCPSC, EX-CAP, the tournament logo and each club. Changes apply instantly across the site, footer, maintenance page, team cards and passes. PNG with transparency works best; images are auto-compressed so uploads never fail.</p>
      <div class="logo-manager">${slots.map(s=>`<div class="logo-slot">
        <div class="box">${App.logos[s.key]?`<img src="${App.logos[s.key]}">`:`<span class="ph2">No logo</span>`}</div>
        <b>${esc(s.name)}</b><span>${esc(s.sub)}</span>
        <div class="row2"><button class="btn btn-sm btn-primary" style="flex:1" onclick="$('#lf-${s.key}').click()">Upload</button>${App.logos[s.key]?`<button class="btn btn-sm btn-line" onclick="removeLogoSlot('${s.key}')">Remove</button>`:""}</div>
        <input id="lf-${s.key}" type="file" accept="image/*" class="hidden" onchange="setLogoSlot(event,'${s.key}')"></div>`).join("")}</div></div>

      <div class="panel"><h3>Affiliated clubs</h3><p class="ph-help">These appear on the home page and the maintenance page (not in the footer). Upload each club's logo in the Logos section above — the slot appears automatically for every club here.</p>
        <div id="club-editor">${getClubs().map((c,i)=>clubEditRow(c,i)).join("")}</div>
        <div class="row2" style="margin-top:6px"><button class="btn btn-sm btn-line" onclick="addClub()">+ Add club</button><button class="btn btn-sm btn-primary" onclick="saveClubs()">Save clubs</button></div>
      </div>

      <div class="panel"><h3>Colours</h3><p class="ph-help">Primary brand gradient used across the site.</p>
        <div class="grid2" style="max-width:420px"><div><label class="fl">Purple</label><div class="swatch"><input type="color" id="b-purple" value="${App.settings.brand?.purple||cfg.brand.purple}"></div></div>
        <div><label class="fl">Magenta</label><div class="swatch"><input type="color" id="b-magenta" value="${App.settings.brand?.magenta||cfg.brand.magenta}"></div></div></div>
        <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="saveColors()">Apply colours</button></div>`;
  }
  function clubEditRow(c,i){
    return `<div class="club-edit" data-ci="${i}">
      <label class="el"><span class="ck">Club name</span><input data-cf="name" value="${esc(c.name||"")}"></label>
      <label class="el"><span class="ck">Role on match day</span><input data-cf="role" value="${esc(c.role||"")}"></label>
      <button class="btn btn-sm btn-line" onclick="removeClub(${i})" title="Remove">✕</button>
      <input type="hidden" data-cf="key" value="${esc(c.key||"")}"></div>`;
  }
  function readClubs(){
    return [...document.querySelectorAll("#club-editor .club-edit")].map(row=>{
      const get=f=>{const el=row.querySelector(`[data-cf="${f}"]`);return el?el.value.trim():"";};
      let key=get("key")||get("name").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||("club"+Date.now().toString(36));
      return {key,name:get("name"),role:get("role")};
    }).filter(c=>c.name);
  }
  function addClub(){
    const cur=readClubs(); cur.push({key:"club"+Date.now().toString(36),name:"",role:""});
    App.settings.clubs=cur; const box=$("#club-editor"); box.innerHTML=cur.map((c,i)=>clubEditRow(c,i)).join("");
  }
  function removeClub(i){
    const cur=readClubs(); cur.splice(i,1); App.settings.clubs=cur;
    $("#club-editor").innerHTML=cur.map((c,i)=>clubEditRow(c,i)).join("");
  }
  async function saveClubs(){
    const clubs=readClubs(); App.settings.clubs=clubs;
    try{ await Store.saveSettings({clubs}); await Store.logAction("Updated affiliated clubs"); toast("Clubs saved"); adminBranding(); }
    catch(e){ toast("Could not save clubs","err"); }
  }
  /* resize + compress an image file to a safe data URL (keeps Firestore docs small) */
  function processImage(file, maxDim, cb){
    if(!file){ cb(null,"No file"); return; }
    if(!/^image\//.test(file.type)){ cb(null,"Not an image file"); return; }
    const rd=new FileReader();
    rd.onerror=()=>cb(null,"Could not read file");
    rd.onload=()=>{
      const img=new Image();
      img.onerror=()=>cb(null,"Could not decode image");
      img.onload=()=>{
        try{
          let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
          if(!w||!h){ cb(rd.result); return; }
          if(w>maxDim||h>maxDim){ const r=Math.min(maxDim/w,maxDim/h); w=Math.round(w*r); h=Math.round(h*r); }
          const cv=document.createElement("canvas"); cv.width=w; cv.height=h;
          cv.getContext("2d").drawImage(img,0,0,w,h);
          let out=cv.toDataURL("image/png");                 // PNG keeps transparency
          if(out.length>150*1024) out=cv.toDataURL("image/jpeg",0.85);  // fall back for photos
          cb(out);
        }catch(err){ cb(rd.result); }   // fall back to original if canvas blocked
      };
      img.src=rd.result;
    };
    rd.readAsDataURL(file);
  }
  
  async function setLogoSlot(e,key){
    const f=e.target.files[0]; if(!f)return;
    const name=LOGO_SLOTS.find(s=>s.key===key).name;
    toast("Processing "+name+"…");
    processImage(f, 320, async (dataURL,err)=>{
      if(!dataURL){ toast(err||"Could not process image","err"); return; }
      try{
        await Store.setLogo(key,dataURL);
        App.logos[key]=dataURL;
        await Store.logAction("Updated logo", name);
        toast(name+" logo updated");
        adminBranding();
      }catch(ex){
        const msg=/maximum|size|exceed|larger/i.test(ex.message||"")?"Image still too large after compression — try a simpler PNG":(ex.message||"Save failed");
        toast(msg,"err");
      }
    });
    e.target.value="";   // allow re-uploading the same file
  }
  async function removeLogoSlot(key){ delete App.logos[key]; await Store.removeLogo(key); await Store.logAction("Removed logo", LOGO_SLOTS.find(s=>s.key===key).name); toast("Logo removed"); adminBranding(); }
  async function saveColors(){
    const brand={purple:$("#b-purple").value,magenta:$("#b-magenta").value};
    App.settings.brand=brand; applyBrand(brand); await Store.saveSettings({brand}); await Store.logAction("Changed brand colours"); toast("Colours applied");
  }
  
  /* ---------- announcement ---------- */
  function adminAnnouncement(){
    const a=App.settings.annc;
    $("#admin-body").innerHTML=`<div class="panel" style="max-width:620px"><h3>Top announcement bar</h3><p class="ph-help">The banner at the top of every public page.</p>
      ${field("a-text","Text",{val:a.text,req:true})}
      <div class="grid2"><div>${field("a-label","Link label",{val:a.linkLabel})}</div><div>${field("a-link","Link (#route or URL)",{val:a.link,help:"e.g. #register-team"})}</div></div>
      <div class="grid2"><div>${field("a-active","Show bar",{type:"select",options:["Yes","No"],val:a.active?"Yes":"No"})}</div><div>${field("a-urgent","Urgent (red)",{type:"select",options:["No","Yes"],val:a.urgent?"Yes":"No"})}</div></div>
      <button class="btn btn-primary" style="margin-top:18px" onclick="saveAnnc()">Save announcement</button></div>`;
  }
  async function saveAnnc(){
    const annc={text:val("a-text"),linkLabel:val("a-label"),link:val("a-link"),active:$("#a-active").value==="Yes",urgent:$("#a-urgent").value==="Yes"};
    App.settings.annc=annc; await Store.saveSettings({annc}); await Store.logAction("Updated announcement"); toast("Announcement saved");
  }
  
  /* ---------- settings ---------- */
  function adminSettings(){
    const s=App.settings;
    $("#admin-body").innerHTML=`<div class="panel" style="max-width:620px"><h3>Tournament settings</h3><p class="ph-help">Capacity, dates and fees drive the public counters and registration logic.</p>
      <div class="grid2"><div>${field("set-name","Tournament name",{val:s.tournamentName})}</div><div>${field("set-venue","Venue",{val:s.venue})}</div></div>
      ${field("set-emaillogo","Email logo URL",{val:s.emailLogoUrl||"",ph:"https://sports.excapscpsc.com/assets/logo.png",help:"Public image URL shown in emails. Uploaded logos (branding tab) can't be used in email — paste a hosted URL here."})}
      <div class="grid2"><div>${field("set-open","Registration opens",{type:"datetime-local",val:s.regOpen})}</div><div>${field("set-dead","Registration closes",{type:"datetime-local",val:s.regDeadline})}</div></div>
      ${field("set-date","Tournament date",{type:"datetime-local",val:s.tournamentDate})}
      <div class="grid2"><div>${field("set-max","Max teams",{type:"number",val:s.maxTeams})}</div><div>${field("set-players","Players per team",{type:"number",val:s.playersPerTeam})}</div></div>
      <div class="grid2"><div>${field("set-guests","Guests per team",{type:"number",val:s.guestsPerTeam})}</div><div>${field("set-fee","Team fee (৳)",{val:s.teamFee})}</div></div>
      <label class="fl">Payment numbers</label>
      ${s.paymentNumbers.map((n,i)=>`<div class="grid2" style="margin-bottom:8px;grid-template-columns:1fr 1.4fr"><input id="pm-${i}-m" value="${esc(n.method)}" placeholder="Method"><input id="pm-${i}-n" value="${esc(n.number)}" placeholder="Number"></div>`).join("")}
      <button class="btn btn-primary" style="margin-top:18px" onclick="saveSet()">Save settings</button></div>
  
    <div class="panel" style="max-width:620px">
      <h3>Site status <span class="pill ${s.maintenance?'rev':'ok'}" style="margin-left:8px">${s.maintenance?'Under construction':'Live'}</span></h3>
      <p class="ph-help">When ON, the public sees a "coming soon" holding page. You (signed in) and anyone with the preview link always see the full site.</p>
      <label class="fl" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="set-maint" ${s.maintenance?'checked':''} style="width:auto"> Show "coming soon" page to the public</label>
      ${field("set-pvkey","Preview key",{val:s.previewKey||"",help:"Share this so others can preview before launch (see preview link below)."})}
      <div class="note-box" style="max-width:none;margin-top:10px"><span class="i">🔗</span><div>Preview link to share:<br><code style="word-break:break-all">${esc((typeof location!=="undefined"?location.origin:"https://sports.excapscpsc.com"))}/?preview=${encodeURIComponent(s.previewKey||"excap-preview")}</code></div></div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="saveMaint()">Save site status</button>
    </div>

    <div class="panel" style="max-width:620px">
      <h3>Emergency contact</h3>
      <p class="ph-help">Shown in the bar at the top of every page so anyone who hits a problem during registration can reach a person directly.</p>
      ${(()=>{const e=(App.settings.emergency||cfg.emergency||{});return `
      <div class="grid2"><div>${field("em-name","Name",{val:e.name||""})}</div><div>${field("em-role","Role / title",{val:e.role||""})}</div></div>
      <div class="grid2"><div>${field("em-phone","Phone",{val:e.phone||""})}</div><div>${field("em-email","Email",{val:e.email||""})}</div></div>`;})()}
      <button class="btn btn-primary" style="margin-top:14px" onclick="saveEmergency()">Save emergency contact</button>
    </div>

    <div class="panel" style="max-width:620px">
      <h3>Registration control</h3>
      <p class="ph-help">Open, pause or close each registration type. The member site updates instantly — paused/closed types show a notice instead of the form.</p>
      ${["team","guest","volunteer"].map(t=>{const v=(App.settings.regStatus||cfg.settings.regStatus||{})[t]||"open";
        return `<div class="regctl"><span class="rc-name">${t}</span><div class="seg">${["open","paused","closed"].map(o=>`<button data-v="${o}" class="${v===o?'on':''}" onclick="setRegStatus('${t}','${o}')">${o}</button>`).join("")}</div></div>`;}).join("")}
    </div>

    <div class="panel" style="max-width:620px">
      <h3>Payment — bKash merchant QR</h3>
      <p class="ph-help">Offline / cash is the main method. For bKash, upload your merchant QR here; it shows on the team payment step. You can change it anytime.</p>
      <div class="bk-qr-row">
        <div class="bk-qr-box">${App.settings.bkashQR?`<img src="${App.settings.bkashQR}">`:`<span class="ph2">No QR</span>`}</div>
        <div>
          ${field("set-bknum","bKash number",{val:App.settings.bkashNumber||"",ph:"01XXXXXXXXX"})}
          <div class="row2" style="margin-top:8px"><button class="btn btn-sm btn-primary" onclick="$('#bkash-qr-file').click()">Upload QR</button>${App.settings.bkashQR?`<button class="btn btn-sm btn-line" onclick="removeBkashQR()">Remove</button>`:""}<button class="btn btn-sm btn-line" onclick="saveBkashNum()">Save number</button></div>
          <input id="bkash-qr-file" type="file" accept="image/*" class="hidden" onchange="setBkashQR(event)">
        </div>
      </div>
    </div>`;
  }
  function setRegStatus(type,v){
    App.settings.regStatus=App.settings.regStatus||{...(cfg.settings.regStatus||{})};
    App.settings.regStatus[type]=v;
    Store.saveSettings({regStatus:App.settings.regStatus}).then(()=>Store.logAction("Registration "+type+" → "+v));
    toast(type+" registration "+v); renderAdmin();
  }
  function setBkashQR(e){
    const f=e.target.files[0]; if(!f)return;
    processImage(f,420,async(d,err)=>{ if(!d){toast(err||"Could not process image","err");return;}
      App.settings.bkashQR=d; try{ await Store.saveSettings({bkashQR:d}); await Store.logAction("Updated bKash QR"); toast("Merchant QR saved"); adminSettings(); }
      catch(ex){ toast("Save failed: "+(ex.message||"error"),"err"); } });
    e.target.value="";
  }
  async function removeBkashQR(){ App.settings.bkashQR=""; await Store.saveSettings({bkashQR:""}); toast("QR removed"); adminSettings(); }
  async function saveBkashNum(){ const n=val("set-bknum"); App.settings.bkashNumber=n; await Store.saveSettings({bkashNumber:n}); toast("bKash number saved"); }
  async function saveEmergency(){
    const emergency={ name:val("em-name"), role:val("em-role"), phone:val("em-phone"), email:val("em-email") };
    App.settings.emergency=emergency; try{ cfg.emergency=emergency; }catch(_){}
    await Store.saveSettings({emergency}); await Store.logAction("Updated emergency contact");
    toast("Emergency contact saved"); renderAdmin();
  }
  async function saveMaint(){
    const upd={ maintenance: $("#set-maint").checked, previewKey: val("set-pvkey")||"excap-preview" };
    Object.assign(App.settings,upd); await Store.saveSettings(upd);
    await Store.logAction(upd.maintenance?"Enabled maintenance mode":"Took site live");
    toast(upd.maintenance?"Public now sees the coming-soon page":"Site is now LIVE for everyone");
    renderAdmin();
  }
  async function saveSet(){
    const s=App.settings;
    const upd={tournamentName:val("set-name"),venue:val("set-venue"),emailLogoUrl:val("set-emaillogo"),regOpen:$("#set-open").value,regDeadline:$("#set-dead").value,tournamentDate:$("#set-date").value,
      maxTeams:+val("set-max")||24,playersPerTeam:+val("set-players")||7,guestsPerTeam:+val("set-guests")||5,teamFee:val("set-fee"),
      paymentNumbers:s.paymentNumbers.map((n,i)=>({method:val("pm-"+i+"-m")||n.method,number:val("pm-"+i+"-n")||n.number,type:n.type}))};
    Object.assign(App.settings,upd); await Store.saveSettings(upd); await Store.logAction("Updated tournament settings"); toast("Settings saved"); renderAdmin();
  }
  
  /* ---------- my profile ---------- */
  function adminProfile(){
    const p=Store._profile||{}; const local=Store.mode==="local";
    $("#admin-body").innerHTML=`
    <div class="panel" style="max-width:560px"><h3>Profile</h3><p class="ph-help">Your name and photo appear on the activity log and the sidebar.</p>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
        <div class="dev-ava" style="width:64px;height:64px;border-radius:16px;font-size:22px" id="pf-ava">${p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`:initials(Store.adminInfo().name)}</div>
        <div><button class="btn btn-sm btn-line" onclick="$('#pf-photo').click()">Change photo</button>
        <input id="pf-photo" type="file" accept="image/*" class="hidden" onchange="pfPhoto(event)"></div>
      </div>
      ${field("pf-name","Full name",{req:true,val:p.name||Store.adminInfo().name})}
      <div class="grid2"><div>${field("pf-role","Role",{val:p.role||"Organizer"})}</div><div>${field("pf-phone","Phone",{type:"tel",val:p.phone||""})}</div></div>
      ${field("pf-email","Email",{type:"email",val:Store.adminInfo().email})}
      <div class="help" style="margin-top:6px">Email is your login and can't be changed here.</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="saveProfile()">Save profile</button>
    </div>
    <div class="panel" style="max-width:560px"><h3>Change password</h3>
      <p class="ph-help">${local?'Password change needs Firebase Auth — it activates once you connect Firebase (live mode).':'Enter your current password to confirm, then your new password.'}</p>
      ${field("pf-cur","Current password",{type:"password"})}
      <div class="grid2"><div>${field("pf-new","New password",{type:"password",help:"At least 6 characters"})}</div><div>${field("pf-new2","Confirm new password",{type:"password"})}</div></div>
      <button class="btn btn-primary" style="margin-top:16px" id="pw-btn" onclick="changePass()" ${local?'disabled':''}>Update password</button>
    </div>`;
  }
  let _pfPhoto=null;
  function pfPhoto(e){ const f=e.target.files[0]; if(!f)return; processImage(f,256,(d,err)=>{ if(!d){toast(err||"Could not process photo","err");return;} _pfPhoto=d; $("#pf-ava").innerHTML=`<img src="${d}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`; }); e.target.value=""; }
  async function saveProfile(){
    if(!val("pf-name")){ setErr("pf-name","Name is required"); return; }
    const p={name:val("pf-name"),role:val("pf-role"),phone:val("pf-phone"),photo:_pfPhoto||(Store._profile&&Store._profile.photo)||null};
    try{ await Store.saveProfile(p); await Store.logAction("Updated own profile"); _pfPhoto=null; toast("Profile saved"); renderAdmin(); }
    catch(e){ toast(e.message||"Could not save","err"); }
  }
  async function changePass(){
    const cur=val("pf-cur"),n1=val("pf-new"),n2=val("pf-new2");
    if(n1.length<6){ setErr("pf-new","Use at least 6 characters"); return; }
    if(n1!==n2){ setErr("pf-new2","Passwords don't match"); return; }
    const btn=$("#pw-btn"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
    try{ await Store.changePassword(cur,n1); await Store.logAction("Changed own password"); toast("Password updated"); adminProfile(); }
    catch(e){ btn.disabled=false; btn.textContent="Update password"; setErr("pf-cur", e.code==="auth/wrong-password"||/wrong-password|invalid-credential/.test(e.message)?"Current password is incorrect":(e.message||"Failed")); }
  }
  
  /* ---------- volunteers ---------- */
  let volFilter="all";
  function volunteers(){ return App.regs.filter(r=>r.type==="volunteer"); }
  function adminVolunteers(){
    const vols=volunteers();
    const f=volFilter==="all"?vols:vols.filter(v=>v.status===volFilter);
    const byStatus=s=>vols.filter(v=>v.status===s).length;
    $("#admin-body").innerHTML=`
    <div class="kpis"><div class="kpi accent"><div class="v num">${vols.length}</div><div class="k">Total volunteers</div></div>
      <div class="kpi"><div class="v num">${byStatus("approved")}</div><div class="k">Confirmed</div></div>
      <div class="kpi"><div class="v num">${byStatus("review")}</div><div class="k">Pending</div></div>
      <div class="kpi"><div class="v num">${vols.filter(v=>v.data&&v.data.dutyStatus==="On duty").length}</div><div class="k">On duty</div></div></div>
    <div class="tabs">${["all","review","approved"].map(t=>`<button class="tab ${volFilter===t?'active':''}" onclick="volFilter='${t}';adminVolunteers()">${t==='all'?'All':t==='review'?'Pending':'Confirmed'}</button>`).join("")}</div>
    <div class="panel"><h3>Volunteer crew</h3><p class="ph-help">Approve volunteers, assign role + zone + shift, and monitor duty status. Approving notifies them by email + SMS.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Preferred</th><th>Assigned role / zone</th><th>Duty</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${f.map(v=>{const d=v.data||{};return `<tr>
        <td class="num">${v.id}</td>
        <td class="nm"><b>${esc(d.name)}</b><span>${esc(v.contact||"")}</span></td>
        <td>${esc(d.preferredRole||"—")}<br><span style="color:var(--muted-2);font-size:12px">${esc(d.availability||"")}</span></td>
        <td>${d.assignedRole?`<b>${esc(d.assignedRole)}</b><br><span style="color:var(--muted-2);font-size:12px">${esc(d.assignedZone||"")} ${d.shift?"· "+esc(d.shift):""}</span>`:'<span style="color:var(--amber)">unassigned</span>'}</td>
        <td><span class="pill ${d.dutyStatus==='On duty'?'ok':d.dutyStatus==='Off duty'?'red':'wait'}">${esc(d.dutyStatus||'Pending')}</span></td>
        <td>${statusPill(v.status)}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-line" onclick="assignVol('${v.id}')">Assign</button>
          ${v.status!=="approved"?`<button class="btn btn-sm btn-pitch" onclick="approveReg('${v.id}')">Approve</button>`:`<button class="btn btn-sm btn-line" onclick="toggleDuty('${v.id}')">${d.dutyStatus==='On duty'?'End duty':'Start duty'}</button>`}
        </div></td></tr>`;}).join("")||`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No volunteers yet. Share the volunteer link from the footer.</td></tr>`}
      </tbody></table></div></div>`;
  }
  function assignVol(id){
    const v=App.regs.find(x=>x.id===id); if(!v)return; const d=v.data||{};
    const roles=App.settings.volunteerRoles||[], zones=App.settings.volunteerZones||[];
    showModal(`<h3>Assign volunteer</h3><p>${esc(d.name)} · ${v.id}</p>
      <label class="fl">Role</label><select id="av-role">${roles.map(r=>`<option ${r===d.assignedRole?'selected':''}>${esc(r)}</option>`).join("")}</select>
      <label class="fl">Zone</label><select id="av-zone">${zones.map(z=>`<option ${z===d.assignedZone?'selected':''}>${esc(z)}</option>`).join("")}</select>
      <label class="fl">Shift</label><input id="av-shift" value="${esc(d.shift||"")}" placeholder="e.g. 8:00–13:00">
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAssign('${id}')">Save assignment</button></div>`);
  }
  async function saveAssign(id){
    const v=App.regs.find(x=>x.id===id); if(!v)return;
    v.data.assignedRole=$("#av-role").value; v.data.assignedZone=$("#av-zone").value; v.data.shift=$("#av-shift").value.trim();
    await Store.saveReg(v); await Store.logAction("Assigned volunteer", v.id+" → "+v.data.assignedRole+" @ "+v.data.assignedZone);
    closeModal(); toast("Assignment saved"); adminVolunteers();
  }
  async function toggleDuty(id){
    const v=App.regs.find(x=>x.id===id); if(!v)return;
    v.data.dutyStatus = v.data.dutyStatus==="On duty"?"Off duty":"On duty";
    await Store.saveReg(v); await Store.logAction("Volunteer "+v.data.dutyStatus, v.id+" — "+v.data.name); adminVolunteers();
  }
  
  /* ---------- broadcast center ---------- */
  const AUDIENCES=[
    ["all","Everyone with contact"],["team","Team captains"],["guest","Guests"],
    ["visitor","Visitors"],["student","Students"],["volunteer","Volunteers"],["approved","Approved only (all types)"]
  ];
  function broadcastRecipients(aud){
    let list=App.regs.slice();
    if(aud==="approved") list=list.filter(r=>r.status==="approved");
    else if(aud!=="all") list=list.filter(r=>r.type===aud);
    return list.map(r=>({name:r.data.teamName||r.data.name||"Participant",email:r.data.email||r.captainEmail||"",phone:r.contact||""}));
  }
  function adminBroadcast(){
    $("#admin-body").innerHTML=`<div class="panel" style="max-width:680px"><h3>Broadcast center</h3>
      <p class="ph-help">Send a one-off email and/or SMS to a chosen audience. Use it for schedules, reminders, weather updates and thank-you notes.</p>
      <div class="note-box"><span class="i">⚠️</span><div>Email goes through EmailJS (mind your monthly quota) and SMS through SMSQ (each message is charged). Always run a small test to yourself first.</div></div>
      <label class="fl">Audience</label>
      <select id="bc-aud" onchange="bcCount()">${AUDIENCES.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select>
      <div class="help" id="bc-count" style="margin-top:8px"></div>
      <label class="fl">Channel</label>
      <div class="pay-methods" style="grid-template-columns:1fr 1fr 1fr">
        <div class="pay-opt sel" id="ch-email" onclick="bcChan('email')"><div class="ic">✉️</div><b>Email</b><span>via EmailJS</span></div>
        <div class="pay-opt" id="ch-sms" onclick="bcChan('sms')"><div class="ic">💬</div><b>SMS</b><span>via SMSQ</span></div>
        <div class="pay-opt" id="ch-both" onclick="bcChan('both')"><div class="ic">📡</div><b>Both</b><span>Email + SMS</span></div>
      </div>
      ${field("bc-subject","Email subject",{val:"EX-CAP Football Tournament"})}
      ${field("bc-msg","Message",{type:"textarea",req:true,ph:"Type your announcement…",help:"Keep SMS short — long messages cost multiple SMS credits."})}
      <div class="form-actions">
        <button class="btn btn-line" onclick="bcTest()">Send test to me</button>
        <button class="btn btn-pitch" id="bc-send" onclick="bcSend()">Send broadcast →</button>
      </div>
      <div id="bc-result" style="margin-top:14px"></div></div>`;
    bcChan(_bcChan); bcCount();
  }
  let _bcChan="email";
  function bcChan(c){ _bcChan=c; ["email","sms","both"].forEach(k=>$("#ch-"+k)&&$("#ch-"+k).classList.toggle("sel",k===c)); }
  function bcCount(){
    const rec=broadcastRecipients($("#bc-aud").value);
    const em=rec.filter(r=>r.email).length, sm=rec.filter(r=>r.phone).length;
    $("#bc-count").innerHTML=`<b>${rec.length}</b> recipients · ${em} with email · ${sm} with mobile`;
  }
  async function bcTest(){
    const me=Store.adminInfo();
    const subject=val("bc-subject"), message=val("bc-msg");
    if(!message){ setErr("bc-msg","Write a message first"); return; }
    toast("Sending test…");
    if(_bcChan!=="sms" && me.email && me.email.includes("@")) await Notify.sendBroadcastEmail({toEmail:me.email,toName:me.name,subject,message});
    const myPhone=(Store._profile&&Store._profile.phone)||"";
    if(_bcChan!=="email" && myPhone) await Notify.sendSMS({to:myPhone,message});
    toast("Test sent (check your email"+(myPhone?" / phone":"")+")");
  }
  async function bcSend(){
    const subject=val("bc-subject"), message=val("bc-msg"), aud=$("#bc-aud").value;
    if(!message){ setErr("bc-msg","Write a message first"); return; }
    const rec=broadcastRecipients(aud);
    if(!rec.length){ toast("No recipients in that audience","warn"); return; }
    if(!confirm(`Send this ${_bcChan==="both"?"email + SMS":_bcChan} to ${rec.length} recipients?`)) return;
    const btn=$("#bc-send"); btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true;
    let emailOk=0,emailFail=0,smsOk=0,smsFail=0;
  
    // SMS: one batched call (SMSQ accepts comma-separated numbers)
    if(_bcChan!=="email"){
      const phones=rec.map(r=>r.phone).filter(Boolean);
      if(phones.length){ const r=await Notify.sendSMS({to:phones,message}); if(r.ok)smsOk=phones.length; else smsFail=phones.length; }
    }
    // Email: one call per recipient (EmailJS), gentle pacing
    if(_bcChan!=="sms"){
      const emails=rec.filter(r=>r.email);
      for(const r of emails){
        const out=await Notify.sendBroadcastEmail({toEmail:r.email,toName:r.name,subject,message});
        out.ok?emailOk++:emailFail++;
        $("#bc-result").innerHTML=`<div class="note-box"><span class="i">📨</span><div>Sending… ${emailOk+emailFail}/${emails.length} emails</div></div>`;
        await new Promise(z=>setTimeout(z,350));
      }
    }
    await Store.logAction("Sent broadcast ("+_bcChan+")", `${aud} · ${rec.length} recipients · email ${emailOk}/${emailOk+emailFail} · sms ${smsOk}/${smsOk+smsFail}`);
    btn.disabled=false; btn.textContent="Send broadcast →";
    $("#bc-result").innerHTML=`<div class="note-box"><span class="i">✅</span><div>Done. Email sent: <b>${emailOk}</b>${emailFail?` (failed ${emailFail})`:""}. SMS sent: <b>${smsOk}</b>${smsFail?` (failed ${smsFail})`:""}.</div></div>`;
    toast("Broadcast complete");
  }
  
  /* ============================================================
     SCOREBOARD CONTROL
     ============================================================ */
  function adminScoreboard(){
    $("#admin-body").innerHTML=`
      <div class="admin-top" style="margin-bottom:14px"><div></div>
        <button class="btn btn-primary btn-sm" onclick="matchModal()">+ New match</button></div>
      <div id="sb-body"><div class="panel"><p class="ph-help">Loading matches…</p></div></div>`;
    if(window._admMatchUnsub){ _admMatchUnsub(); }
    window._admMatchUnsub=Store.subscribeMatches(matches=>{
      App._matches=matches; const body=$("#sb-body"); if(!body) return;
      if(!matches.length){ body.innerHTML=`<div class="panel"><div class="empty-wall">No matches yet. Create the first fixture to build the schedule.</div></div>`; return; }
      body.innerHTML=matches.map(m=>{
        const live=m.status==="live"||m.status==="halftime";
        return `<div class="panel" style="padding:18px">
          <div class="mc-top" style="margin-bottom:12px"><span class="mc-round">#${m.no} · ${esc(m.round)}${m.group?" · "+esc(m.group):""}</span>
            <span class="mc-status ${m.status}">${STATUS_LABEL[m.status]||m.status}</span></div>
          <div class="score-ctrl">
            <div><div class="tname">${esc(m.teamA||"TBD")}</div>
              <div class="stepper"><button onclick="bumpScore('${m.id}','A',-1)">−</button><span class="sv">${m.scoreA||0}</span><button onclick="bumpScore('${m.id}','A',1)">+</button></div></div>
            <div style="font-family:var(--font-display);font-weight:900;color:var(--muted-2)">VS</div>
            <div><div class="tname">${esc(m.teamB||"TBD")}</div>
              <div class="stepper"><button onclick="bumpScore('${m.id}','B',-1)">−</button><span class="sv">${m.scoreB||0}</span><button onclick="bumpScore('${m.id}','B',1)">+</button></div></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
            ${m.status==="scheduled"?`<button class="btn btn-sm btn-pitch" onclick="setMatch('${m.id}','live')">▶ Start (live)</button>`:""}
            ${m.status==="live"?`<button class="btn btn-sm btn-line" onclick="setMatch('${m.id}','halftime')">⏸ Half-time</button>`:""}
            ${m.status==="halftime"?`<button class="btn btn-sm btn-pitch" onclick="setMatch('${m.id}','live')">▶ Resume</button>`:""}
            ${live?`<button class="btn btn-sm btn-primary" onclick="setMatch('${m.id}','finished')">⏹ Full-time</button>`:""}
            ${m.status==="finished"?`<button class="btn btn-sm btn-line" onclick="setMatch('${m.id}','live')">Reopen</button>`:""}
            <button class="btn btn-sm btn-line" onclick="addScorer('${m.id}')">+ Scorer</button>
            <button class="btn btn-sm btn-line" onclick="matchModal('${m.id}')">Edit</button>
            <button class="btn btn-sm btn-line" onclick="delMatch('${m.id}')">Delete</button>
          </div>
          ${(m.scorersA&&m.scorersA.length)||(m.scorersB&&m.scorersB.length)?`<div class="mc-scorers" style="margin-top:12px"><div>${(m.scorersA||[]).map(s=>"⚽ "+esc(s)).join("<br>")}</div><div style="text-align:right">${(m.scorersB||[]).map(s=>esc(s)+" ⚽").join("<br>")}</div></div>`:""}
        </div>`;
      }).join("");
    });
  }
  function teamOptions(sel){ return `<option value="">— select team —</option>`+confirmedTeams().map(t=>`<option value="${t.id}" ${sel===t.id?'selected':''}>${esc(t.data.teamName)}</option>`).join(""); }
  function matchModal(id){
    const m=id?App._matches.find(x=>x.id===id):null;
    showModal(`<h3>${m?'Edit match':'New match'}</h3>
      <label class="fl">Round</label><select id="mm-round">${ROUNDS.map(r=>`<option ${m&&m.round===r?'selected':''}>${r}</option>`).join("")}</select>
      <div class="grid2"><div><label class="fl">Group / note</label><input id="mm-group" value="${m?esc(m.group||""):""}" placeholder="e.g. Group A"></div>
        <div><label class="fl">Field</label><input id="mm-field" value="${m?esc(m.field||""):""}" placeholder="Field A"></div></div>
      <label class="fl">Team A</label><select id="mm-a">${teamOptions(m&&m.teamAId)}</select>
      <label class="fl">Team B</label><select id="mm-b">${teamOptions(m&&m.teamBId)}</select>
      <label class="fl">Kick-off</label><input id="mm-time" type="datetime-local" value="${m?esc(m.kickoff||""):""}">
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveMatchModal('${id||''}')">${m?'Save':'Create match'}</button></div>`);
  }
  async function saveMatchModal(id){
    const aSel=$("#mm-a"), bSel=$("#mm-b");
    const teamA=aSel.options[aSel.selectedIndex].text.replace("— select team —","").trim();
    const teamB=bSel.options[bSel.selectedIndex].text.replace("— select team —","").trim();
    let m;
    if(id){ m=App._matches.find(x=>x.id===id); }
    else { const no=(App._matches.reduce((a,x)=>Math.max(a,x.no||0),0))+1; m={id:"M"+String(no).padStart(2,"0"),no,scoreA:0,scoreB:0,status:"scheduled",scorersA:[],scorersB:[]}; }
    m.round=$("#mm-round").value; m.group=$("#mm-group").value.trim(); m.field=$("#mm-field").value.trim();
    m.teamAId=aSel.value; m.teamA=teamA||"TBD"; m.teamBId=bSel.value; m.teamB=teamB||"TBD"; m.kickoff=$("#mm-time").value; m.updated=Date.now();
    await Store.saveMatch(m); await Store.logAction(id?"Edited match":"Created match", m.id+" "+m.teamA+" vs "+m.teamB);
    closeModal(); toast(id?"Match updated":"Match created");
  }
  async function bumpScore(id,side,d){
    const m=App._matches.find(x=>x.id===id); if(!m)return;
    const k=side==="A"?"scoreA":"scoreB"; m[k]=Math.max(0,(m[k]||0)+d); m.updated=Date.now();
    await Store.saveMatch(m);
  }
  async function setMatch(id,status){
    const m=App._matches.find(x=>x.id===id); if(!m)return; m.status=status; m.updated=Date.now();
    await Store.saveMatch(m); await Store.logAction("Match "+status, m.id+" "+m.teamA+" "+(m.scoreA||0)+"-"+(m.scoreB||0)+" "+m.teamB);
  }
  function addScorer(id){
    const m=App._matches.find(x=>x.id===id); if(!m)return;
    showModal(`<h3>Add goal</h3><p>${esc(m.teamA)} ${m.scoreA||0} - ${m.scoreB||0} ${esc(m.teamB)}</p>
      <label class="fl">Team</label><select id="sc-team"><option value="A">${esc(m.teamA)}</option><option value="B">${esc(m.teamB)}</option></select>
      <label class="fl">Scorer name (+ minute)</label><input id="sc-name" placeholder="e.g. Rahim 23'">
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-pitch" onclick="saveScorer('${id}')">Add goal ⚽</button></div>`);
  }
  async function saveScorer(id){
    const m=App._matches.find(x=>x.id===id); if(!m)return;
    const side=$("#sc-team").value, name=$("#sc-name").value.trim(); if(!name){toast("Enter a name","warn");return;}
    if(side==="A"){ m.scorersA=m.scorersA||[]; m.scorersA.push(name); m.scoreA=(m.scoreA||0)+1; }
    else { m.scorersB=m.scorersB||[]; m.scorersB.push(name); m.scoreB=(m.scoreB||0)+1; }
    m.updated=Date.now(); await Store.saveMatch(m); await Store.logAction("Recorded goal", m.id+" — "+name); closeModal(); toast("Goal recorded ⚽");
  }
  async function delMatch(id){ if(!confirm("Delete this match?"))return; await Store.deleteMatch(id); await Store.logAction("Deleted match",id); toast("Match deleted"); }
  
  /* ============================================================
     RESULTS & AWARDS
     ============================================================ */
  async function adminResults(){
    const res=await Store.getResults();
    const teamSel=(id)=>`<option value="">—</option>`+confirmedTeams().map(t=>`<option ${res[id]===t.data.teamName?'selected':''}>${esc(t.data.teamName)}</option>`).join("");
    $("#admin-body").innerHTML=`<div class="panel" style="max-width:620px"><h3>Champions & awards</h3>
      <p class="ph-help">Set the honours, then publish. Published results appear on the public Champions page and home banner.</p>
      <label class="fl">Champion</label><select id="rs-champ">${teamSel("champion")}</select>
      <label class="fl">Runner-up</label><select id="rs-run">${teamSel("runnerUp")}</select>
      <label class="fl">Third place</label><select id="rs-third">${teamSel("thirdPlace")}</select>
      <div class="grid2"><div>${field("rs-scorer","Top scorer",{val:res.topScorer||""})}</div><div>${field("rs-player","Best player",{val:res.bestPlayer||""})}</div></div>
      <div class="grid2"><div>${field("rs-keeper","Best goalkeeper",{val:res.bestGoalkeeper||""})}</div><div>${field("rs-fair","Fair play award",{val:res.fairPlay||""})}</div></div>
      <label class="fl" style="display:flex;align-items:center;gap:10px;margin-top:16px"><input type="checkbox" id="rs-pub" ${res.published?'checked':''} style="width:auto"> Publish results publicly</label>
      <button class="btn btn-primary" style="margin-top:16px" onclick="saveResults()">Save results</button></div>`;
  }
  async function saveResults(){
    const g=id=>$("#"+id).value;
    const res={champion:g("rs-champ"),runnerUp:g("rs-run"),thirdPlace:g("rs-third"),topScorer:val("rs-scorer"),bestPlayer:val("rs-player"),bestGoalkeeper:val("rs-keeper"),fairPlay:val("rs-fair"),published:$("#rs-pub").checked};
    await Store.saveResults(res); await Store.logAction(res.published?"Published results":"Saved results", res.champion?("Champion: "+res.champion):"");
    toast(res.published?"Results published 🏆":"Results saved");
  }
  
  /* ============================================================
     QR CHECK-IN
     ============================================================ */
  function parseCode(code){
    const [base,suffix]=String(code).trim().split("#");
    const rec=App.regs.find(r=>r.id===base); if(!rec) return {status:"bad",msg:"Unknown code"};
    if(suffix && /^P\d+$/.test(suffix)){ const i=+suffix.slice(1)-1; const p=(rec.players||[])[i]; if(!p)return{status:"bad",msg:"Player not found"}; return {status:"ok",kind:"player",rec,target:p,name:p.name,sub:rec.data.teamName+" · Player "+(i+1)}; }
    if(suffix && /^G\d+$/.test(suffix)){ const i=+suffix.slice(1)-1; const g=(rec.guests||[])[i]; if(!g)return{status:"bad",msg:"Guest not found"}; return {status:"ok",kind:"guest",rec,target:g,name:g.name,sub:rec.data.teamName+" · Guest"}; }
    return {status:"ok",kind:"reg",rec,target:rec,name:rec.data.teamName||rec.data.name,sub:rec.type+" · "+rec.id,photo:rec.data.photo};
  }
  async function doCheckin(code){
    const r=parseCode(code);
    if(r.status==="bad"){ showCi("bad","✕",code,r.msg); return; }
    if(r.rec.status!=="approved" && r.kind==="reg" && r.rec.type!=="student"){ showCi("dup","!",r.name,"Not approved yet — approve first"); return; }
    const t=r.target;
    if(t.checkedIn){ showCi("dup","✓",r.name,"Already checked in · "+fmtDateTime(t.checkedIn)); return; }
    t.checkedIn=Date.now(); t.checkedBy=Store.adminInfo().name;
    await Store.saveReg(r.rec);
    await Store.logAction("Checked in", (r.rec.id)+" — "+r.name);
    showCi("ok","✓",r.name,r.sub,r.photo);
    renderCiList();
  }
  function showCi(cls,icon,name,sub,photo){
    const el=$("#ci-result"); if(!el)return;
    el.innerHTML=`<div class="ci-card ${cls}"><div class="ci-photo">${photo?`<img src="${photo}">`:(cls==="ok"?"✓":cls==="dup"?"!":"✕")}</div>
      <div><div style="font-family:var(--font-display);font-weight:800;font-size:18px">${esc(name)}</div>
      <div style="color:var(--muted);font-size:13px">${esc(sub)}</div>
      <div class="pill ${cls==='ok'?'ok':cls==='dup'?'rev':'red'}" style="margin-top:6px">${cls==='ok'?'Checked in ✓':cls==='dup'?'Already in':'Invalid'}</div></div></div>`;
    if(cls==="ok" && navigator.vibrate) navigator.vibrate(120);
  }
  function checkinStats(){
    let inN=0,total=0;
    App.regs.forEach(r=>{
      if(["approved"].includes(r.status)||r.type==="student"){ total++; if(r.checkedIn)inN++; }
      (r.players||[]).forEach(p=>{ total++; if(p.checkedIn)inN++; });
      (r.guests||[]).forEach(g=>{ total++; if(g.checkedIn)inN++; });
    });
    return {inN,total};
  }
  function adminCheckin(){
    const st=checkinStats();
    $("#admin-body").innerHTML=`
      <div class="kpis"><div class="kpi accent"><div class="v num">${st.inN}</div><div class="k">Checked in</div></div>
        <div class="kpi"><div class="v num">${st.total}</div><div class="k">Eligible passes</div></div>
        <div class="kpi"><div class="v num">${st.total-st.inN}</div><div class="k">Not yet in</div></div></div>
      <div class="panel" style="max-width:520px"><h3>Scan QR pass</h3><p class="ph-help">Point a phone/tablet camera at a pass. Camera needs HTTPS (your live Vercel domain) and permission.</p>
        <div id="reader"></div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
          <button class="btn btn-sm btn-pitch" id="ci-start" onclick="ciStart()">Start camera</button>
          <button class="btn btn-sm btn-line" onclick="ciStop()">Stop</button></div>
        <div style="margin:16px 0 6px;text-align:center;color:var(--muted-2);font-size:12px">— or enter the code manually —</div>
        <div style="display:flex;gap:8px"><input id="ci-manual" placeholder="EXCAP-FT26-T001" style="flex:1"><button class="btn btn-primary" onclick="ciManual()">Check in</button></div>
        <div id="ci-result" class="checkin-result"></div>
      </div>
      <div class="panel"><h3>Recently checked in</h3><div id="ci-list"></div></div>`;
    renderCiList();
  }
  function ciStart(){
    const btn=$("#ci-start");
    if(!window.QR||!window.Html5Qrcode){ toast("Scanner needs the live HTTPS site + camera permission","warn"); return; }
    if(window._ciScanner&&window._ciScanner.stop) window._ciScanner.stop();
    const onDecode=(text)=>doCheckin(text);
    onDecode.__err=(e)=>toast("Camera error — check permission","err");
    window._ciScanner=QR.scanner("reader",onDecode);
    if(window._ciScanner.ok){ btn.textContent="Scanning…"; } else toast(window._ciScanner.error||"Scanner unavailable","warn");
  }
  function ciStop(){ if(window._ciScanner&&window._ciScanner.stop){ _ciScanner.stop(); window._ciScanner=null; const b=$("#ci-start"); if(b)b.textContent="Start camera"; } }
  function ciManual(){ const c=$("#ci-manual").value.trim(); if(!c){toast("Enter a code","warn");return;} doCheckin(c); $("#ci-manual").value=""; }
  function renderCiList(){
    const list=[]; App.regs.forEach(r=>{
      if(r.checkedIn) list.push({t:r.checkedIn,name:r.data.teamName||r.data.name,sub:r.type+" · "+r.id});
      (r.players||[]).forEach((p,i)=>{ if(p.checkedIn)list.push({t:p.checkedIn,name:p.name,sub:r.data.teamName+" · Player "+(i+1)}); });
      (r.guests||[]).forEach(g=>{ if(g.checkedIn)list.push({t:g.checkedIn,name:g.name,sub:(r.data.teamName||"")+" · Guest"}); });
    });
    list.sort((a,b)=>b.t-a.t);
    const el=$("#ci-list"); if(!el)return;
    el.innerHTML=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Name</th><th>Pass</th></tr></thead><tbody>
      ${list.slice(0,40).map(x=>`<tr><td style="white-space:nowrap">${fmtDateTime(x.t)}</td><td><b>${esc(x.name)}</b></td><td style="color:var(--muted)">${esc(x.sub)}</td></tr>`).join("")||`<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">No check-ins yet.</td></tr>`}
    </tbody></table></div>`;
  }
  
  /* ============================================================
     MESSAGES / SUPPORT TICKETS
     ============================================================ */
  async function adminMessages(){
    $("#admin-body").innerHTML=`<div class="panel"><p class="ph-help">Loading messages…</p></div>`;
    let tickets=[]; try{ tickets=await Store.listTickets(); }catch(e){}
    App._tickets=tickets;
    const open=tickets.filter(t=>t.status==="open").length;
    $("#admin-body").innerHTML=`
      <div class="kpis"><div class="kpi accent"><div class="v num">${open}</div><div class="k">Open</div></div>
        <div class="kpi"><div class="v num">${tickets.length}</div><div class="k">Total messages</div></div>
        <div class="kpi"><div class="v num">${tickets.length-open}</div><div class="k">Resolved</div></div></div>
      <div class="panel"><h3>Contact &amp; support inbox</h3>
        <p class="ph-help">Every message from the site's contact form lands here. Reply by email, then mark it resolved.</p>
        <div id="tk-list">${tickets.length?tickets.map(ticketRow).join(""):`<div class="empty-wall">No messages yet.</div>`}</div>
      </div>`;
  }
  function ticketRow(t){
    return `<div class="tk ${t.status}">
      <div class="tk-main">
        <div class="tk-head"><b>${esc(t.name)}</b><span class="pill ${t.status==='open'?'rev':'ok'}">${t.status==='open'?'Open':'Resolved'}</span></div>
        <a href="mailto:${esc(t.email)}" class="tk-email">${esc(t.email)}</a>
        <p class="tk-msg">${esc(t.message)}</p>
        <span class="tk-time">${fmtDateTime(t.created)}</span>
      </div>
      <div class="tk-actions">
        <a class="btn btn-sm btn-primary" href="mailto:${esc(t.email)}?subject=Re%3A%20EX-CAP%20support&body=${encodeURIComponent("Hi "+t.name+",\n\n")}">Reply</a>
        ${t.status==="open"
          ? `<button class="btn btn-sm btn-pitch" onclick="resolveTicket('${t.id}',true)">Mark resolved</button>`
          : `<button class="btn btn-sm btn-line" onclick="resolveTicket('${t.id}',false)">Reopen</button>`}
      </div>
    </div>`;
  }
  async function resolveTicket(id,resolved){
    await Store.updateTicket(id,{status:resolved?"resolved":"open"});
    await Store.logAction(resolved?"Resolved message":"Reopened message", id);
    toast(resolved?"Marked resolved":"Reopened");
    adminMessages();
  }
  
  /* ---------- activity log ---------- */
  async function adminLog(){
    $("#admin-body").innerHTML=`<div class="panel"><h3>Activity log</h3><p class="ph-help">Every admin action is recorded here — who did what and when. Newest first.</p>
      <div id="log-body"><div style="padding:24px;text-align:center;color:var(--muted)"><span class="spinner"></span> Loading…</div></div></div>`;
    let logs=[]; try{ logs=await Store.listLogs(300); }catch(e){}
    $("#log-body").innerHTML=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead><tbody>
      ${logs.map(l=>`<tr><td style="white-space:nowrap">${fmtDateTime(l.ts)}</td>
        <td class="nm"><b>${esc(l.by)}</b><span>${esc(l.email)}</span></td>
        <td>${esc(l.action)}</td><td style="color:var(--muted)">${esc(l.detail||"—")}</td></tr>`).join("")
        ||`<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">No activity yet.</td></tr>`}
    </tbody></table></div>`;
  }
  
  /* keep admin re-rendering on auth changes (e.g. Firebase restores a session) */
  Store.onAuth(async u=>{
    if(u && currentRoute()==="admin"){
      if(!Store._profile) await Store.getProfile();
      if(!App.regs || !App.regs.length){ try{ App.regs = await Store.listRegs(); }catch(e){} }
      App.isAdmin=true;
      renderAdmin();
    }
  });