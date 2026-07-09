/* ============================================================
   EX-CAP Sports — admin.js
   Organizer control panel. Approving a registration fires the
   approval email (EmailJS) + SMS (SMSQ via serverless).
   ============================================================ */
const LOGO_SLOTS = [
  { key: "excap", name: "EX-CAP", sub: "Main organizer" },
  { key: "tournament", name: "Tournament", sub: "Event logo" },
  { key: "scpsc", name: "SCPSC", sub: "Venue / institution" },
  { key: "business", name: "Business & Career", sub: "Supporting club" },
  { key: "sports", name: "Sports Club", sub: "Supporting club" }
];
let adminTab = "dashboard", regFilter = "all";

registerRoute("admin", renderAdmin);
async function renderAdmin() {
  if (!Store.user) return renderAdminLogin();

  if (!window._adminSubs) {
    window._adminSubs = true;
    // Prime state so first paint has something even if subscriptions are slow
    try { App.regs = await Store.listRegs(); } catch (e) { }
    try { App.tickets = await Store.listTickets(); } catch (e) { App.tickets = []; }
    // Now subscribe for live updates
    Store.subscribeRegs(list => {
      App.regs = list;
      if (currentRoute() === "admin") {
        // Re-render whichever admin tab is currently open
        const rerender = { dashboard: adminDashboard, registrations: adminRegistrations, teams: adminTeams, volunteers: adminVolunteers, checkin: adminCheckin, payments: adminPayments, messages: adminMessages }[adminTab];
        if (rerender) rerender();
        refreshNotifBadge();
      }
    });

    Store.subscribeSettings(s => { if (s) App.settings = s; });
    Store.subscribeTickets(list => {
      App.tickets = list;
      if (currentRoute() === "admin") { refreshNotifBadge(); }
    });
    Store.subscribeRegs(list => {
      App.regs = list;
      if (currentRoute() === "admin") { refreshCurrentTab(); refreshNotifBadge(); }
    });
    Store.subscribeSettings(s => { App.settings = s; });
    Store.subscribeTickets(list => {
      App.tickets = list;
      if (currentRoute() === "admin") { refreshNotifBadge(); }
    });
    Store.subscribeBrand(list => {                                        // ← ADD THIS BLOCK
      App.brand = list;
      if (currentRoute() === "admin" && adminTab === "brandkit") adminBrandKit();
    });
  }
  refreshNotifBadge();

  function refreshNotifBadge() {
    const pending = (App.regs || []).filter(r => r.status === "review" || r.status === "submitted").length;
    const openTickets = (App.tickets || []).filter(t => t.status === "open" || !t.status).length;
    const total = pending + openTickets;

    let badge = document.getElementById("admin-notif");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "admin-notif";
      badge.className = "notif-bell";
      badge.innerHTML = `<span class="nb-ic">🔔</span><span class="nb-dot"></span><span class="nb-cnt"></span>`;
      badge.onclick = () => showNotifDropdown();
      const nav = document.querySelector(".admin-nav") || document.querySelector(".nav-cta");
      if (nav) nav.prepend(badge);
    }
    const dot = badge.querySelector(".nb-dot");
    const cnt = badge.querySelector(".nb-cnt");
    if (total > 0) {
      dot.style.display = "block";
      cnt.textContent = total > 99 ? "99+" : total;
      cnt.style.display = "inline-flex";
      // Play soft ping when count increases
      if (window._lastNotifCount != null && total > window._lastNotifCount) { playNotifPing(); }
    } else {
      dot.style.display = "none"; cnt.style.display = "none";
    }
    window._lastNotifCount = total;
  }

  function showNotifDropdown() {
    const pending = (App.regs || []).filter(r => r.status === "review" || r.status === "submitted");
    const openTickets = (App.tickets || []).filter(t => t.status === "open" || !t.status);
    const items = [
      ...pending.slice(0, 10).map(r => ({
        kind: "reg", id: r.id, title: (r.data.teamName || r.data.name || "—"), sub: r.type + " · awaiting approval",
        time: r.created, action: () => { closeModal(); regFilter = "all"; adminRegistrations(); setTimeout(() => viewReg(r.id), 80); }
      })),
      ...openTickets.slice(0, 10).map(t => ({
        kind: "ticket", id: t.id, title: t.name || "Message", sub: (t.message || "").slice(0, 60),
        time: t.created, action: () => { closeModal(); adminMessages(); }
      }))
    ].sort((a, b) => b.time - a.time);

    const html = items.length ? items.map((i, idx) => `
        <div class="notif-item" data-idx="${idx}">
          <div class="ni-ic">${i.kind === "reg" ? "📋" : "✉️"}</div>
          <div class="ni-body">
            <b>${esc(i.title)}</b><span>${esc(i.sub)}</span>
            <em>${fmtDateTime(i.time)}</em>
          </div>
        </div>
      `).join("") : `<div class="notif-empty">All caught up 🎉<br><small>No pending items.</small></div>`;

    showModal(`<div class="notif-panel">
        <h3>Notifications <span class="np-count">${items.length}</span></h3>
        ${html}
        <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="closeModal()">Close</button>
      </div>`, "narrow");

    setTimeout(() => {
      document.querySelectorAll(".notif-item").forEach(el => {
        el.onclick = () => {
          const item = items[+el.dataset.idx];
          if (item && item.action) item.action();
        };
      });
    }, 10);
  }

  

  function playNotifPing() {
    // Chrome blocks audio until user interacts with page — skip silently if so
    if (!window._userInteracted) return;
    try {
      const A = new (window.AudioContext || window.webkitAudioContext)();
      const o = A.createOscillator(), g = A.createGain();
      o.frequency.setValueAtTime(880, A.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, A.currentTime + 0.12);
      g.gain.setValueAtTime(0.15, A.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, A.currentTime + 0.3);
      o.connect(g); g.connect(A.destination);
      o.start(); o.stop(A.currentTime + 0.3);
    } catch (e) { }
  }

  // Track first user interaction so we know when audio is allowed
  ["click", "keydown", "touchstart"].forEach(evt => {
    document.addEventListener(evt, () => { window._userInteracted = true; }, { once: true });
  });

  const tabs = [["dashboard", "📊", "Dashboard"], ["scoreboard", "🏟️", "Scoreboard"], ["results", "🏆", "Results & awards"], ["checkin", "📲", "Check-in"], ["teams", "⚽", "Teams"], ["registrations", "📋", "Registrations"], ["volunteers", "🤝", "Volunteers"], ["messages", "💬", "Messages"], ["payments", "💳", "Payments"], ["manual", "🧾", "Record payment"], ["broadcast", "📡", "Broadcast center"], ["brandkit", "🎨", "Brand kit"], ["branding", "🎨", "Branding & logos"], ["announcement", "📣", "Announcement"], ["settings", "⚙️", "Settings"], ["profile", "👤", "My profile"], ["log", "🗒️", "Activity log"]];
  const me = Store.adminInfo();
  $("#app").innerHTML = `<div class="admin-shell">
        <aside class="admin-side" id="aside">
          <div class="brand"><div class="mark">${logoImg("excap", "EX")}</div><div><b>EX-CAP</b><span>Control panel</span></div></div>
          <nav class="admin-nav">${tabs.map(([k, ic, l]) => `<a class="${adminTab === k ? 'active' : ''}" onclick="adminTab='${k}';renderAdmin();$('#aside').classList.remove('open')"><span class="ic">${ic}</span>${l}</a>`).join("")}</nav>
          <div style="margin-top:18px;border-top:1px solid var(--line-soft);padding-top:14px">
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:6px">
              <div class="dev-ava" style="width:34px;height:34px;border-radius:10px;font-size:13px">${(Store._profile && Store._profile.photo) ? `<img src="${Store._profile.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">` : initials(me.name)}</div>
              <div style="min-width:0"><b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(me.name)}</b><span style="font-size:11px;color:var(--muted-2)">${esc((Store._profile && Store._profile.role) || "Organizer")}</span></div>
            </div>
            <a class="" style="display:flex;gap:11px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer;align-items:center" onclick="go('home')"><span class="ic">🌐</span>View public site</a>
            <a style="display:flex;gap:11px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer;align-items:center" onclick="adminSignOut()"><span class="ic">🚪</span>Sign out</a>
          </div></aside>
        <main class="admin-main">
          <div class="admin-top">
            <button class="hamb" style="display:block" onclick="$('#aside').classList.add('open')">☰</button>
            <h1>${tabs.find(t => t[0] === adminTab)[2]}</h1>
            <button class="btn btn-line btn-sm" onclick="refreshAdmin()">↻ Refresh</button>
          </div><div id="admin-body"></div></main></div>`;
  if (window._ciScanner) { _ciScanner.stop && _ciScanner.stop(); window._ciScanner = null; }
  if (window._admMatchUnsub) { _admMatchUnsub(); window._admMatchUnsub = null; }
  ({ dashboard: adminDashboard, scoreboard: adminScoreboard, results: adminResults, checkin: adminCheckin, teams: adminTeams, registrations: adminRegistrations, volunteers: adminVolunteers, messages: adminMessages, payments: adminPayments, manual: adminManual, broadcast: adminBroadcast, branding: adminBranding, brandkit: adminBrandKit, announcement: adminAnnouncement, settings: adminSettings, profile: adminProfile, log: adminLog }[adminTab])();
}
async function refreshAdmin() {
  try {
    App.settings = await Store.getSettings();
    App.logos = await Store.getLogos();
    App.regs = await Store.listRegs();
    App.tickets = await Store.listTickets();
  } catch (e) { }
  renderAdmin();
  toast("Data refreshed");
}
async function adminSignOut() {
  await Store.logAction("Signed out");
  App.isAdmin = false; App.regs = []; App.tickets = [];
  window._adminSubs = false;   // allow subscriptions to re-attach after next login
  window._lastNotifCount = null;
  const badge = document.getElementById("admin-notif"); if (badge) badge.remove();
  await Store.adminLogout();
  go("home");
}

function renderAdminLogin() {
  const local = Store.mode === "local";
  $("#app").innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 500px at 50% 0,rgba(124,58,237,.3),transparent),var(--navy);padding:20px">
        <div class="form-shell" style="max-width:380px;text-align:center">
          <div class="brand" style="justify-content:center;margin-bottom:14px"><div class="mark" style="height:54px;width:54px;border-radius:15px;font-size:20px">${logoImg("excap", "EX")}</div></div>
          <h1 class="ph" style="font-size:24px">Organizer login</h1>
          <p class="ph-sub" style="margin:8px auto 20px">EX-CAP control panel</p>
          ${field("adm-email", "Email", { type: "email", ph: "admin@excapscpsc.com" })}
          ${field("adm-pass", "Password", { type: "password", ph: "Password" })}
          ${local ? '<div class="help" style="text-align:left;margin-top:10px">Demo mode: any email + password <b>excap2026</b></div>' : ''}
          <button class="btn btn-primary btn-block" style="margin-top:18px" id="login-btn" onclick="adminLogin()">Sign in</button>
          <a onclick="go('home')" style="display:block;margin-top:16px;color:var(--muted);font-size:13px;cursor:pointer">← Back to public site</a>
        </div></div>`;
  const inp = $("#adm-pass"); inp && inp.addEventListener("keydown", e => { if (e.key === "Enter") adminLogin(); });
}
async function adminLogin() {
  const btn = $("#login-btn"); btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  try {
    await Store.adminLogin(val("adm-email"), val("adm-pass"));
    await Store.getProfile();
    try { App.regs = await Store.listRegs(); } catch (e) { App.regs = []; }
    App.isAdmin = true;
    await Store.logAction("Signed in");
    renderAdmin();
  }
  catch (e) { btn.disabled = false; btn.textContent = "Sign in"; setErr("adm-pass", e.message || "Login failed"); }
}

/* ---------- dashboard ---------- */
function adminDashboard() {
  const t = teamRegs(), pending = App.regs.filter(r => r.status === "review").length,
    players = t.reduce((a, r) => a + (r.players?.length || 0), 0),
    guests = App.regs.filter(r => r.type === "guest").length + t.reduce((a, r) => a + (r.guests?.length || 0), 0),
    visitors = App.regs.filter(r => r.type === "visitor").length,
    students = App.regs.filter(r => r.type === "student").length,
    volunteers = App.regs.filter(r => r.type === "volunteer").length,
    payPending = t.filter(r => r.paymentStatus && r.paymentStatus !== "verified").length;
  const kpis = [["accent", slotsUsed() + " / " + App.settings.maxTeams, "Team slots used"], ["", confirmedTeams().length, "Confirmed teams"], ["", pending, "Pending review"], ["", players, "Players"], ["", guests, "Guests"], ["", visitors, "Visitors"], ["", students, "Students"], ["", volunteers, "Volunteers"], ["", payPending, "Payments to verify"]];
  $("#admin-body").innerHTML = `<div class="kpis">${kpis.map(([c, v, k]) => `<div class="kpi ${c}"><div class="v num">${v}</div><div class="k">${k}</div></div>`).join("")}</div>
        <div class="panel"><h3>Latest registrations</h3><p class="ph-help">Newest submissions across all categories.</p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Status</th><th>Submitted</th></tr></thead><tbody>
          ${App.regs.slice(0, 10).map(r => `<tr><td class="num">${r.id}</td><td style="text-transform:capitalize">${r.type}</td><td>${esc(r.data.teamName || r.data.name)}</td><td>${statusPill(r.status)}</td><td>${fmtDateTime(r.created)}</td></tr>`).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No registrations yet.</td></tr>`}
          </tbody></table></div></div>`;
}
function statusPill(s) { const m = { approved: ["ok", "Approved"], review: ["rev", "Review"], submitted: ["rev", "Submitted"], waitlist: ["wait", "Waitlist"], rejected: ["red", "Rejected"] }; const [c, l] = m[s] || ["rev", s]; return `<span class="pill ${c}">${l}</span>`; }

/* ---------- teams ---------- */
function adminTeams() {
  const list = teamRegs();
  // Group teams by SSC batch to show the batch summary
  const batchGroups = {};
  list.forEach(r => {
    const b = r.data.sscBatch || r.data.batch || "—";
    if (!batchGroups[b]) batchGroups[b] = [];
    batchGroups[b].push(r);
  });
  const sortedBatches = Object.keys(batchGroups).sort();
  const totalBatches = sortedBatches.filter(b => b !== "—").length;

  $("#admin-body").innerHTML = `<div class="panel">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h3 style="margin:0">Teams</h3>
        <p class="ph-help" style="margin:6px 0 0">Approve to confirm a team — it appears publicly and the captain is notified by email + SMS.</p>
      </div>
      <button class="btn btn-primary" onclick="showBatchReport()">📊 Batch report</button>
    </div>

    <div class="batch-summary">
      <div class="bs-stat"><div class="bs-s-ic">👥</div><div><b>${list.length}</b><span>Total teams</span></div></div>
      <div class="bs-stat"><div class="bs-s-ic">🎓</div><div><b>${totalBatches}</b><span>Batches represented</span></div></div>
      <div class="bs-stat"><div class="bs-s-ic">✅</div><div><b>${list.filter(r => r.status === "approved").length}</b><span>Approved</span></div></div>
    </div>

    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Team</th><th>Captain</th><th>Batch</th><th>Players</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${list.map(r => {
    const batch = [r.data.sscBatch && "SSC " + r.data.sscBatch, r.data.hscBatch && "HSC " + r.data.hscBatch].filter(Boolean).join(" · ") || r.data.batch || "—";
    return `<tr>
        <td class="num">${r.id}</td>
        <td class="nm"><b>${esc(r.data.teamName)}</b><span>${esc(r.data.category || "")}</span></td>
        <td>${esc(r.data.captainName || "—")}<br><span style="color:var(--muted-2);font-size:12px">${esc(r.contact || "")}</span></td>
        <td style="font-size:12px;color:var(--muted)">${esc(batch)}</td>
        <td>${(r.players || []).length}/${App.settings.playersPerTeam}</td>
        <td><span class="pill ${r.paymentStatus === 'verified' ? 'ok' : 'rev'}">${esc(r.paymentStatus || '—')}</span></td>
        <td>${statusPill(r.status)}</td>
        <td>${actions(r)}</td></tr>`;
  }).join("") || `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No teams yet.</td></tr>`}
    </tbody></table></div>
  </div>`;
}

function showBatchReport() {
  const teams = teamRegs();
  const groups = {};
  teams.forEach(r => {
    const b = r.data.sscBatch || r.data.batch || "Unspecified";
    if (!groups[b]) groups[b] = [];
    groups[b].push(r);
  });
  const sortedBatches = Object.keys(groups).sort((a, b) => {
    if (a === "Unspecified") return 1;
    if (b === "Unspecified") return -1;
    return b.localeCompare(a); // newest first
  });

  showModal(`<div style="max-width:640px">
    <h3 style="margin:0 0 6px">Batch report</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 18px">Overview of which batches have registered teams. Download as a printable PDF.</p>

    <div class="batch-preview">
      ${sortedBatches.map(batch => `
        <div class="bp-batch">
          <div class="bp-batch-h">
            <div>
              <b>SSC ${esc(batch)}</b>
              <span>${groups[batch].length} team${groups[batch].length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div class="bp-teams">
            ${groups[batch].map(t => `
              <div class="bp-team">
                <b>${esc(t.data.teamName || "—")}</b>
                <span>${esc(t.data.captainName || "—")}</span>
                <em>${esc(t.data.category || "—")}</em>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("") || `<div style="text-align:center;color:var(--muted);padding:20px">No teams registered yet.</div>`}
    </div>

    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="downloadBatchReportPdf()">⤓ Download PDF report</button>
    </div>
  </div>`, "wide");
}

function downloadBatchReportPdf() {
  const teams = teamRegs();
  const groups = {};
  teams.forEach(r => {
    const b = r.data.sscBatch || r.data.batch || "Unspecified";
    if (!groups[b]) groups[b] = [];
    groups[b].push(r);
  });
  const sortedBatches = Object.keys(groups).sort((a, b) => {
    if (a === "Unspecified") return 1;
    if (b === "Unspecified") return -1;
    return b.localeCompare(a);
  });

  const s = App.settings;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const totalTeams = teams.length;
  const totalApproved = teams.filter(t => t.status === "approved").length;
  const totalReview = teams.filter(t => t.status === "review").length;

  const w = window.open("", "_blank");
  if (!w) { toast("Allow pop-ups to download the PDF", "warn"); return; }

  const logoTag = (key) => {
    const up = App.logos && App.logos[key];
    if (up) return `<img class="lg" src="${up}" alt="">`;
    return `<img class="lg" src="${location.origin}/assets/logo-${key}.png" alt="" onerror="this.style.display='none'">`;
  };

  // Build ONE unified table with batch headers as separator rows — guarantees column alignment across all batches
  let rowIndex = 0;
  const allRows = sortedBatches.map(batch => {
    const list = groups[batch];
    const batchHeader = `<tr class="batch-sep"><td colspan="6">
    <div class="bs-inner">
      <span class="bs-tag">SSC ${esc(batch)}</span>
      <span class="bs-count">${list.length} team${list.length === 1 ? "" : "s"}</span>
    </div>
  </td></tr>`;

    const teamRows = list.map((t) => {
      rowIndex++;
      const zebra = rowIndex % 2 === 0 ? " zebra" : "";
      const sscYear = t.data.sscBatch ? String(t.data.sscBatch).slice(-2) : "";
      const hscYear = t.data.hscBatch ? String(t.data.hscBatch).slice(-2) : "";
      const batchLine = (sscYear || hscYear)
        ? `SSC '${sscYear}${hscYear ? ` · HSC '${hscYear}` : ""}`
        : "—";
      const statusColor = t.status === "approved" ? "#16a34a"
        : t.status === "review" ? "#d97706"
          : t.status === "rejected" ? "#dc2626"
            : "#6b7280";
      return `<tr class="team-row${zebra}">
      <td class="c-idx">${rowIndex}</td>
      <td class="c-name"><b>${esc(t.data.teamName || "—")}</b></td>
      <td class="c-cap">${esc(t.data.captainName || "—")}</td>
      <td class="c-batch">${esc(batchLine)}</td>
      <td class="c-type">${esc(t.data.category || "—")}</td>
      <td class="c-status"><span class="st" style="background:${statusColor}">${esc(t.status)}</span></td>
    </tr>`;
    }).join("");

    return batchHeader + teamRows;
  }).join("");

  const batchSections = totalTeams === 0
    ? `<div class="empty">No teams have registered yet.</div>`
    : `<table class="unified-tbl">
      <colgroup>
        <col style="width:38px">
        <col style="width:26%">
        <col style="width:20%">
        <col style="width:22%">
        <col style="width:13%">
        <col style="width:14%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>Team name</th>
          <th>Captain</th>
          <th>Batch (SSC · HSC)</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${allRows}</tbody>
    </table>`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Batch Report — ${esc(s.tournamentName || "EX-CAP")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#f5f6fa;color:#0f1424;font-family:'Inter',system-ui,Arial,sans-serif;font-size:12px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{max-width:820px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px -30px rgba(0,0,0,.35);border:1px solid #e6e8f0}
  .head{position:relative;padding:24px 32px 22px;background:linear-gradient(120deg,#7c3aed,#db2777);color:#fff;overflow:hidden}
  .head::after{content:"";position:absolute;right:-70px;top:-70px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.09)}
  .head-top{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
  .head-logos{display:flex;gap:8px}
  .head-logos .lg{width:42px;height:42px;border-radius:10px;background:#fff;padding:4px;object-fit:contain}
  .head-title{flex:1}
  .head-title h1{font-family:'Archivo',sans-serif;font-weight:900;font-size:20px;letter-spacing:-.01em;line-height:1.1;text-transform:uppercase}
  .head-title .k{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:3px}
  .meta{position:relative;z-index:1;margin-top:16px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:11px}
  .meta div{opacity:.85}
  .meta b{font-family:'Archivo',sans-serif;font-weight:800}
  .body{padding:24px 32px 28px}
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }
  .kpi {
    background: linear-gradient(180deg, #f7f8fc, #f4f6fb);
    border: 1px solid #e2e5f0;
    border-radius: 12px;
    padding: 14px 12px;
    text-align: center;
  }
  .kpi .n {
    font-family: 'Archivo', sans-serif;
    font-weight: 900;
    font-size: 26px;
    color: #7c3aed;
    letter-spacing: -.02em;
    line-height: 1;
    margin-bottom: 6px;
  }
  .kpi .l {
    font-size: 9px;
    color: #6b7280;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
    line-height: 1.2;
  }
  /* Unified table with locked columns for perfect row alignment */
.unified-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}
.unified-tbl thead th {
  background: #f7f8fc;
  color: #6b7280;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 9.5px;
  letter-spacing: .08em;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid #e2e5f0;
  vertical-align: middle;
}
.unified-tbl tbody td {
  padding: 10px 10px;
  border-bottom: 1px solid #eef0f7;
  vertical-align: middle;
  overflow: hidden;
  word-wrap: break-word;
}
.unified-tbl .c-idx {
  color: #9aa1b4;
  font-weight: 600;
  font-family: 'Inter', monospace;
  text-align: center;
}
.unified-tbl .c-idx {
  color: #9aa1b4;
  font-weight: 700;
  font-family: 'Inter', monospace;
  text-align: center;
  font-size: 11px;
  white-space: nowrap;
}
.unified-tbl .c-name {
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}
.unified-tbl .c-name b {
  color: #0f1424;
  font-weight: 700;
}
.unified-tbl .c-cap {
  color: #334155;
  font-weight: 500;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}
.unified-tbl .c-batch {
  color: #7c3aed;
  font-weight: 700;
  font-size: 10.5px;
  font-family: 'Inter', sans-serif;
  letter-spacing: .01em;
  white-space: normal;
  line-height: 1.4;
}
.unified-tbl .c-type {
  color: #6b7280;
  font-weight: 500;
  font-size: 11px;
  white-space: nowrap;
}
.unified-tbl .c-status {
  text-align: center;
  white-space: nowrap;
}
.unified-tbl .c-type {
  color: #6b7280;
  font-weight: 500;
  font-size: 11px;
}
.unified-tbl .c-status { text-align: center; }

/* Batch separator row — visually distinct but keeps table columns intact */
.unified-tbl .batch-sep td {
  background: linear-gradient(90deg, rgba(124,58,237,.06), rgba(219,39,119,.03));
  padding: 12px 12px 10px;
  border-bottom: 1px solid #e2e5f0;
  border-top: 1px solid #e2e5f0;
}
.unified-tbl .batch-sep:first-child td { border-top: 0; }
.bs-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bs-tag {
  font-family: 'Archivo', sans-serif;
  font-weight: 900;
  font-size: 14px;
  color: #7c3aed;
  letter-spacing: -.005em;
  text-transform: uppercase;
}
.bs-count {
  font-size: 10.5px;
  color: #fff;
  background: #7c3aed;
  padding: 4px 12px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: .05em;
  text-transform: uppercase;
}

/* Team rows alternate subtle background for readability */
.unified-tbl .team-row.zebra {
  background: rgba(247,248,252,.5);
}

.st {
  display: inline-block;
  color: #fff;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .06em;
  padding: 3px 7px;
  border-radius: 999px;
  text-transform: uppercase;
  white-space: nowrap;
  min-width: 54px;
  text-align: center;
}
.empty {
  padding: 40px;
  text-align: center;
  color: #9aa1b4;
  font-size: 13px;
}

/* Print rules — keep batch groups together, allow long tables to break naturally */
@media print {
  .unified-tbl .batch-sep td {
    break-before: auto;
    break-after: avoid;
    page-break-after: avoid;
  }
  .unified-tbl .team-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .unified-tbl thead {
    display: table-header-group;
  }
}
  .foot{background:#f7f8fc;padding:14px 32px;border-top:1px solid #eceef5;font-size:10.5px;color:#6b7280;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
  .foot .brand{font-family:'Archivo',sans-serif;font-weight:800;color:#7c3aed;letter-spacing:.08em}
  @media print{
    html,body{background:#fff}
    .sheet{margin:0;box-shadow:none;border:0;max-width:none;border-radius:0}
    @page{margin:12mm;size:A4}
  }
</style>
</head><body>
  <div class="sheet">
    <div class="head">
      <div class="head-top">
        <div class="head-logos">${logoTag("scpsc")}${logoTag("tournament")}${logoTag("excap")}</div>
        <div class="head-title">
          <h1>${esc(s.tournamentName || "EX-CAP Football Tournament")} ${esc(s.edition || "")}</h1>
          <div class="k">Team Batch Report · Organizer's Copy</div>
        </div>
      </div>
      <div class="meta">
        <div>Generated: <b>${esc(dateStr)}</b> · <b>${esc(timeStr)}</b></div>
        <div>Venue: <b>${esc(s.venue || "SCPSC field")}</b></div>
        <div>Match date: <b>${esc(s.tournamentDate ? new Date(s.tournamentDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—")}</b></div>
      </div>
    </div>

    <div class="body">
      <div class="kpis">
        <div class="kpi"><div class="n">${totalTeams}</div><div class="l">Total teams</div></div>
        <div class="kpi"><div class="n">${sortedBatches.filter(b => b !== "Unspecified").length}</div><div class="l">Batches</div></div>
        <div class="kpi"><div class="n">${totalApproved}</div><div class="l">Approved</div></div>
        <div class="kpi"><div class="n">${totalReview}</div><div class="l">Under review</div></div>
      </div>

      ${batchSections}
    </div>

    <div class="foot">
      <span>Report generated by EX-CAP admin platform</span>
      <span class="brand">EX-CAP · ALUMNI OF SCPSC</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function(){
      requestAnimationFrame(function(){
        setTimeout(function(){ window.print(); }, 500);
      });
    });
  <\/script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

/* ---------- registrations (with bulk actions) ---------- */
function adminRegistrations() {
  const types = ["all", "team", "guest", "visitor", "student", "volunteer"];
  const list = regFilter === "all" ? App.regs : App.regs.filter(r => r.type === regFilter);
  $("#admin-body").innerHTML =  `
      <div class="tabs">${types.map(t => `<button class="tab ${regFilter === t ? 'active' : ''}" onclick="regFilter='${t}';adminRegistrations()">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
      <div class="panel">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
          <span id="bulk-count" style="color:var(--muted);font-size:13px">0 selected</span>
          <button class="btn btn-sm btn-line" onclick="bulkPdf()">⤓ Selected PDFs</button>
          <button class="btn btn-sm btn-danger" onclick="bulkDelete()">🗑 Delete selected</button>
          <button class="btn btn-sm btn-primary" onclick="showCustomPdfExport()" style="margin-left:auto">📋 Custom PDF Export</button>
          <button class="btn btn-sm btn-line" onclick="exportCsv()">Export CSV</button>
        </div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>
            <th style="width:28px"><input type="checkbox" id="bulk-all" onchange="bulkAll(this.checked)"></th>
            <th style="width:52px">Photo</th>
            <th>ID</th><th>Name</th><th>Type</th><th>Contact</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
          ${list.map(r => {
    const photo = (r.data && r.data.photo) || (r.data && r.data.logo) || "";
    const initials2 = esc((r.data.teamName || r.data.name || "?").slice(0, 2).toUpperCase());
    return `<tr>
            <td><input type="checkbox" class="bulk-chk" value="${r.id}" onchange="bulkCount()"></td>
            <td>
              <div class="reg-thumb" onclick="editRegPhoto('${r.id}')" title="Click to edit photo">
                ${photo ? `<img src="${esc(photo)}" alt="">` : `<span>${initials2}</span>`}
                <span class="reg-thumb-edit">✎</span>
              </div>
            </td>
            <td class="num">${r.id}</td>
            <td class="nm"><b>${esc(r.data.teamName || r.data.name)}</b><span>${r.type === "team" ? (r.players?.length || 0) + " players" : esc(r.data.category || r.data.class || "")}</span></td>
            <td style="text-transform:capitalize">${r.type}</td>
            <td>${esc(r.contact || "—")}</td>
            <td>${statusPill(r.status)}</td>
            <td>${actions(r)}</td>
          </tr>`;
  }).join("") || `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Nothing here yet.</td></tr>`}
        </tbody></table></div>
      </div>`;
}
function bulkAll(on) { document.querySelectorAll(".bulk-chk").forEach(c => c.checked = on); bulkCount(); }
function bulkCount() { const n = document.querySelectorAll(".bulk-chk:checked").length; const el = $("#bulk-count"); if (el) el.textContent = n + " selected"; }
function selectedIds() { return [...document.querySelectorAll(".bulk-chk:checked")].map(c => c.value); }
async function bulkDelete() {
  const ids = selectedIds(); if (!ids.length) { toast("Select at least one row", "warn"); return; }
  if (!confirm(`Delete ${ids.length} registration(s)? This cannot be undone.`)) return;
  let ok = 0, fail = 0;
  for (const id of ids) {
    try { await Store.deleteReg(id); ok++; } catch (e) { fail++; }
  }
  App.regs = App.regs.filter(r => !ids.includes(r.id));
  App.publicTeams = (App.publicTeams || []).filter(r => !ids.includes(r.id));
  await Store.logAction("Bulk deleted registrations", ok + " deleted" + (fail ? ", " + fail + " failed" : ""));
  toast(`Deleted ${ok}${fail ? " (" + fail + " failed)" : ""}`);
  refreshCurrentTab();
}
function bulkPdf() {
  const ids = selectedIds(); if (!ids.length) { toast("Select at least one row", "warn"); return; }
  ids.forEach((id, i) => setTimeout(() => downloadRegPdf(id), i * 400));
  toast(`Opening ${ids.length} PDFs — allow pop-ups`);
}
function exportCsv() {
  const list = regFilter === "all" ? App.regs : App.regs.filter(r => r.type === regFilter);
  const headers = ["id", "type", "status", "name", "category", "sscBatch", "hscBatch", "contact", "email", "payment", "txn", "created"];
  const rows = list.map(r => { const d = r.data || {}; return [r.id, r.type, r.status, d.teamName || d.name || "", d.category || "", d.sscBatch || "", d.hscBatch || "", r.contact || "", d.email || r.captainEmail || "", (r.payment && r.payment.method) || "", (r.payment && r.payment.txn) || "", new Date(r.created).toISOString()].map(x => `"${String(x).replace(/"/g, '""')}"`).join(","); });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `excap-regs-${regFilter}-${Date.now()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function actions(r) {
  return `<div class="row-actions">
      ${r.status !== "approved" ? `<button class="btn btn-sm btn-pitch" onclick="approveReg('${r.id}')" title="Approve">✓</button>` : ""}
      ${r.status !== "rejected" ? `<button class="btn btn-sm btn-warn" onclick="rejectReg('${r.id}')" title="Reject with reason">✕</button>` : ""}
      <button class="btn btn-sm btn-line" onclick="editRegAll('${r.id}')" title="Edit all fields">✎</button>
      <button class="btn btn-sm btn-line" onclick="viewReg('${r.id}')" title="View profile">👁</button>
      <button class="btn btn-sm btn-line" onclick="passesModal('${r.id}')" title="QR passes">▦</button>
      <button class="btn btn-sm btn-line" onclick="downloadRegPdf('${r.id}')" title="Download PDF">⤓</button>
      <button class="btn btn-sm btn-danger" onclick="deleteReg('${r.id}')" title="Delete">🗑</button>
    </div>`;
}

function editRegPhoto(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  const currentPhoto = (r.data && r.data.photo) || "";
  showModal(`<div style="max-width:420px">
    <h3 style="margin:0 0 6px">${currentPhoto ? "Update" : "Add"} photo</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 16px">For <b>${esc(r.data.teamName || r.data.name || r.id)}</b> · ID: ${esc(r.id)}</p>

    ${currentPhoto ? `<div style="text-align:center;margin-bottom:14px">
      <div style="font-size:11px;color:var(--muted-2);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Current photo</div>
      <img src="${esc(currentPhoto)}" style="max-width:160px;max-height:160px;border-radius:12px;border:1px solid var(--line);background:#fff;padding:4px" alt="">
    </div>` : ""}

    <label class="fl">${currentPhoto ? "Replace with new photo" : "Upload photo"}</label>
    <input type="file" id="reg-photo-file" accept="image/*" style="width:100%">
    <div class="help" style="font-size:12px;color:var(--muted-2);margin-top:6px">JPG or PNG. Will be resized to fit the gate pass.</div>

    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      ${currentPhoto ? `<button class="btn btn-danger" onclick="removeRegPhoto('${r.id}')">🗑 Remove</button>` : ""}
      <button class="btn btn-primary" id="reg-photo-save" onclick="saveRegPhoto('${r.id}')">💾 Save photo</button>
    </div>
  </div>`, "narrow");
}

/* ============================================================
   Registration full-edit modal — type-aware layout
   ============================================================ */
function editRegAll(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  const d = r.data || {};

  // Route to the right form based on registration type
  if (r.type === "team") renderTeamEditor(r, d);
  else if (r.type === "guest") renderGuestEditor(r, d);
  else if (r.type === "volunteer") renderVolunteerEditor(r, d);
  else renderVisitorEditor(r, d);
}

/* -- shared helpers used inside each editor -- */
const _batchYears = (() => { const a = []; for (let y = 2032; y >= 1977; y--) a.push(String(y)); return a; })();
const _fld = (key, label, val, opts = {}) =>
  `<div class="fld">
      <label class="fl">${esc(label)}${opts.req ? ' <span class="req">*</span>' : ""}</label>
      <input id="er-${key}" value="${esc(val || "")}" ${opts.type ? `type="${opts.type}"` : ""} ${opts.ph ? `placeholder="${esc(opts.ph)}"` : ""}>
    </div>`;
const _sel = (key, label, val, options, opts = {}) =>
  `<div class="fld">
      <label class="fl">${esc(label)}${opts.req ? ' <span class="req">*</span>' : ""}</label>
      <select id="er-${key}">${options.map(o =>
    `<option value="${esc(o)}" ${o === val ? "selected" : ""}>${esc(o || "— select —")}</option>`).join("")}</select>
    </div>`;
const _txt = (key, label, val, opts = {}) =>
  `<div class="fld">
      <label class="fl">${esc(label)}</label>
      <textarea id="er-${key}" rows="${opts.rows || 3}" placeholder="${esc(opts.ph || "")}">${esc(val || "")}</textarea>
    </div>`;
const _header = (r, d) => {
  const currentPhoto = d.photo || d.logo || "";
  const name = d.teamName || d.name || "—";
  return `<div class="er-head">
      <div class="er-photo-thumb" onclick="closeModal();editRegPhoto('${r.id}')" title="Click to change photo">
        ${currentPhoto ? `<img src="${esc(currentPhoto)}">` : `<span>${esc(name.slice(0, 2).toUpperCase())}</span>`}
        <span class="er-photo-badge">✎</span>
      </div>
      <div class="er-head-info">
        <h3>Edit ${r.type} registration</h3>
        <div class="er-head-meta">
          <span class="er-id">${esc(r.id)}</span>
          <span class="er-type">${esc(r.type)}</span>
          <span class="pill ${r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'rej' : 'rev'}">${esc(r.status)}</span>
        </div>
      </div>
    </div>`;
};
const _footer = (r) => `<div class="er-foot">
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger" onclick="closeModal();deleteReg('${r.id}')">🗑 Delete</button>
    <button class="btn btn-primary" id="er-save" onclick="saveRegEdits('${r.id}')">💾 Save changes</button>
  </div>`;
const _statusSection = (r) => `
    <section class="er-sec">
      <h4>Status & internal notes</h4>
      ${_sel("status", "Status", r.status, ["review", "approved", "waitlist", "rejected"])}
      ${_txt("adminNotes", "Internal notes (not visible to registrant)", r.adminNotes, { rows: 2, ph: "Anything the organizers should remember about this registration…" })}
    </section>`;

/* -- TEAM editor -- */
function renderTeamEditor(r, d) {
  const players = r.players || [];
  const guests = r.guests || [];
  const playerRows = players.map((p, i) => `
      <div class="er-player-row">
        <span class="er-player-num">${i + 1}</span>
        <input id="er-p-name-${i}" value="${esc(p.name || "")}" placeholder="Player name">
        <input id="er-p-phone-${i}" value="${esc(p.phone || "")}" placeholder="Phone">
        <select id="er-p-role-${i}">
          ${["Player", "Captain", "Vice-captain"].map(role =>
    `<option ${p.role === role ? "selected" : ""}>${role}</option>`).join("")}
        </select>
      </div>
    `).join("");

  showModal(`<div class="reg-editor">
      ${_header(r, d)}
  
      <section class="er-sec">
        <h4>Team basics</h4>
        ${_fld("teamName", "Team name", d.teamName, { req: true })}
        <div class="grid2">
          ${_sel("category", "Category", d.category || "Alumni", ["Alumni", "Current", "Mixed"])}
          ${_fld("tshirt", "T-shirt size (optional)", d.tshirt)}
        </div>
      </section>
  
      <section class="er-sec">
        <h4>Captain & contact</h4>
        <div class="grid2">
          ${_fld("captainName", "Captain name", d.captainName, { req: true })}
          ${_fld("captainPhone", "Captain phone", d.captainPhone || r.contact, { req: true, type: "tel" })}
        </div>
        <div class="grid2">
          ${_fld("viceName", "Vice-captain", d.viceName)}
          ${_fld("email", "Captain email", d.email || r.captainEmail, { type: "email" })}
        </div>
      </section>
  
      <section class="er-sec">
        <h4>Batch</h4>
        <div class="grid2">
          ${_sel("sscBatch", "SSC batch", d.sscBatch, ["", ..._batchYears])}
          ${_sel("hscBatch", "HSC batch", d.hscBatch, ["", ..._batchYears])}
        </div>
      </section>
  
      <section class="er-sec">
        <h4>Players (${players.length}/${App.settings.playersPerTeam})</h4>
        <div class="er-players">${playerRows || `<div class="er-empty">No players added yet.</div>`}</div>
      </section>
  
      <section class="er-sec">
        <h4>Payment</h4>
        <div class="grid2">
          ${_sel("paymentStatus", "Payment status", r.paymentStatus || "pending", ["pending", "submitted", "verified", "waived", "refunded"])}
          ${_fld("paymentMethod", "Method", r.payment?.method || "bKash")}
        </div>
        <div class="grid2">
          ${_fld("paymentTxn", "Transaction ID", r.payment?.txn)}
          ${_fld("paymentSender", "Sender number", r.payment?.sender, { type: "tel" })}
        </div>
      </section>
  
      ${_statusSection(r)}
      ${_footer(r)}
    </div>`, "wide");
}

/* -- GUEST editor -- */
function renderGuestEditor(r, d) {
  showModal(`<div class="reg-editor">
      ${_header(r, d)}
  
      <section class="er-sec">
        <h4>Personal information</h4>
        ${_fld("name", "Full name", d.name, { req: true })}
        <div class="grid2">
          ${_fld("contact", "Mobile", r.contact || d.phone, { req: true, type: "tel" })}
          ${_fld("email", "Email", d.email, { req: true, type: "email" })}
        </div>
        ${_sel("category", "Category", d.category || "Alumni", ["Alumni", "Current student", "Family", "Friend", "Other"])}
      </section>
  
      <section class="er-sec">
        <h4>Batch</h4>
        <div class="grid2">
          ${_sel("sscBatch", "SSC batch", d.sscBatch, ["", ..._batchYears])}
          ${_sel("hscBatch", "HSC batch", d.hscBatch, ["", ..._batchYears])}
        </div>
        ${_fld("nid", "NID number (optional)", d.nid, { ph: "For organizer records only" })}
      </section>
  
      ${_statusSection(r)}
      ${_footer(r)}
    </div>`, "wide");
}

/* -- VISITOR editor -- */
function renderVisitorEditor(r, d) {
  showModal(`<div class="reg-editor">
      ${_header(r, d)}
  
      <section class="er-sec">
        <h4>Personal information</h4>
        ${_fld("name", "Full name", d.name, { req: true })}
        <div class="grid2">
          ${_fld("contact", "Mobile", r.contact || d.phone, { req: true, type: "tel" })}
          ${_fld("email", "Email", d.email, { type: "email" })}
        </div>
        ${_fld("relation", "Relation to team / player (optional)", d.relation)}
      </section>
  
      <section class="er-sec">
        <h4>Batch (optional)</h4>
        <div class="grid2">
          ${_sel("sscBatch", "SSC batch", d.sscBatch, ["", ..._batchYears])}
          ${_sel("hscBatch", "HSC batch", d.hscBatch, ["", ..._batchYears])}
        </div>
      </section>
  
      ${_statusSection(r)}
      ${_footer(r)}
    </div>`, "wide");
}

/* -- VOLUNTEER editor -- */
function renderVolunteerEditor(r, d) {
  showModal(`<div class="reg-editor">
    ${_header(r, d)}

    <section class="er-sec">
      <h4>Personal information</h4>
      ${_fld("name", "Full name", d.name, { req: true })}
      <div class="grid2">
        ${_fld("contact", "Mobile", r.contact || d.phone, { req: true, type: "tel" })}
        ${_fld("email", "Email", d.email, { req: true, type: "email" })}
      </div>
      ${_sel("volunteerType", "Type", d.volunteerType || "ex", ["ex", "present"])}
      ${_sel("club", "Volunteering under club", d.club || "business", ["business", "sports"])}
    </section>

    <section class="er-sec">
      <h4>Batch</h4>
      <div class="grid2">
        ${_sel("sscBatch", "SSC batch", d.sscBatch, ["", ..._batchYears])}
        ${_sel("hscBatch", "HSC batch", d.hscBatch, ["", ..._batchYears])}
      </div>
      ${d.volunteerType === "present" ? `
        <div class="grid2">
          ${_sel("studentClass", "Class", d.studentClass, ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"])}
          ${_fld("studentId", "Student ID", d.studentId)}
        </div>
      ` : ""}
    </section>

    <section class="er-sec">
      <h4>Volunteer assignment (admin only)</h4>
      ${_fld("assignedRole", "Assigned role", d.assignedRole, { ph: "e.g. Registration desk, First aid, Referee assistant" })}
      <div class="grid2">
        ${_fld("assignedZone", "Zone", d.assignedZone, { ph: "e.g. Gate 1, Field north side" })}
        ${_fld("shift", "Shift", d.shift, { ph: "e.g. 9am–1pm" })}
      </div>
      ${_sel("dutyStatus", "Duty status", d.dutyStatus || "Pending", ["Pending", "Confirmed", "On duty", "Completed", "No show"])}
    </section>

    ${_statusSection(r)}
    ${_footer(r)}
  </div>`, "wide");
}

/* -- unified save -- */
async function saveRegEdits(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  const btn = $("#er-save");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';

  const gv = k => { const el = document.getElementById("er-" + k); return el ? el.value.trim() : undefined; };
  const setIf = (obj, key, v) => { if (v !== undefined) obj[key] = v; };

  try {
    r.data = r.data || {};

    // Common fields present in all types
    setIf(r.data, "category", gv("category"));
    setIf(r.data, "sscBatch", gv("sscBatch"));
    setIf(r.data, "hscBatch", gv("hscBatch"));
    setIf(r.data, "email", gv("email"));
    setIf(r.data, "nid", gv("nid"));

    // Type-specific
    if (r.type === "team") {
      setIf(r.data, "teamName", gv("teamName"));
      setIf(r.data, "captainName", gv("captainName"));
      setIf(r.data, "captainPhone", gv("captainPhone"));
      setIf(r.data, "viceName", gv("viceName"));
      setIf(r.data, "tshirt", gv("tshirt"));
      if (gv("captainPhone") !== undefined) r.contact = gv("captainPhone");
      if (gv("email") !== undefined) r.captainEmail = gv("email");

      // Players
      const players = [];
      (r.players || []).forEach((_, i) => {
        players.push({
          name: gv("p-name-" + i) || "",
          phone: gv("p-phone-" + i) || "",
          role: gv("p-role-" + i) || "Player",
          status: r.players[i]?.status || "registered"
        });
      });
      if (players.length) r.players = players;

      // Payment
      r.payment = r.payment || {};
      setIf(r.payment, "method", gv("paymentMethod"));
      setIf(r.payment, "txn", gv("paymentTxn"));
      setIf(r.payment, "sender", gv("paymentSender"));
      setIf(r, "paymentStatus", gv("paymentStatus"));
    } else {
      // Non-team types share these
      setIf(r.data, "name", gv("name"));
      if (gv("contact") !== undefined) r.contact = gv("contact");
      setIf(r.data, "relation", gv("relation"));
      setIf(r.data, "preferredRole", gv("preferredRole"));
      setIf(r.data, "availability", gv("availability"));
      setIf(r.data, "experience", gv("experience"));
      // Volunteer-specific
      setIf(r.data, "volunteerType", gv("volunteerType"));
      setIf(r.data, "studentClass", gv("studentClass"));
      setIf(r.data, "studentId", gv("studentId"));
      setIf(r.data, "assignedRole", gv("assignedRole"));
      setIf(r.data, "assignedZone", gv("assignedZone"));
      setIf(r.data, "shift", gv("shift"));
      setIf(r.data, "dutyStatus", gv("dutyStatus"));
      setIf(r.data, "volunteerType", gv("volunteerType"));
      setIf(r.data, "club", gv("club"));
      setIf(r.data, "clubName", gv("club") === "sports" ? "Sports Club" : gv("club") === "business" ? "Business & Career Club" : undefined);
      setIf(r.data, "studentClass", gv("studentClass"));
      setIf(r.data, "studentId", gv("studentId"));
      setIf(r.data, "assignedRole", gv("assignedRole"));
      setIf(r.data, "assignedZone", gv("assignedZone"));
      setIf(r.data, "shift", gv("shift"));
      setIf(r.data, "dutyStatus", gv("dutyStatus"));
    }

    // Status + notes (all types)
    setIf(r, "status", gv("status"));
    setIf(r, "adminNotes", gv("adminNotes"));

    await Store.saveReg(r);
    await Store.logAction("Edited registration", r.id);
    toast("Saved ✓");
    closeModal();
    adminRegistrations();
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = "💾 Save changes";
    toast("Save failed: " + (e.message || "error"), "err");
  }
}

async function saveRegPhoto(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  const file = $("#reg-photo-file").files[0];
  if (!file) { toast("Pick a photo first", "warn"); return; }
  if (file.size > 5 * 1024 * 1024) { toast("Photo too large (max 5 MB)", "err"); return; }

  const btn = $("#reg-photo-save");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    // Read + resize to keep Firestore document small (photo lives in the reg doc)
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 480;
          let w = img.width, h = img.height;
          if (w > max || h > max) {
            if (w > h) { h = Math.round(h * max / w); w = max; }
            else { w = Math.round(w * max / h); h = max; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    r.data = r.data || {};
    r.data.photo = dataUrl;
    await Store.saveReg(r);
    await Store.logAction("Updated photo", r.id);
    toast("Photo saved ✓");
    closeModal();
    adminRegistrations();
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = "💾 Save photo";
    toast("Save failed: " + (e.message || "error"), "err");
  }
}

async function removeRegPhoto(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`Remove the photo for ${r.data.teamName || r.data.name}?`)) return;
  try {
    r.data.photo = "";
    await Store.saveReg(r);
    await Store.logAction("Removed photo", r.id);
    toast("Photo removed");
    closeModal();
    adminRegistrations();
  } catch (e) {
    toast("Failed: " + (e.message || "error"), "err");
  }
}

function rejectReg(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  const name = r.data.teamName || r.data.name || r.type;

  // Common reasons as quick-pick chips
  const commonReasons = [
    "Slots full — please try next edition",
    "Incomplete player list",
    "Payment not verified",
    "Duplicate registration",
    "Does not meet eligibility criteria"
  ];

  showModal(`<div style="max-width:480px">
    <h3 style="margin:0 0 6px;color:#dc2626">Reject registration</h3>
    <p style="color:var(--muted);font-size:13px;margin:0 0 16px">Rejecting <b>${esc(name)}</b> (${esc(r.id)}). An SMS will be sent to the registrant with the reason.</p>

    <label class="fl">Reason (will be sent in SMS) <span class="req">*</span></label>
    <textarea id="rej-reason" rows="3" placeholder="Type the reason clearly and briefly..." style="width:100%"></textarea>
    <div class="help" style="font-size:11px;color:var(--muted-2);margin-top:6px">Keep under 120 characters to fit in one SMS.</div>

    <div style="margin-top:14px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-2);margin-bottom:8px">Quick reasons</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${commonReasons.map(reason => `
          <button class="btn btn-sm btn-line" onclick="document.getElementById('rej-reason').value='${esc(reason)}'">${esc(reason)}</button>
        `).join("")}
      </div>
    </div>

    <div class="form-actions" style="margin-top:20px">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="rej-confirm" onclick="confirmReject('${r.id}')">✕ Reject & send SMS</button>
    </div>
  </div>`, "narrow");

  // Autofocus
  setTimeout(() => { const t = document.getElementById("rej-reason"); if (t) t.focus(); }, 100);
}

async function confirmReject(id) {
  const r = App.regs.find(x => x.id === id);
  if (!r) return;
  const reason = document.getElementById("rej-reason").value.trim();
  if (!reason) { toast("Please enter a reason", "warn"); return; }

  const btn = $("#rej-confirm");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Rejecting…';

  try {
    r.status = "rejected";
    r.rejectionReason = reason;
    r.rejectedAt = Date.now();
    await Store.saveReg(r);
    await Store.logAction("Rejected registration", r.id + " — " + reason);

    // Send rejection SMS
    const phone = r.contact || r.data.phone || r.data.captainPhone || "";
    let smsOk = false;
    if (phone && window.Notify) {
      const name = r.data.teamName || r.data.name || "there";
      const shortId = r.id.replace("EXCAP-FT26-", "");
      const smsBody = `Dear ${name},\nWe regret to inform you that your ${r.type} registration (${shortId}) for the EX-CAP Football Tournament could not be approved.\nReason: ${reason}\nFor questions, please contact 01711988862.\nRegards,\nEX-CAP`;
      const result = await Notify.sendSMS({ to: phone, message: smsBody });
      smsOk = result && result.ok;
    }

    toast(smsOk ? "Rejected. SMS sent ✓" : phone ? "Rejected. SMS failed — inform manually" : "Rejected. No phone on file", smsOk ? "" : "warn");
    closeModal();
    adminRegistrations();
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = "✕ Reject & send SMS";
    toast("Reject failed: " + (e.message || "error"), "err");
  }
}

function refreshCurrentTab() {
  const rerender = {
    dashboard: adminDashboard,
    registrations: adminRegistrations,
    teams: adminTeams,
    volunteers: adminVolunteers,
    checkin: adminCheckin,
    payments: adminPayments,
    messages: adminMessages,
    brandkit: typeof adminBrandKit === "function" ? adminBrandKit : null,
    scoreboard: adminScoreboard,
    results: adminResults,
    manual: adminManual,
    broadcast: adminBroadcast,
    branding: adminBranding,
    announcement: adminAnnouncement,
    settings: adminSettings,
    profile: adminProfile,
    log: adminLog
  };
  const fn = rerender[adminTab];
  if (typeof fn === "function") {
    try { fn(); } catch (e) { renderAdmin(); }
  } else {
    renderAdmin();
  }
}

async function approveReg(id) {
  const r = App.regs.find(x => x.id === id); if (!r) return;
  r.status = "approved"; if (r.paymentStatus && r.paymentStatus === "submitted") r.paymentStatus = "verified";
  await Store.saveReg(r);
  await Store.logAction("Approved registration", r.id + " — " + (r.data.teamName || r.data.name || r.type));

  // Volunteers get no notifications — organizers contact them directly
  if (r.type === "volunteer") {
    toast("Volunteer approved (no notifications sent)");
    refreshCurrentTab();
    return;
  }

  toast("Approved — sending email & SMS…");
  const res = await Notify.onApproved(r, App.settings);
  const e = res.email, s = res.sms;
  let m = "Approved. ";
  m += e ? (e.ok ? "Email sent. " : e.skipped ? "Email skipped (configure EmailJS). " : "Email failed. ") : "No email on file. ";
  m += s ? (s.ok ? "SMS sent." : "SMS pending (configure SMSQ).") : "No mobile on file.";
  toast(m, (e && e.ok) || (s && s.ok) ? "" : "warn");
  refreshCurrentTab();
}
async function setStatus(id, status) { const r = App.regs.find(x => x.id === id); if (!r) return; r.status = status; await Store.saveReg(r); await Store.logAction("Changed status → " + status, r.id + " — " + (r.data.teamName || r.data.name || "")); toast("Marked " + status); refreshCurrentTab(); }
function viewReg(id) {
  const r = App.regs.find(x => x.id === id); if (!r) return; const d = r.data || {};
  const name = d.teamName || d.name || "Participant";
  const sub = r.type === "team" ? (d.category || "Team") + (d.batch ? " · " + d.batch : "") : (d.role || d.relation || r.type);
  const tel = (r.contact || d.phone || d.captainPhone || "").replace(/[^\d+]/g, "");
  const email = d.email || r.captainEmail || "";
  const logo = d.logo || d.photo || "";
  let rows;
  if (r.type === "team") {
    rows = [["Category", d.category], ["Batch", d.batch], ["Captain", d.captainName], ["Captain phone", d.captainPhone], ["Vice-captain", d.viceName], ["Email", r.captainEmail]];
  } else {
    rows = Object.entries(d).filter(([k]) => !["photo", "logo", "name"].includes(k)).map(([k, v]) => [flabel(k), v]);
    rows.push(["Contact", r.contact]);
  }
  const detailHTML = rows.filter(([, v]) => v).map(([k, v]) => `<div class="pf-row"><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join("");
  let squad = "";
  if (r.type === "team") {
    const players = (r.players || []).filter(p => p && p.name);
    const guests = (r.guests || []).filter(g => g && g.name);
    if (players.length) squad += `<div class="pf-sec">Players · ${players.length}</div><div class="pf-people">${players.map((p, i) => `<div class="pf-person"><span class="pf-n">${i + 1}</span><b>${esc(p.name)}</b><span class="pf-ph">${esc(p.phone || "")}</span></div>`).join("")}</div>`;
    if (guests.length) squad += `<div class="pf-sec">Guests · ${guests.length}</div><div class="pf-people">${guests.map((g, i) => `<div class="pf-person"><span class="pf-n">G${i + 1}</span><b>${esc(g.name)}</b><span class="pf-ph">${esc(g.phone || "")}</span></div>`).join("")}</div>`;
  }
  const pay = r.payment && (r.payment.method || r.payment.txn)
    ? `<div class="pf-sec">Payment</div><div class="pf-row"><span>Method</span><b>${esc(r.payment.method || "—")}</b></div><div class="pf-row"><span>Txn ID</span><b>${esc(r.payment.txn || "—")}</b></div><div class="pf-row"><span>Status</span><b>${esc(r.paymentStatus || "pending")}</b></div>${r.payment.shot ? `<img src="${r.payment.shot}" style="margin-top:10px;border-radius:10px;border:1px solid var(--line);max-width:100%">` : ""}`
    : "";
  showModal(`<div class="pf">
        <div class="pf-head">
          <div class="pf-ava">${logo ? `<img src="${esc(logo)}" alt="">` : esc(initials(name))}</div>
          <div class="pf-id">
            <h3>${esc(name)}</h3>
            <span class="pf-sub">${esc(sub)}</span>
            <div class="pf-tags"><span class="pill ${r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'rev' : ''}">${esc(r.status)}</span><span class="pf-code">${esc(r.id)}</span><span class="pf-type">${esc(r.type)}</span></div>
          </div>
        </div>
        <div class="pf-quick">
          ${tel ? `<a class="pf-q" href="tel:${esc(tel)}">📞 Call</a>` : ""}
          ${email ? `<a class="pf-q" href="mailto:${esc(email)}">✉ Email</a>` : ""}
          <span class="pf-q ghost">📅 ${fmtDateTime(r.created)}</span>
        </div>
        <div class="pf-body">${detailHTML}${squad}${pay}</div>
        <div class="form-actions">
        ${r.status !== "approved" ? `<button class="btn btn-pitch" onclick="closeModal();approveReg('${r.id}')">Approve & notify</button>` : ""}
        <button class="btn btn-line" onclick="editReg('${r.id}')">✎ Edit all details</button>
        ${r.type === "team" ? `<button class="btn btn-line" onclick="passesModal('${r.id}')">QR passes</button>` : ""}
        <button class="btn btn-line" onclick="downloadRegPdf('${r.id}')">⤓ PDF</button>
        <button class="btn btn-danger" onclick="deleteReg('${r.id}')">🗑 Delete</button>
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        </div>
      </div>`, "wide");
}

/* ---- full registration editor ---- */
const FIELD_LABELS = { teamName: "Team name", category: "Category", batch: "Batch", captainName: "Captain name", captainPhone: "Captain phone", viceName: "Vice-captain", name: "Full name", phone: "Phone", email: "Email", class: "Class / batch", roll: "Roll / ID", institution: "Institution", relation: "Relation", organization: "Organization", inviteCode: "Invite code", teamRef: "Team", role: "Preferred role", zone: "Zone", availability: "Availability", experience: "Experience", tshirt: "T-shirt size", emergency: "Emergency contact", address: "Address", note: "Note", reason: "Reason", sscBatch: "SSC batch", hscBatch: "HSC batch" };
function flabel(k) { return FIELD_LABELS[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()); }
function editReg(id) {
  const r = App.regs.find(x => x.id === id); if (!r) return; const d = r.data || {};
  const skip = ["photo", "logo"];
  const keys = Object.keys(d).filter(k => !skip.includes(k));
  const fieldHTML = keys.map(k => {
    const v = d[k] == null ? "" : d[k];
    const long = String(v).length > 48 || /address|note|reason|message|experience|availability/i.test(k);
    return `<label class="el"><span>${esc(flabel(k))}</span>${long
      ? `<textarea data-dk="${esc(k)}" rows="2">${esc(String(v))}</textarea>`
      : `<input data-dk="${esc(k)}" value="${esc(String(v))}">`}</label>`;
  }).join("");
  const meta = `<label class="el"><span>Contact phone</span><input id="er-contact" value="${esc(r.contact || "")}"></label>
        ${r.captainEmail !== undefined ? `<label class="el"><span>Captain email</span><input id="er-cemail" value="${esc(r.captainEmail || "")}"></label>` : ""}
        <label class="el"><span>Status</span><select id="er-status">${["pending", "approved", "rejected", "waitlist"].map(st => `<option ${r.status === st ? "selected" : ""}>${st}</option>`).join("")}</select></label>`;
  let squad = "";
  if (r.type === "team") {
    squad = `<div class="er-sec">Players (${(r.players || []).length})</div>` + (r.players || []).map((p, i) =>
      `<div class="er-row"><input data-pk="${i}" data-f="name" value="${esc(p.name || "")}" placeholder="Player ${i + 1} name"><input data-pk="${i}" data-f="phone" value="${esc(p.phone || "")}" placeholder="Phone"></div>`).join("");
    if ((r.guests || []).length) squad += `<div class="er-sec">Guests (${r.guests.length})</div>` + (r.guests || []).map((g, i) =>
      `<div class="er-row"><input data-gk="${i}" data-f="name" value="${esc(g.name || "")}" placeholder="Guest ${i + 1} name"><input data-gk="${i}" data-f="phone" value="${esc(g.phone || "")}" placeholder="Phone"></div>`).join("");
  }
  showModal(`<h3>Edit ${r.id}</h3><p style="text-transform:capitalize">${esc(r.type)} registration · all member-filled fields are editable</p>
        <div class="er-grid">${fieldHTML}${meta}</div>${squad}
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveRegEdit('${r.id}')">Save changes</button></div>`, "wide");
}
async function saveRegEdit(id) {
  const r = App.regs.find(x => x.id === id); if (!r) return;
  document.querySelectorAll("#modal [data-dk]").forEach(el => { r.data[el.getAttribute("data-dk")] = el.value; });
  const c = $("#er-contact"); if (c) r.contact = c.value;
  const ce = $("#er-cemail"); if (ce) r.captainEmail = ce.value;
  const st = $("#er-status"); if (st) r.status = st.value;
  if (r.players) document.querySelectorAll("#modal [data-pk]").forEach(el => { const i = +el.getAttribute("data-pk"); r.players[i] = r.players[i] || {}; r.players[i][el.getAttribute("data-f")] = el.value; });
  if (r.guests) document.querySelectorAll("#modal [data-gk]").forEach(el => { const i = +el.getAttribute("data-gk"); r.guests[i] = r.guests[i] || {}; r.guests[i][el.getAttribute("data-f")] = el.value; });
  try { await Store.saveReg(r); await Store.logAction("Edited registration", r.id + " — " + (r.data.teamName || r.data.name || r.type)); toast("Registration updated"); closeModal(); refreshCurrentTab(); }
  catch (e) { toast("Could not save: " + (e.message || "error"), "err"); }
}
async function deleteReg(id) {
  const r = App.regs.find(x => x.id === id); if (!r) return;
  const name = (r.data && (r.data.teamName || r.data.name)) || r.id;
  if (!confirm(`Delete registration "${name}"?\n\nThis removes it permanently for both the admin and public views. Cannot be undone.`)) return;
  try {
    await Store.deleteReg(id);
    App.regs = App.regs.filter(x => x.id !== id);
    App.publicTeams = (App.publicTeams || []).filter(x => x.id !== id);
    await Store.logAction("Deleted registration", id + " — " + name);
    toast("Registration deleted");
    closeModal(); refreshCurrentTab();
  } catch (e) {
    toast("Could not delete: " + (e.message || "error"), "err");
  }
}
function passesModal(id) {
  const r = App.regs.find(x => x.id === id); if (!r) return;
  const who = r.data.teamName || r.data.name || "Registrant";
  const tile = (code, name, sub) => `<div class="pass-mini"><div class="qb">${qrSvg(code)}</div><b>${esc(name)}</b><span>${esc(sub)}</span><div style="font-size:9px;color:#888;margin-top:3px">${esc(code)}</div></div>`;
  let tiles = tile(r.id, who, (r.type || "") + " pass");
  if (r.type === "team") {
    (r.players || []).forEach((p, i) => { tiles += tile(r.id + "#P" + (i + 1), p.name || ("Player " + (i + 1)), p.role || ("Player " + (i + 1))); });
    (r.guests || []).forEach((g, i) => { tiles += tile(r.id + "#G" + (i + 1), g.name || ("Guest " + (i + 1)), "Guest"); });
  }
  showModal(`<h3>QR passes — ${esc(who)}</h3><p>Scan these at the gate. Each player & guest has a unique code. Download a printable PDF for the whole registration.</p>
        <div class="pass-print">${tiles}</div>
        <div class="form-actions"><button class="btn btn-primary" onclick="downloadRegPdf('${r.id}')">⤓ Download PDF</button><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>`, "wide");
}

/* ---------- payments ---------- */
function adminPayments() {
  const pays = teamRegs().filter(r => r.payment && r.payment.txn);
  $("#admin-body").innerHTML = `<div class="panel"><h3>Payment verification</h3><p class="ph-help">Verify transaction details submitted with team registrations.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Team</th><th>Method</th><th>Reference</th><th>Sender</th><th>Status</th><th></th></tr></thead><tbody>
        ${pays.map(r => `<tr><td class="nm"><b>${esc(r.data.teamName)}</b><span>${r.id}</span></td><td>${esc(r.payment.method)}</td><td class="num">${esc(r.payment.txn)}</td><td>${esc(r.payment.sender || "—")}</td>
          <td><span class="pill ${r.paymentStatus === 'verified' ? 'ok' : 'rev'}">${esc(r.paymentStatus || '—')}</span></td>
          <td>${r.paymentStatus !== 'verified' ? `<button class="btn btn-sm btn-pitch" onclick="verifyPay('${r.id}')">Verify</button>` : '✓'}</td></tr>`).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No payments yet.</td></tr>`}
        </tbody></table></div></div>`;
}
async function verifyPay(id) { const r = App.regs.find(x => x.id === id); if (!r) return; r.paymentStatus = "verified"; await Store.saveReg(r); await Store.logAction("Verified payment", r.id + " — " + (r.data.teamName || "")); toast("Payment verified"); adminPayments(); }

/* ---------- manual payment recording ---------- */
function adminManual() {
  const teams = teamRegs();
  $("#admin-body").innerHTML = `<div class="panel" style="max-width:560px"><h3>Record a manual payment</h3>
        <p class="ph-help">Use this when a team pays by cash or any non-bKash method at the desk. It marks the team's payment verified.</p>
        <label class="fl">Team</label>
        <select id="mp-team">${teams.map(t => `<option value="${t.id}">${esc(t.data.teamName)} (${t.id})</option>`).join("") || "<option>No teams yet</option>"}</select>
        <div class="grid2"><div>${field("mp-method", "Method", { type: "select", options: ["Cash", "bKash (manual)", "Nagad", "Bank", "Other"] })}</div><div>${field("mp-amount", "Amount (৳)", { val: App.settings.teamFee })}</div></div>
        ${field("mp-ref", "Reference / note", { ph: "Receipt no. or note" })}
        <button class="btn btn-primary" style="margin-top:16px" onclick="recordManual()">Record payment ✓</button></div>`;
}
async function recordManual() {
  const id = $("#mp-team").value; const r = App.regs.find(x => x.id === id);
  if (!r) { toast("Select a team", "warn"); return; }
  r.payment = { ...(r.payment || {}), mode: "manual", method: val("mp-method"), txn: val("mp-ref") || ("CASH-" + Date.now().toString().slice(-6)), amount: val("mp-amount"), recordedBy: Store.adminInfo().name, recordedAt: Date.now() };
  r.paymentStatus = "verified";
  await Store.saveReg(r);
  await Store.logAction("Recorded " + val("mp-method") + " payment ৳" + val("mp-amount"), r.id + " — " + r.data.teamName);
  toast("Payment recorded for " + r.data.teamName); adminManual();
}

/* ---------- branding & logos ---------- */
function adminBranding() {
  const baseSlots = LOGO_SLOTS;
  const clubSlots = getClubs().filter(c => !baseSlots.some(s => s.key === c.key)).map(c => ({ key: c.key, name: c.name, sub: "Club logo" }));
  const slots = baseSlots.concat(clubSlots);
  $("#admin-body").innerHTML = `<div class="panel"><h3>Logos</h3><p class="ph-help">Upload or replace any logo. Changes apply instantly across the site. PNG with transparency works best. Each logo is auto-compressed to fit under Firestore's 1 MB shared-document limit.</p>
        <div class="logo-manager">${slots.map(s => `<div class="logo-slot">
          <div class="box">${App.logos[s.key] ? `<img src="${App.logos[s.key]}">` : `<span class="ph2">No logo</span>`}</div>
          <b>${esc(s.name)}</b><span>${esc(s.sub)}</span>
          <div class="row2"><button class="btn btn-sm btn-primary" style="flex:1" onclick="$('#lf-${s.key}').click()">Upload</button>${App.logos[s.key] ? `<button class="btn btn-sm btn-line" onclick="removeLogoSlot('${s.key}')">Remove</button>` : ""}</div>
          <input id="lf-${s.key}" type="file" accept="image/*" class="hidden" onchange="setLogoSlot(event,'${s.key}')"></div>`).join("")}</div></div>
  
        <div class="panel"><h3>Affiliated clubs</h3><p class="ph-help">These appear on the home page and the maintenance page. Upload each club's logo in the Logos section above — the slot appears automatically for every club here.</p>
          <div id="club-editor">${getClubs().map((c, i) => clubEditRow(c, i)).join("")}</div>
          <div class="row2" style="margin-top:6px"><button class="btn btn-sm btn-line" onclick="addClub()">+ Add club</button><button class="btn btn-sm btn-primary" onclick="saveClubs()">Save clubs</button></div>
        </div>
  
        <div class="panel"><h3>Colours</h3><p class="ph-help">Primary brand gradient used across the site.</p>
          <div class="grid2" style="max-width:420px"><div><label class="fl">Purple</label><div class="swatch"><input type="color" id="b-purple" value="${App.settings.brand?.purple || cfg.brand.purple}"></div></div>
          <div><label class="fl">Magenta</label><div class="swatch"><input type="color" id="b-magenta" value="${App.settings.brand?.magenta || cfg.brand.magenta}"></div></div></div>
          <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="saveColors()">Apply colours</button></div>`;
}
function adminBrandKit() {
  const items = App.brand || [];
  const categories = [...new Set(items.map(i => i.category || "General"))];
  const totalSize = items.reduce((a, i) => a + (i.size || 0), 0);

  $("#admin-body").innerHTML = `<div class="panel">
    <div class="brandkit-head">
      <div>
        <h3>Brand kit</h3>
        <p class="ph-help">Upload logos, cover photos, posters, and other brand materials. Public site: <a onclick="window.open('/#brand','_blank')" style="color:var(--purple);cursor:pointer">sports.excapscpsc.com/#brand ↗</a></p>
      </div>
      <button class="btn btn-primary" onclick="editBrandItem()">+ Add material</button>
    </div>

    <div class="bk-stats">
      <div class="bk-stat"><div class="bk-s-ic">📦</div><div><b>${items.length}</b><span>Materials</span></div></div>
      <div class="bk-stat"><div class="bk-s-ic">🗂️</div><div><b>${categories.length}</b><span>Categories</span></div></div>
      <div class="bk-stat"><div class="bk-s-ic">💾</div><div><b>${bi_fmtSize(totalSize)}</b><span>Total storage</span></div></div>
    </div>

    ${items.length ? `
      <div class="bk-grid">
        ${items.map(item => bkAdminCard(item)).join("")}
      </div>
    ` : `
      <div class="empty-wall" style="padding:60px 20px;text-align:center">
        <div style="font-size:56px;margin-bottom:14px;opacity:.5">🎨</div>
        <b style="font-size:16px">No brand materials yet</b>
        <p style="color:var(--muted-2);margin-top:8px;margin-bottom:20px">Add logos, posters, cover photos etc. that people can download from the public brand page.</p>
        <button class="btn btn-primary" onclick="editBrandItem()">+ Add your first material</button>
      </div>
    `}
  </div>`;
}

function bkAdminCard(item) {
  const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.url || "") || (item.mime || "").startsWith("image/");
  return `<div class="bk-card">
    <div class="bk-prev">
      ${isImg ? `<img src="${esc(item.url)}" alt="">` : `<div class="bk-file-ic">${bi_fileIcon(item.mime)}</div>`}
      <span class="bk-badge">${esc(item.category || "General")}</span>
    </div>
    <div class="bk-body">
      <b>${esc(item.title)}</b>
      ${item.description ? `<span class="bk-desc">${esc(item.description)}</span>` : ""}
      <div class="bk-meta">
        ${item.mime ? `<span class="chip">${esc((item.mime.split("/")[1] || "file").toUpperCase())}</span>` : ""}
        <span class="chip">${bi_fmtSize(item.size || 0)}</span>
      </div>
      <div class="bk-actions">
        <button class="btn btn-sm btn-line" onclick="editBrandItem('${esc(item.id)}')">✎ Edit</button>
        <a class="btn btn-sm btn-line" href="${esc(item.url)}" target="_blank">👁 View</a>
        <button class="btn btn-sm btn-line" onclick="copyBrandLink('${esc(item.id)}')">🔗 Share</button>
        <button class="btn btn-sm btn-danger" onclick="deleteBrandItem('${esc(item.id)}')">🗑</button>
      </div>
    </div>
  </div>`;
}

function editBrandItem(id) {
  const existing = id ? (App.brand || []).find(x => x.id === id) : null;
  const item = existing || { id: "BR" + Date.now().toString(36).toUpperCase(), title: "", description: "", category: "Logos", url: "", path: "", mime: "", size: 0, order: (App.brand || []).length };
  showModal(`<div class="bk-editor">
    <div class="bk-ed-head">
      <div class="bk-ed-ic">${existing ? "✎" : "＋"}</div>
      <div>
        <h3>${existing ? "Edit material" : "Add brand material"}</h3>
        <p>High-resolution files preserve quality for print, jerseys and social media.</p>
      </div>
    </div>

    <div class="bk-ed-body">
      <div class="bk-ed-col-left">
        <div class="bk-ed-drop" id="bk-drop">
          <div class="bk-drop-inner" id="bk-drop-inner">
            ${item.url ? `
              <div class="bk-drop-current">
                ${/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.url) ? `<img src="${esc(item.url)}" alt="">` : `<div class="bk-drop-file">${bi_fileIcon(item.mime)}</div>`}
                <div class="bk-drop-info">
                  <b>Current file</b>
                  <span>${esc(item.mime || "file")} · ${bi_fmtSize(item.size)}</span>
                </div>
              </div>
            ` : `
              <div class="bk-drop-empty">
                <div class="bk-drop-emoji">📤</div>
                <b>Drop file here or click to browse</b>
                <span>PNG · JPG · SVG · PDF · ZIP · up to 25 MB</span>
              </div>
            `}
          </div>
          <input type="file" id="bk-file" accept="image/*,.pdf,.zip,.svg" style="position:absolute;inset:0;opacity:0;cursor:pointer">
        </div>
        <div id="bk-progress" style="display:none;margin-top:12px">
          <div class="bk-bar"><div class="bk-bar-in" id="bk-bar"></div></div>
          <span id="bk-pct">Uploading… 0%</span>
        </div>
      </div>

      <div class="bk-ed-col-right">
        <div class="fld">
          <label class="fl">Title <span class="req">*</span></label>
          <input id="bk-title" value="${esc(item.title)}" placeholder="e.g. EX-CAP main logo">
        </div>
        <div class="grid2">
          <div class="fld">
            <label class="fl">Category</label>
            <select id="bk-cat">
              ${["Logos", "Cover Photos", "Posters", "Icons", "Fonts", "Guidelines", "Photos", "Other"].map(c => `<option ${item.category === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
          <div class="fld">
            <label class="fl">Order</label>
            <input id="bk-order" type="number" value="${item.order || 0}">
          </div>
        </div>
        <div class="fld">
          <label class="fl">Description</label>
          <textarea id="bk-desc" placeholder="Where and how to use">${esc(item.description || "")}</textarea>
        </div>
      </div>
    </div>

    <div class="bk-ed-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="bk-save" onclick="saveBrandItem('${esc(item.id)}')">💾 ${existing ? "Save changes" : "Add material"}</button>
    </div>
  </div>`, "wide");

  // Live filename preview on file selection
  setTimeout(() => {
    const f = document.getElementById("bk-file");
    if (!f) return;
    f.addEventListener("change", () => {
      if (!f.files[0]) return;
      const file = f.files[0];
      const inner = document.getElementById("bk-drop-inner");
      const isImg = file.type.startsWith("image/");
      if (isImg) {
        const reader = new FileReader();
        reader.onload = e => {
          inner.innerHTML = `<div class="bk-drop-current">
            <img src="${e.target.result}" alt="">
            <div class="bk-drop-info"><b>${esc(file.name)}</b><span>${bi_fmtSize(file.size)} · Ready to upload</span></div>
          </div>`;
        };
        reader.readAsDataURL(file);
      } else {
        inner.innerHTML = `<div class="bk-drop-current">
          <div class="bk-drop-file">${bi_fileIcon(file.type)}</div>
          <div class="bk-drop-info"><b>${esc(file.name)}</b><span>${bi_fmtSize(file.size)} · Ready to upload</span></div>
        </div>`;
      }
      // Autofill title from filename if empty
      const titleInput = document.getElementById("bk-title");
      if (titleInput && !titleInput.value) {
        titleInput.value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      }
    });

    // Drag & drop styling
    const drop = document.getElementById("bk-drop");
    ["dragover", "dragenter"].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.add("dragging"); }));
    ["dragleave", "drop"].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.remove("dragging"); }));
    drop.addEventListener("drop", e => {
      if (e.dataTransfer.files[0]) { f.files = e.dataTransfer.files; f.dispatchEvent(new Event("change")); }
    });
  }, 50);
}

async function saveBrandItem(id) {
  const btn = $("#bk-save"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  const existing = (App.brand || []).find(x => x.id === id) || { id, order: (App.brand || []).length };
  const item = {
    ...existing,
    title: val("bk-title"),
    category: val("bk-cat"),
    description: val("bk-desc"),
    order: parseInt(val("bk-order")) || 0,
    updated: Date.now()
  };
  if (!item.title) { toast("Title required", "warn"); btn.disabled = false; btn.innerHTML = "💾 Save material"; return; }

  const fileInput = $("#bk-file");
  if (fileInput.files[0]) {
    const f = fileInput.files[0];
    if (f.size > 25 * 1024 * 1024) { toast("File too large (max 25 MB)", "err"); btn.disabled = false; btn.innerHTML = "💾 Save material"; return; }
    try {
      $("#bk-progress").style.display = "block";
      const uploaded = await Store.uploadBrandFile(f, pct => {
        $("#bk-bar").style.width = pct + "%";
        $("#bk-pct").textContent = `Uploading… ${pct}%`;
      });
      // If replacing, delete old file
      if (item.path && item.path !== uploaded.path) {
        try { await Store._fbSt.deleteObject(Store._fbSt.ref(Store._storage, item.path)); } catch (e) { }
      }
      item.url = uploaded.url;
      item.path = uploaded.path;
      item.mime = uploaded.mime;
      item.size = uploaded.size;
    } catch (e) {
      toast("Upload failed: " + (e.message || "error"), "err");
      btn.disabled = false; btn.innerHTML = "💾 Save material"; return;
    }
  } else if (!item.url) {
    toast("Please upload a file", "warn");
    btn.disabled = false; btn.innerHTML = "💾 Save material"; return;
  }

  try {
    await Store.saveBrand(item);
    await Store.logAction("Saved brand material", item.title);
    toast(existing ? "Material updated ✓" : "Material added ✓");
    closeModal();
    adminBrandKit();
  } catch (e) {
    toast("Save failed: " + e.message, "err");
    btn.disabled = false; btn.innerHTML = "💾 Save material";
  }
}

async function deleteBrandItem(id) {
  const item = (App.brand || []).find(x => x.id === id); if (!item) return;
  if (!confirm(`Delete "${item.title}"?\n\nThis will remove it from the public brand page. Cannot be undone.`)) return;
  try {
    await Store.deleteBrand(id, item.path);
    await Store.logAction("Deleted brand material", item.title);
    App.brand = (App.brand || []).filter(x => x.id !== id);
    toast("Deleted");
    adminBrandKit();
  } catch (e) { toast("Delete failed: " + e.message, "err"); }
}
function clubEditRow(c, i) {
  return `<div class="club-edit" data-ci="${i}">
        <label class="el"><span class="ck">Club name</span><input data-cf="name" value="${esc(c.name || "")}"></label>
        <label class="el"><span class="ck">Role on match day</span><input data-cf="role" value="${esc(c.role || "")}"></label>
        <button class="btn btn-sm btn-line" onclick="removeClub(${i})" title="Remove">✕</button>
        <input type="hidden" data-cf="key" value="${esc(c.key || "")}"></div>`;
}
function readClubs() {
  return [...document.querySelectorAll("#club-editor .club-edit")].map(row => {
    const get = f => { const el = row.querySelector(`[data-cf="${f}"]`); return el ? el.value.trim() : ""; };
    let key = get("key") || get("name").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || ("club" + Date.now().toString(36));
    return { key, name: get("name"), role: get("role") };
  }).filter(c => c.name);
}
function addClub() {
  const cur = readClubs(); cur.push({ key: "club" + Date.now().toString(36), name: "", role: "" });
  App.settings.clubs = cur; const box = $("#club-editor"); box.innerHTML = cur.map((c, i) => clubEditRow(c, i)).join("");
}
function removeClub(i) {
  const cur = readClubs(); cur.splice(i, 1); App.settings.clubs = cur;
  $("#club-editor").innerHTML = cur.map((c, i) => clubEditRow(c, i)).join("");
}
async function saveClubs() {
  const clubs = readClubs(); App.settings.clubs = clubs;
  try { await Store.saveSettings({ clubs }); await Store.logAction("Updated affiliated clubs"); toast("Clubs saved"); adminBranding(); }
  catch (e) { toast("Could not save clubs", "err"); }
}
/* resize + compress an image to a safe data URL */
function processImage(file, maxDim, cb) {
  if (!file) { cb(null, "No file"); return; }
  if (!/^image\//.test(file.type)) { cb(null, "Not an image file"); return; }
  const rd = new FileReader();
  rd.onerror = () => cb(null, "Could not read file");
  rd.onload = () => {
    const img = new Image();
    img.onerror = () => cb(null, "Could not decode image");
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) { cb(rd.result); return; }
        if (w > maxDim || h > maxDim) { const r = Math.min(maxDim / w, maxDim / h); w = Math.round(w * r); h = Math.round(h * r); }
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        let out = cv.toDataURL("image/png");
        // if too big, try jpeg at descending qualities
        if (out.length > 120 * 1024) out = cv.toDataURL("image/jpeg", 0.85);
        if (out.length > 120 * 1024) out = cv.toDataURL("image/jpeg", 0.7);
        cb(out);
      } catch (err) { cb(rd.result); }
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}

async function setLogoSlot(e, key) {
  const f = e.target.files[0]; if (!f) return;
  const slot = LOGO_SLOTS.find(s => s.key === key) || getClubs().find(c => c.key === key) || { name: key };
  const name = slot.name || key;
  toast("Processing " + name + "…");
  processImage(f, 240, async (dataURL, err) => {
    if (!dataURL) { toast(err || "Could not process image", "err"); return; }
    if (dataURL.length > 600 * 1024) { toast("Image too large after compression — try a simpler PNG", "err"); return; }
    try {
      await Store.setLogo(key, dataURL);
      App.logos[key] = dataURL;
      await Store.logAction("Updated logo", name);
      toast(name + " logo updated");
      adminBranding();
    } catch (ex) {
      const t = (ex && (ex.message || ex.code || "")).toString();
      const friendly = /exceeds the maximum|1048576|document too large|invalid-argument|too large/i.test(t)
        ? "Firestore's 1 MB per-document limit reached. Click 'Remove' on an old/unused logo tile, then re-upload."
        : (t || "Save failed");
      toast(friendly, "err");
      console.error("setLogo failed for key", key, ex);
    }
  });
  e.target.value = "";
}
async function removeLogoSlot(key) {
  const slot = LOGO_SLOTS.find(s => s.key === key) || getClubs().find(c => c.key === key) || { name: key };
  delete App.logos[key];
  await Store.removeLogo(key);
  await Store.logAction("Removed logo", slot.name || key);
  toast("Logo removed"); adminBranding();
}
async function saveColors() {
  const brand = { purple: $("#b-purple").value, magenta: $("#b-magenta").value };
  App.settings.brand = brand; applyBrand(brand); await Store.saveSettings({ brand }); await Store.logAction("Changed brand colours"); toast("Colours applied");
}

/* ---------- announcement ---------- */
function adminAnnouncement() {
  const a = App.settings.annc;
  $("#admin-body").innerHTML = `<div class="panel" style="max-width:620px"><h3>Top announcement bar</h3><p class="ph-help">The banner at the top of every public page.</p>
        ${field("a-text", "Text", { val: a.text, req: true })}
        <div class="grid2"><div>${field("a-label", "Link label", { val: a.linkLabel })}</div><div>${field("a-link", "Link (#route or URL)", { val: a.link, help: "e.g. #register-team" })}</div></div>
        <div class="grid2"><div>${field("a-active", "Show bar", { type: "select", options: ["Yes", "No"], val: a.active ? "Yes" : "No" })}</div><div>${field("a-urgent", "Urgent (red)", { type: "select", options: ["No", "Yes"], val: a.urgent ? "Yes" : "No" })}</div></div>
        <button class="btn btn-primary" style="margin-top:18px" onclick="saveAnnc()">Save announcement</button></div>`;
}
async function saveAnnc() {
  const annc = { text: val("a-text"), linkLabel: val("a-label"), link: val("a-link"), active: $("#a-active").value === "Yes", urgent: $("#a-urgent").value === "Yes" };
  App.settings.annc = annc; await Store.saveSettings({ annc }); await Store.logAction("Updated announcement"); toast("Announcement saved");
}

/* ---------- settings ---------- */
function adminSettings() {
  const s = App.settings;
  $("#admin-body").innerHTML = `<div class="panel" style="max-width:620px"><h3>Tournament settings</h3><p class="ph-help">Capacity, dates and fees drive the public counters and registration logic.</p>
        <div class="grid2"><div>${field("set-name", "Tournament name", { val: s.tournamentName })}</div><div>${field("set-venue", "Venue", { val: s.venue })}</div></div>
        ${field("set-emaillogo", "Email logo URL", { val: s.emailLogoUrl || "", ph: "https://sports.excapscpsc.com/assets/logo.png", help: "Public image URL shown in emails." })}
        <div class="grid2"><div>${field("set-open", "Registration opens", { type: "datetime-local", val: s.regOpen })}</div><div>${field("set-dead", "Registration closes", { type: "datetime-local", val: s.regDeadline })}</div></div>
        ${field("set-date", "Tournament date", { type: "datetime-local", val: s.tournamentDate })}
        <div class="grid2"><div>${field("set-max", "Max teams", { type: "number", val: s.maxTeams })}</div><div>${field("set-players", "Players per team", { type: "number", val: s.playersPerTeam })}</div></div>
        <div class="grid2"><div>${field("set-guests", "Guests per team", { type: "number", val: s.guestsPerTeam })}</div><div>${field("set-fee", "Team fee (৳)", { val: s.teamFee })}</div></div>
        <label class="fl">Payment numbers</label>
        ${s.paymentNumbers.map((n, i) => `<div class="grid2" style="margin-bottom:8px;grid-template-columns:1fr 1.4fr"><input id="pm-${i}-m" value="${esc(n.method)}" placeholder="Method"><input id="pm-${i}-n" value="${esc(n.number)}" placeholder="Number"></div>`).join("")}
        <button class="btn btn-primary" style="margin-top:18px" onclick="saveSet()">Save settings</button></div>
    
      <div class="panel" style="max-width:620px">
        <h3>Site status <span class="pill ${s.maintenance ? 'rev' : 'ok'}" style="margin-left:8px">${s.maintenance ? 'Under construction' : 'Live'}</span></h3>
        <p class="ph-help">When ON, the public sees a "coming soon" holding page. Admins and preview links always see the full site.</p>
        <label class="fl" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="set-maint" ${s.maintenance ? 'checked' : ''} style="width:auto"> Show "coming soon" page to the public</label>
        ${field("set-pvkey", "Preview key", { val: s.previewKey || "", help: "Share this so others can preview before launch." })}
        <div class="note-box" style="max-width:none;margin-top:10px"><span class="i">🔗</span><div>Preview link to share:<br><code style="word-break:break-all">${esc((typeof location !== "undefined" ? location.origin : "https://sports.excapscpsc.com"))}/?preview=${encodeURIComponent(s.previewKey || "excap-preview")}</code></div></div>
        <button class="btn btn-primary" style="margin-top:14px" onclick="saveMaint()">Save site status</button>
      </div>
  
      <div class="panel" style="max-width:620px">
        <h3>Emergency contact</h3>
        <p class="ph-help">Shown in the Help button on every page.</p>
        ${(() => {
      const e = (App.settings.emergency || cfg.emergency || {}); return `
        <div class="grid2"><div>${field("em-name", "Name", { val: e.name || "" })}</div><div>${field("em-role", "Role / title", { val: e.role || "" })}</div></div>
        <div class="grid2"><div>${field("em-phone", "Phone", { val: e.phone || "" })}</div><div>${field("em-email", "Email", { val: e.email || "" })}</div></div>`;
    })()}
        <button class="btn btn-primary" style="margin-top:14px" onclick="saveEmergency()">Save emergency contact</button>
      </div>
  
      <div class="panel" style="max-width:620px">
        <h3>Registration control</h3>
        <p class="ph-help">Open, pause or close each registration type. Paused/closed types show a notice instead of the form on the member site.</p>
        ${["team", "guest", "volunteer"].map(t => {
      const v = (App.settings.regStatus || cfg.settings.regStatus || {})[t] || "open";
      return `<div class="regctl"><span class="rc-name">${t}</span><div class="seg">${["open", "paused", "closed"].map(o => `<button data-v="${o}" class="${v === o ? 'on' : ''}" onclick="setRegStatus('${t}','${o}')">${o}</button>`).join("")}</div></div>`;
    }).join("")}
      </div>

      <div class="panel" style="margin-top:20px">
        <h3>Tournament data</h3>
        <p class="ph-help">One-time setup: seed the 25 match fixtures into the database. Team names are matched to registered teams at render time — no manual mapping needed.</p>
        <div id="seed-status" style="margin:12px 0">Loading…</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="seedFixtures()" id="seed-btn">🌱 Seed fixtures</button>
          <button class="btn btn-line" onclick="checkSeedStatus()">↻ Refresh status</button>
        </div>
      </div>
  
      <div class="panel" style="max-width:620px">
        <h3>Payment — bKash merchant QR</h3>
        <p class="ph-help">Team registration shows this QR for bKash payments. You can change it anytime.</p>
        <div class="bk-qr-row">
          <div class="bk-qr-box">${App.settings.bkashQR ? `<img src="${App.settings.bkashQR}">` : `<span class="ph2">No QR</span>`}</div>
          <div>
            ${field("set-bknum", "bKash number", { val: App.settings.bkashNumber || "", ph: "01XXXXXXXXX" })}
            <div class="row2" style="margin-top:8px"><button class="btn btn-sm btn-primary" onclick="$('#bkash-qr-file').click()">Upload QR</button>${App.settings.bkashQR ? `<button class="btn btn-sm btn-line" onclick="removeBkashQR()">Remove</button>` : ""}<button class="btn btn-sm btn-line" onclick="saveBkashNum()">Save number</button></div>
            <input id="bkash-qr-file" type="file" accept="image/*" class="hidden" onchange="setBkashQR(event)">
          </div>
        </div>
      </div>`;
  setTimeout(() => checkSeedStatus(), 100);
}
function setRegStatus(type, v) {
  App.settings.regStatus = App.settings.regStatus || { ...(cfg.settings.regStatus || {}) };
  App.settings.regStatus[type] = v;
  Store.saveSettings({ regStatus: App.settings.regStatus }).then(() => Store.logAction("Registration " + type + " → " + v));
  toast(type + " registration " + v); refreshCurrentTab();
}
function setBkashQR(e) {
  const f = e.target.files[0]; if (!f) return;
  processImage(f, 420, async (d, err) => {
    if (!d) { toast(err || "Could not process image", "err"); return; }
    App.settings.bkashQR = d; try { await Store.saveSettings({ bkashQR: d }); await Store.logAction("Updated bKash QR"); toast("Merchant QR saved"); adminSettings(); }
    catch (ex) { toast("Save failed: " + (ex.message || "error"), "err"); }
  });
  e.target.value = "";
}

async function checkSeedStatus() {
  const el = document.getElementById("seed-status");
  const btn = document.getElementById("seed-btn");
  if (!el) return;
  try {
    const count = await Store.countFixtures();
    if (count > 0) {
      el.innerHTML = `<span style="color:var(--pitch);font-weight:800">✓ Already seeded — ${count} fixture${count === 1 ? "" : "s"} exist</span>`;
      if (btn) btn.textContent = "🔄 Re-seed (advanced)";
      window._seedAlreadyDone = true;
    } else {
      el.innerHTML = `<span style="color:var(--muted-2)">No fixtures yet — click Seed to populate the 25 matches.</span>`;
      if (btn) btn.textContent = "🌱 Seed fixtures";
      window._seedAlreadyDone = false;
    }
  } catch (e) {
    el.innerHTML = `<span style="color:#dc2626">Error: ${esc(e.message || "unknown")}</span>`;
  }
}

async function seedFixtures() {
  if (window._seedAlreadyDone) {
    const confirm = prompt('Fixtures already exist. Type "SEED" to overwrite them with the default data (existing matches will be reset):');
    if (confirm !== "SEED") { toast("Cancelled", "warn"); return; }
  }
  const btn = document.getElementById("seed-btn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Seeding…"; }
  try {
    const res = await Store.seedFixtures(FIXTURES_SEED);
    await Store.logAction("Seeded fixtures", `${res.count} matches`);
    toast(`✓ Seeded ${res.count} fixtures`);
    checkSeedStatus();
  } catch (e) {
    toast("Seed failed: " + (e.message || "error"), "err");
    if (btn) { btn.disabled = false; btn.textContent = "🌱 Seed fixtures"; }
  }
}
async function removeBkashQR() { App.settings.bkashQR = ""; await Store.saveSettings({ bkashQR: "" }); toast("QR removed"); adminSettings(); }
async function saveBkashNum() { const n = val("set-bknum"); App.settings.bkashNumber = n; await Store.saveSettings({ bkashNumber: n }); toast("bKash number saved"); }
async function saveEmergency() {
  const emergency = { name: val("em-name"), role: val("em-role"), phone: val("em-phone"), email: val("em-email") };
  App.settings.emergency = emergency; try { cfg.emergency = emergency; } catch (_) { }
  await Store.saveSettings({ emergency }); await Store.logAction("Updated emergency contact");
  toast("Emergency contact saved"); refreshCurrentTab();
}
async function saveMaint() {
  const upd = { maintenance: $("#set-maint").checked, previewKey: val("set-pvkey") || "excap-preview" };
  Object.assign(App.settings, upd); await Store.saveSettings(upd);
  await Store.logAction(upd.maintenance ? "Enabled maintenance mode" : "Took site live");
  toast(upd.maintenance ? "Public now sees the coming-soon page" : "Site is now LIVE for everyone");
  refreshCurrentTab();
}
async function saveSet() {
  const s = App.settings;
  const upd = {
    tournamentName: val("set-name"), venue: val("set-venue"), emailLogoUrl: val("set-emaillogo"), regOpen: $("#set-open").value, regDeadline: $("#set-dead").value, tournamentDate: $("#set-date").value,
    maxTeams: +val("set-max") || 24, playersPerTeam: +val("set-players") || 7, guestsPerTeam: +val("set-guests") || 5, teamFee: val("set-fee"),
    paymentNumbers: s.paymentNumbers.map((n, i) => ({ method: val("pm-" + i + "-m") || n.method, number: val("pm-" + i + "-n") || n.number, type: n.type }))
  };
  Object.assign(App.settings, upd); await Store.saveSettings(upd); await Store.logAction("Updated tournament settings"); toast("Settings saved"); refreshCurrentTab();
}

/* ---------- my profile ---------- */
function adminProfile() {
  const p = Store._profile || {}; const local = Store.mode === "local";
  $("#admin-body").innerHTML = `
      <div class="panel" style="max-width:560px"><h3>Profile</h3><p class="ph-help">Your name and photo appear on the activity log and the sidebar.</p>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
          <div class="dev-ava" style="width:64px;height:64px;border-radius:16px;font-size:22px" id="pf-ava">${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">` : initials(Store.adminInfo().name)}</div>
          <div><button class="btn btn-sm btn-line" onclick="$('#pf-photo').click()">Change photo</button>
          <input id="pf-photo" type="file" accept="image/*" class="hidden" onchange="pfPhoto(event)"></div>
        </div>
        ${field("pf-name", "Full name", { req: true, val: p.name || Store.adminInfo().name })}
        <div class="grid2"><div>${field("pf-role", "Role", { val: p.role || "Organizer" })}</div><div>${field("pf-phone", "Phone", { type: "tel", val: p.phone || "" })}</div></div>
        ${field("pf-email", "Email", { type: "email", val: Store.adminInfo().email })}
        <div class="help" style="margin-top:6px">Email is your login and can't be changed here.</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="saveProfile()">Save profile</button>
      </div>
      <div class="panel" style="max-width:560px"><h3>Change password</h3>
        <p class="ph-help">${local ? 'Password change needs Firebase Auth — it activates once you connect Firebase (live mode).' : 'Enter your current password to confirm, then your new password.'}</p>
        ${field("pf-cur", "Current password", { type: "password" })}
        <div class="grid2"><div>${field("pf-new", "New password", { type: "password", help: "At least 6 characters" })}</div><div>${field("pf-new2", "Confirm new password", { type: "password" })}</div></div>
        <button class="btn btn-primary" style="margin-top:16px" id="pw-btn" onclick="changePass()" ${local ? 'disabled' : ''}>Update password</button>
      </div>`;
}
let _pfPhoto = null;
function pfPhoto(e) { const f = e.target.files[0]; if (!f) return; processImage(f, 256, (d, err) => { if (!d) { toast(err || "Could not process photo", "err"); return; } _pfPhoto = d; $("#pf-ava").innerHTML = `<img src="${d}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`; }); e.target.value = ""; }
async function saveProfile() {
  if (!val("pf-name")) { setErr("pf-name", "Name is required"); return; }
  const p = { name: val("pf-name"), role: val("pf-role"), phone: val("pf-phone"), photo: _pfPhoto || (Store._profile && Store._profile.photo) || null };
  try { await Store.saveProfile(p); await Store.logAction("Updated own profile"); _pfPhoto = null; toast("Profile saved"); refreshCurrentTab(); }
  catch (e) { toast(e.message || "Could not save", "err"); }
}
async function changePass() {
  const cur = val("pf-cur"), n1 = val("pf-new"), n2 = val("pf-new2");
  if (n1.length < 6) { setErr("pf-new", "Use at least 6 characters"); return; }
  if (n1 !== n2) { setErr("pf-new2", "Passwords don't match"); return; }
  const btn = $("#pw-btn"); btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  try { await Store.changePassword(cur, n1); await Store.logAction("Changed own password"); toast("Password updated"); adminProfile(); }
  catch (e) { btn.disabled = false; btn.textContent = "Update password"; setErr("pf-cur", e.code === "auth/wrong-password" || /wrong-password|invalid-credential/.test(e.message) ? "Current password is incorrect" : (e.message || "Failed")); }
}

/* ---------- volunteers ---------- */
let volFilter = "all";
function volunteers() { return App.regs.filter(r => r.type === "volunteer"); }
function adminVolunteers() {
  const vols = volunteers();
  const f = volFilter === "all" ? vols : vols.filter(v => v.status === volFilter);
  const byStatus = s => vols.filter(v => v.status === s).length;
  $("#admin-body").innerHTML = `
      <div class="kpis"><div class="kpi accent"><div class="v num">${vols.length}</div><div class="k">Total volunteers</div></div>
        <div class="kpi"><div class="v num">${byStatus("approved")}</div><div class="k">Confirmed</div></div>
        <div class="kpi"><div class="v num">${byStatus("review")}</div><div class="k">Pending</div></div>
        <div class="kpi"><div class="v num">${vols.filter(v => v.data && v.data.dutyStatus === "On duty").length}</div><div class="k">On duty</div></div></div>
      <div class="tabs">${["all", "review", "approved"].map(t => `<button class="tab ${volFilter === t ? 'active' : ''}" onclick="volFilter='${t}';adminVolunteers()">${t === 'all' ? 'All' : t === 'review' ? 'Pending' : 'Confirmed'}</button>`).join("")}</div>
      <div class="panel"><h3>Volunteer crew</h3><p class="ph-help">Approve volunteers, assign role + zone + shift, and monitor duty status. Approving notifies them by email + SMS.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Preferred</th><th>Assigned role / zone</th><th>Duty</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${f.map(v => {
    const d = v.data || {}; return `<tr>
          <td class="num">${v.id}</td>
          <td class="nm"><b>${esc(d.name)}</b><span>${esc(v.contact || "")}</span></td>
          <td>${esc(d.preferredRole || "—")}<br><span style="color:var(--muted-2);font-size:12px">${esc(d.availability || "")}</span></td>
          <td>${d.assignedRole ? `<b>${esc(d.assignedRole)}</b><br><span style="color:var(--muted-2);font-size:12px">${esc(d.assignedZone || "")} ${d.shift ? "· " + esc(d.shift) : ""}</span>` : '<span style="color:var(--amber)">unassigned</span>'}</td>
          <td><span class="pill ${d.dutyStatus === 'On duty' ? 'ok' : d.dutyStatus === 'Off duty' ? 'red' : 'wait'}">${esc(d.dutyStatus || 'Pending')}</span></td>
          <td>${statusPill(v.status)}</td>
          <td><div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-line" onclick="assignVol('${v.id}')">Assign</button>
            ${v.status !== "approved" ? `<button class="btn btn-sm btn-pitch" onclick="approveReg('${v.id}')">Approve</button>` : `<button class="btn btn-sm btn-line" onclick="toggleDuty('${v.id}')">${d.dutyStatus === 'On duty' ? 'End duty' : 'Start duty'}</button>`}
          </div></td></tr>`;
  }).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No volunteers yet.</td></tr>`}
        </tbody></table></div></div>`;
}
function assignVol(id) {
  const v = App.regs.find(x => x.id === id); if (!v) return; const d = v.data || {};
  const roles = App.settings.volunteerRoles || [], zones = App.settings.volunteerZones || [];
  showModal(`<h3>Assign volunteer</h3><p>${esc(d.name)} · ${v.id}</p>
        <label class="fl">Role</label><select id="av-role">${roles.map(r => `<option ${r === d.assignedRole ? 'selected' : ''}>${esc(r)}</option>`).join("")}</select>
        <label class="fl">Zone</label><select id="av-zone">${zones.map(z => `<option ${z === d.assignedZone ? 'selected' : ''}>${esc(z)}</option>`).join("")}</select>
        <label class="fl">Shift</label><input id="av-shift" value="${esc(d.shift || "")}" placeholder="e.g. 8:00–13:00">
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAssign('${id}')">Save assignment</button></div>`);
}
async function saveAssign(id) {
  const v = App.regs.find(x => x.id === id); if (!v) return;
  v.data.assignedRole = $("#av-role").value; v.data.assignedZone = $("#av-zone").value; v.data.shift = $("#av-shift").value.trim();
  await Store.saveReg(v); await Store.logAction("Assigned volunteer", v.id + " → " + v.data.assignedRole + " @ " + v.data.assignedZone);
  closeModal(); toast("Assignment saved"); adminVolunteers();
}
async function toggleDuty(id) {
  const v = App.regs.find(x => x.id === id); if (!v) return;
  v.data.dutyStatus = v.data.dutyStatus === "On duty" ? "Off duty" : "On duty";
  await Store.saveReg(v); await Store.logAction("Volunteer " + v.data.dutyStatus, v.id + " — " + v.data.name); adminVolunteers();
}

/* ---------- broadcast center ---------- */
const AUDIENCES = [
  ["all", "Everyone with contact"], ["team", "Team captains"], ["guest", "Guests"],
  ["visitor", "Visitors"], ["student", "Students"], ["volunteer", "Volunteers"], ["approved", "Approved only (all types)"]
];
function broadcastRecipients(aud) {
  let list = App.regs.slice();
  if (aud === "approved") list = list.filter(r => r.status === "approved");
  else if (aud !== "all") list = list.filter(r => r.type === aud);
  return list.map(r => ({ name: r.data.teamName || r.data.name || "Participant", email: r.data.email || r.captainEmail || "", phone: r.contact || "" }));
}
function adminBroadcast() {
  const rec = broadcastRecipients("all");
  $("#admin-body").innerHTML = `<div class="panel" style="max-width:820px"><h3>Broadcast center</h3>
      <p class="ph-help">Send email + SMS to individuals or entire audiences. Every send is logged.</p>
  
      <div class="tabs">
        <button class="tab active" onclick="bcMode('bulk')">📡 Bulk broadcast</button>
        <button class="tab" onclick="bcMode('single')">👤 Single recipient</button>
        <button class="tab" onclick="bcMode('template')">📄 Templates</button>
      </div>
  
      <div id="bc-panel"></div>
    </div>`;
  bcMode("bulk");
}
let _bcChan = "email", _bcMode = "bulk";
function bcMode(m) {
  _bcMode = m;
  document.querySelectorAll(".tabs .tab").forEach((t, i) => t.classList.toggle("active", ["bulk", "single", "template"][i] === m));
  const p = $("#bc-panel");
  if (m === "bulk") p.innerHTML = bcBulkUI();
  else if (m === "single") p.innerHTML = bcSingleUI();
  else p.innerHTML = bcTemplateUI();
  if (m === "bulk") bcCount();
}
function bcBulkUI() {
  return `
      <label class="fl">Audience</label>
      <select id="bc-aud" onchange="bcCount()">${AUDIENCES.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
      <div class="help" id="bc-count" style="margin-top:8px"></div>
  
      <label class="fl">Channel</label>
      <div class="pay-methods" style="grid-template-columns:1fr 1fr 1fr">
        <div class="pay-opt ${_bcChan === 'email' ? 'sel' : ''}" id="ch-email" onclick="bcChan('email')"><div class="ic">✉️</div><b>Email</b><span>via EmailJS</span></div>
        <div class="pay-opt ${_bcChan === 'sms' ? 'sel' : ''}" id="ch-sms" onclick="bcChan('sms')"><div class="ic">💬</div><b>SMS</b><span>via SMSQ</span></div>
        <div class="pay-opt ${_bcChan === 'both' ? 'sel' : ''}" id="ch-both" onclick="bcChan('both')"><div class="ic">📡</div><b>Both</b><span>Email + SMS</span></div>
      </div>
  
      ${field("bc-subject", "Email subject", { val: "EX-CAP Football Tournament" })}
      ${field("bc-msg", "Message", { type: "textarea", req: true, ph: "Type your announcement…", help: "SMS is limited to 160 chars per credit. Email supports full text." })}
  
      <div class="form-actions">
        <button class="btn btn-line" onclick="bcTest()">📨 Send test to me</button>
        <button class="btn btn-pitch" id="bc-send" onclick="bcSend()">Send broadcast →</button>
      </div>
      <div id="bc-result" style="margin-top:14px"></div>`;
}
function bcSingleUI() {
  return `
      <label class="fl">Recipient</label>
      <select id="bc-single-to">
        <option value="">— select a registrant —</option>
        ${App.regs.map(r => `<option value="${r.id}">${esc(r.data.teamName || r.data.name || r.id)} · ${r.type} · ${esc(r.contact || "")}</option>`).join("")}
      </select>
      <div class="grid2"><div>${field("bc-single-subject", "Subject", { val: "A message from EX-CAP" })}</div>
      <div>${field("bc-single-chan", "Channel", { type: "select", options: ["Email + SMS", "Email only", "SMS only"] })}</div></div>
      ${field("bc-single-msg", "Message", { type: "textarea", req: true, ph: "Personal note…" })}
      <div class="form-actions"><button class="btn btn-pitch" onclick="bcSendSingle()">Send →</button></div>`;
}
function bcTemplateUI() {
  return `<p class="ph-help">Pick a common template to prefill the broadcast form.</p>
      <div class="tmpl-grid">
        <button class="tmpl" onclick="bcUseTemplate('reminder')"><b>📅 Match-day reminder</b><span>Confirm tomorrow's schedule</span></button>
        <button class="tmpl" onclick="bcUseTemplate('weather')"><b>🌦 Weather update</b><span>Delay / re-schedule notice</span></button>
        <button class="tmpl" onclick="bcUseTemplate('thanks')"><b>🙏 Thank-you</b><span>Post-tournament wrap-up</span></button>
        <button class="tmpl" onclick="bcUseTemplate('payment')"><b>💳 Payment pending</b><span>Nudge to complete payment</span></button>
      </div>`;
}
const BC_TEMPLATES = {
  reminder: { subject: "EX-CAP: Match day tomorrow", msg: "Reminder: your match is tomorrow at the SCPSC field. Please arrive 30 minutes before kick-off with your QR pass. See you there!" },
  weather: { subject: "EX-CAP: Weather update", msg: "Due to weather, today's schedule has been adjusted. Please check the fixtures page for the latest kick-off times." },
  thanks: { subject: "EX-CAP: Thank you!", msg: "Thanks for making the EX-CAP Football Tournament a success. See you next year!" },
  payment: { subject: "EX-CAP: Payment reminder", msg: "Your team registration is submitted but payment is still pending. Please complete the bKash payment to confirm your slot." }
};
function bcUseTemplate(k) {
  const t = BC_TEMPLATES[k]; if (!t) return;
  bcMode("bulk");
  setTimeout(() => { $("#bc-subject").value = t.subject; $("#bc-msg").value = t.msg; toast("Template loaded — pick audience and send"); }, 50);
}
async function bcSendSingle() {
  const id = $("#bc-single-to").value; if (!id) { toast("Pick a recipient", "warn"); return; }
  const r = App.regs.find(x => x.id === id); if (!r) return;
  const chan = $("#bc-single-chan").value, subject = val("bc-single-subject"), message = val("bc-single-msg");
  if (!message) { setErr("bc-single-msg", "Write a message first"); return; }
  const email = r.data.email || r.captainEmail || "", phone = r.contact || "";
  let sent = [];
  if (chan !== "SMS only" && email) { const o = await Notify.sendBroadcastEmail({ toEmail: email, toName: r.data.teamName || r.data.name, subject, message }); if (o.ok) sent.push("email"); }
  if (chan !== "Email only" && phone) { const o = await Notify.sendSMS({ to: phone, message }); if (o.ok) sent.push("SMS"); }
  await Store.logAction("Single message (" + chan + ")", r.id + " — " + sent.join(", "));
  toast(sent.length ? "Sent via " + sent.join(" + ") : "Nothing sent (no email/phone)", sent.length ? "" : "warn");
}
function bcChan(c) { _bcChan = c;["email", "sms", "both"].forEach(k => $("#ch-" + k) && $("#ch-" + k).classList.toggle("sel", k === c)); }
function bcCount() {
  const rec = broadcastRecipients($("#bc-aud").value);
  const em = rec.filter(r => r.email).length, sm = rec.filter(r => r.phone).length;
  $("#bc-count").innerHTML = `<b>${rec.length}</b> recipients · ${em} with email · ${sm} with mobile`;
}
async function bcTest() {
  const me = Store.adminInfo();
  const subject = val("bc-subject"), message = val("bc-msg");
  if (!message) { setErr("bc-msg", "Write a message first"); return; }
  toast("Sending test…");
  if (_bcChan !== "sms" && me.email && me.email.includes("@")) await Notify.sendBroadcastEmail({ toEmail: me.email, toName: me.name, subject, message });
  const myPhone = (Store._profile && Store._profile.phone) || "";
  if (_bcChan !== "email" && myPhone) await Notify.sendSMS({ to: myPhone, message });
  toast("Test sent (check your email" + (myPhone ? " / phone" : "") + ")");
}
async function bcSend() {
  const subject = val("bc-subject"), message = val("bc-msg"), aud = $("#bc-aud").value;
  if (!message) { setErr("bc-msg", "Write a message first"); return; }
  const rec = broadcastRecipients(aud);
  if (!rec.length) { toast("No recipients in that audience", "warn"); return; }
  if (!confirm(`Send this ${_bcChan === "both" ? "email + SMS" : _bcChan} to ${rec.length} recipients?`)) return;
  const btn = $("#bc-send"); btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  let emailOk = 0, emailFail = 0, smsOk = 0, smsFail = 0;

  if (_bcChan !== "email") {
    const phones = rec.map(r => r.phone).filter(Boolean);
    if (phones.length) { const r = await Notify.sendSMS({ to: phones, message }); if (r.ok) smsOk = phones.length; else smsFail = phones.length; }
  }
  if (_bcChan !== "sms") {
    const emails = rec.filter(r => r.email);
    for (const r of emails) {
      const out = await Notify.sendBroadcastEmail({ toEmail: r.email, toName: r.name, subject, message });
      out.ok ? emailOk++ : emailFail++;
      $("#bc-result").innerHTML = `<div class="note-box"><span class="i">📨</span><div>Sending… ${emailOk + emailFail}/${emails.length} emails</div></div>`;
      await new Promise(z => setTimeout(z, 350));
    }
  }
  await Store.logAction("Sent broadcast (" + _bcChan + ")", `${aud} · ${rec.length} recipients · email ${emailOk}/${emailOk + emailFail} · sms ${smsOk}/${smsOk + smsFail}`);
  btn.disabled = false; btn.textContent = "Send broadcast →";
  $("#bc-result").innerHTML = `<div class="note-box"><span class="i">✅</span><div>Done. Email sent: <b>${emailOk}</b>${emailFail ? ` (failed ${emailFail})` : ""}. SMS sent: <b>${smsOk}</b>${smsFail ? ` (failed ${smsFail})` : ""}.</div></div>`;
  toast("Broadcast complete");
}

/* ============================================================
   SCOREBOARD CONTROL
   ============================================================ */
function adminScoreboard() {
  $("#admin-body").innerHTML = `
        <div class="admin-top" style="margin-bottom:14px"><div></div>
          <button class="btn btn-primary btn-sm" onclick="matchModal()">+ New match</button></div>
        <div id="sb-body"><div class="panel"><p class="ph-help">Loading matches…</p></div></div>`;
  if (window._admMatchUnsub) { _admMatchUnsub(); }
  window._admMatchUnsub = Store.subscribeMatches(matches => {
    App._matches = matches; const body = $("#sb-body"); if (!body) return;
    if (!matches.length) { body.innerHTML = `<div class="panel"><div class="empty-wall">No matches yet. Create the first fixture to build the schedule.</div></div>`; return; }
    body.innerHTML = matches.map(m => {
      const live = m.status === "live" || m.status === "halftime";
      return `<div class="panel" style="padding:18px">
            <div class="mc-top" style="margin-bottom:12px"><span class="mc-round">#${m.no} · ${esc(m.round)}${m.group ? " · " + esc(m.group) : ""}</span>
              <span class="mc-status ${m.status}">${STATUS_LABEL[m.status] || m.status}</span></div>
            <div class="score-ctrl">
              <div><div class="tname">${esc(m.teamA || "TBD")}</div>
                <div class="stepper"><button onclick="bumpScore('${m.id}','A',-1)">−</button><span class="sv">${m.scoreA || 0}</span><button onclick="bumpScore('${m.id}','A',1)">+</button></div></div>
              <div style="font-family:var(--font-display);font-weight:900;color:var(--muted-2)">VS</div>
              <div><div class="tname">${esc(m.teamB || "TBD")}</div>
                <div class="stepper"><button onclick="bumpScore('${m.id}','B',-1)">−</button><span class="sv">${m.scoreB || 0}</span><button onclick="bumpScore('${m.id}','B',1)">+</button></div></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
              ${m.status === "scheduled" ? `<button class="btn btn-sm btn-pitch" onclick="setMatch('${m.id}','live')">▶ Start (live)</button>` : ""}
              ${m.status === "live" ? `<button class="btn btn-sm btn-line" onclick="setMatch('${m.id}','halftime')">⏸ Half-time</button>` : ""}
              ${m.status === "halftime" ? `<button class="btn btn-sm btn-pitch" onclick="setMatch('${m.id}','live')">▶ Resume</button>` : ""}
              ${live ? `<button class="btn btn-sm btn-primary" onclick="setMatch('${m.id}','finished')">⏹ Full-time</button>` : ""}
              ${m.status === "finished" ? `<button class="btn btn-sm btn-line" onclick="setMatch('${m.id}','live')">Reopen</button>` : ""}
              <button class="btn btn-sm btn-line" onclick="addScorer('${m.id}')">+ Scorer</button>
              <button class="btn btn-sm btn-line" onclick="matchModal('${m.id}')">Edit</button>
              <button class="btn btn-sm btn-line" onclick="delMatch('${m.id}')">Delete</button>
            </div>
            ${(m.scorersA && m.scorersA.length) || (m.scorersB && m.scorersB.length) ? `<div class="mc-scorers" style="margin-top:12px"><div>${(m.scorersA || []).map(s => "⚽ " + esc(s)).join("<br>")}</div><div style="text-align:right">${(m.scorersB || []).map(s => esc(s) + " ⚽").join("<br>")}</div></div>` : ""}
          </div>`;
    }).join("");
  });
}
function teamOptions(sel) { return `<option value="">— select team —</option>` + confirmedTeams().map(t => `<option value="${t.id}" ${sel === t.id ? 'selected' : ''}>${esc(t.data.teamName)}</option>`).join(""); }
function matchModal(id) {
  const m = id ? App._matches.find(x => x.id === id) : null;
  showModal(`<h3>${m ? 'Edit match' : 'New match'}</h3>
        <label class="fl">Round</label><select id="mm-round">${ROUNDS.map(r => `<option ${m && m.round === r ? 'selected' : ''}>${r}</option>`).join("")}</select>
        <div class="grid2"><div><label class="fl">Group / note</label><input id="mm-group" value="${m ? esc(m.group || "") : ""}" placeholder="e.g. Group A"></div>
          <div><label class="fl">Field</label><input id="mm-field" value="${m ? esc(m.field || "") : ""}" placeholder="Field A"></div></div>
        <label class="fl">Team A</label><select id="mm-a">${teamOptions(m && m.teamAId)}</select>
        <label class="fl">Team B</label><select id="mm-b">${teamOptions(m && m.teamBId)}</select>
        <label class="fl">Kick-off</label><input id="mm-time" type="datetime-local" value="${m ? esc(m.kickoff || "") : ""}">
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveMatchModal('${id || ''}')">${m ? 'Save' : 'Create match'}</button></div>`);
}
async function saveMatchModal(id) {
  const aSel = $("#mm-a"), bSel = $("#mm-b");
  const teamA = aSel.options[aSel.selectedIndex].text.replace("— select team —", "").trim();
  const teamB = bSel.options[bSel.selectedIndex].text.replace("— select team —", "").trim();
  let m;
  if (id) { m = App._matches.find(x => x.id === id); }
  else { const no = (App._matches.reduce((a, x) => Math.max(a, x.no || 0), 0)) + 1; m = { id: "M" + String(no).padStart(2, "0"), no, scoreA: 0, scoreB: 0, status: "scheduled", scorersA: [], scorersB: [] }; }
  m.round = $("#mm-round").value; m.group = $("#mm-group").value.trim(); m.field = $("#mm-field").value.trim();
  m.teamAId = aSel.value; m.teamA = teamA || "TBD"; m.teamBId = bSel.value; m.teamB = teamB || "TBD"; m.kickoff = $("#mm-time").value; m.updated = Date.now();
  await Store.saveMatch(m); await Store.logAction(id ? "Edited match" : "Created match", m.id + " " + m.teamA + " vs " + m.teamB);
  closeModal(); toast(id ? "Match updated" : "Match created");
}
async function bumpScore(id, side, d) {
  const m = App._matches.find(x => x.id === id); if (!m) return;
  const k = side === "A" ? "scoreA" : "scoreB"; m[k] = Math.max(0, (m[k] || 0) + d); m.updated = Date.now();
  await Store.saveMatch(m);
}
async function setMatch(id, status) {
  const m = App._matches.find(x => x.id === id); if (!m) return; m.status = status; m.updated = Date.now();
  await Store.saveMatch(m); await Store.logAction("Match " + status, m.id + " " + m.teamA + " " + (m.scoreA || 0) + "-" + (m.scoreB || 0) + " " + m.teamB);
}
function addScorer(id) {
  const m = App._matches.find(x => x.id === id); if (!m) return;
  showModal(`<h3>Add goal</h3><p>${esc(m.teamA)} ${m.scoreA || 0} - ${m.scoreB || 0} ${esc(m.teamB)}</p>
        <label class="fl">Team</label><select id="sc-team"><option value="A">${esc(m.teamA)}</option><option value="B">${esc(m.teamB)}</option></select>
        <label class="fl">Scorer name (+ minute)</label><input id="sc-name" placeholder="e.g. Rahim 23'">
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-pitch" onclick="saveScorer('${id}')">Add goal ⚽</button></div>`);
}
async function saveScorer(id) {
  const m = App._matches.find(x => x.id === id); if (!m) return;
  const side = $("#sc-team").value, name = $("#sc-name").value.trim(); if (!name) { toast("Enter a name", "warn"); return; }
  if (side === "A") { m.scorersA = m.scorersA || []; m.scorersA.push(name); m.scoreA = (m.scoreA || 0) + 1; }
  else { m.scorersB = m.scorersB || []; m.scorersB.push(name); m.scoreB = (m.scoreB || 0) + 1; }
  m.updated = Date.now(); await Store.saveMatch(m); await Store.logAction("Recorded goal", m.id + " — " + name); closeModal(); toast("Goal recorded ⚽");
}
async function delMatch(id) { if (!confirm("Delete this match?")) return; await Store.deleteMatch(id); await Store.logAction("Deleted match", id); toast("Match deleted"); }

/* ============================================================
   RESULTS & AWARDS
   ============================================================ */
async function adminResults() {
  const res = await Store.getResults();
  const teamSel = (id) => `<option value="">—</option>` + confirmedTeams().map(t => `<option ${res[id] === t.data.teamName ? 'selected' : ''}>${esc(t.data.teamName)}</option>`).join("");
  $("#admin-body").innerHTML = `<div class="panel" style="max-width:620px"><h3>Champions & awards</h3>
        <p class="ph-help">Set the honours, then publish. Published results appear on the public Champions page and home banner.</p>
        <label class="fl">Champion</label><select id="rs-champ">${teamSel("champion")}</select>
        <label class="fl">Runner-up</label><select id="rs-run">${teamSel("runnerUp")}</select>
        <label class="fl">Third place</label><select id="rs-third">${teamSel("thirdPlace")}</select>
        <div class="grid2"><div>${field("rs-scorer", "Top scorer", { val: res.topScorer || "" })}</div><div>${field("rs-player", "Best player", { val: res.bestPlayer || "" })}</div></div>
        <div class="grid2"><div>${field("rs-keeper", "Best goalkeeper", { val: res.bestGoalkeeper || "" })}</div><div>${field("rs-fair", "Fair play award", { val: res.fairPlay || "" })}</div></div>
        <label class="fl" style="display:flex;align-items:center;gap:10px;margin-top:16px"><input type="checkbox" id="rs-pub" ${res.published ? 'checked' : ''} style="width:auto"> Publish results publicly</label>
        <button class="btn btn-primary" style="margin-top:16px" onclick="saveResults()">Save results</button></div>`;
}
async function saveResults() {
  const g = id => $("#" + id).value;
  const res = { champion: g("rs-champ"), runnerUp: g("rs-run"), thirdPlace: g("rs-third"), topScorer: val("rs-scorer"), bestPlayer: val("rs-player"), bestGoalkeeper: val("rs-keeper"), fairPlay: val("rs-fair"), published: $("#rs-pub").checked };
  await Store.saveResults(res); await Store.logAction(res.published ? "Published results" : "Saved results", res.champion ? ("Champion: " + res.champion) : "");
  toast(res.published ? "Results published 🏆" : "Results saved");
}

/* ============================================================
   QR CHECK-IN — with loud audio feedback + undo action
   ============================================================ */
function beepOK() {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    // Bright ascending "ding" — 880Hz -> 1760Hz
    const o = A.createOscillator(), g = A.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(880, A.currentTime);
    o.frequency.exponentialRampToValueAtTime(1760, A.currentTime + 0.12);
    g.gain.setValueAtTime(0.4, A.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, A.currentTime + 0.4);
    o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + 0.42);
  } catch (e) { }
  if (navigator.vibrate) navigator.vibrate(120);
}

/* ============================================================
   Check-in sound + haptic engine
   ============================================================ */
   let _ciVolume = 0.7;
   let _ciCtx = null;
   function _ciAudio() {
     if (!_ciCtx) try { _ciCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
     return _ciCtx;
   }
   function _ciTone(freqs, durations, type = "sine") {
     const ctx = _ciAudio(); if (!ctx) return;
     if (ctx.state === "suspended") ctx.resume().catch(() => {});
     let t = ctx.currentTime;
     freqs.forEach((f, i) => {
       const dur = durations[i] || 0.12;
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.type = type;
       osc.frequency.setValueAtTime(f, t);
       gain.gain.setValueAtTime(0.0001, t);
       gain.gain.exponentialRampToValueAtTime(_ciVolume * 0.4, t + 0.02);
       gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
       osc.connect(gain); gain.connect(ctx.destination);
       osc.start(t); osc.stop(t + dur + 0.02);
       t += dur;
     });
   }
   function _ciVibrate(pattern) { if (navigator.vibrate) try { navigator.vibrate(pattern); } catch (e) {} }
   function ciSoundValid()     { _ciTone([523, 784], [0.10, 0.16], "sine");     _ciVibrate([80]); }
   function ciSoundDuplicate() { _ciTone([440, 440], [0.09, 0.09], "square");   _ciVibrate([60, 40, 60]); }
   function ciSoundReject()    { _ciTone([330, 220], [0.14, 0.22], "sawtooth"); _ciVibrate([260]); }
   function ciSoundUnknown()   { _ciTone([220], [0.18], "triangle");            _ciVibrate(0); }
   function ciSoundUndo()      { _ciTone([784, 523], [0.08, 0.12], "sine");     _ciVibrate([40]); }
function beepFail() {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    // Two low harsh buzzes — classic reject sound
    const now = A.currentTime;
    [0, 0.18].forEach(offset => {
      const o = A.createOscillator(), g = A.createGain();
      o.type = "square"; o.frequency.setValueAtTime(200, now + offset);
      g.gain.setValueAtTime(0.35, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      o.connect(g); g.connect(A.destination); o.start(now + offset); o.stop(now + offset + 0.17);
    });
  } catch (e) { }
  if (navigator.vibrate) navigator.vibrate([140, 90, 140]);
}
function beepDup() {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    const o = A.createOscillator(), g = A.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(500, A.currentTime);
    g.gain.setValueAtTime(0.3, A.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, A.currentTime + 0.3);
    o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + 0.32);
  } catch (e) { }
  if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
}

function parseCode(code) {
  const [base, suffix] = String(code).trim().split("#");
  const rec = App.regs.find(r => r.id === base); if (!rec) return { status: "bad", msg: "Unknown code" };
  if (suffix && /^P\d+$/.test(suffix)) { const i = +suffix.slice(1) - 1; const p = (rec.players || [])[i]; if (!p) return { status: "bad", msg: "Player not found" }; return { status: "ok", kind: "P", idx: i, rec, target: p, name: p.name, sub: rec.data.teamName + " · Player " + (i + 1) }; }
  if (suffix && /^G\d+$/.test(suffix)) { const i = +suffix.slice(1) - 1; const g = (rec.guests || [])[i]; if (!g) return { status: "bad", msg: "Guest not found" }; return { status: "ok", kind: "G", idx: i, rec, target: g, name: g.name, sub: rec.data.teamName + " · Guest" }; }
  return { status: "ok", kind: "reg", rec, target: rec, name: rec.data.teamName || rec.data.name, sub: rec.type + " · " + rec.id, photo: rec.data.photo };
}
async function ciManual() {
  const c = $("#ci-manual").value.trim();
  if (!c) { toast("Enter a code", "warn"); return; }
  await doCheckin(c);
  $("#ci-manual").value = "";
  $("#ci-manual").focus();
}

async function doCheckin(code) {
  const res = _ciResolveCode(code);

  if (res.outcome === "malformed") {
    ciSoundUnknown();
    _ciShowProfile({ kind: "malformed", code: res.code });
    return;
  }
  if (res.outcome === "unknown") {
    ciSoundUnknown();
    _ciShowProfile({ kind: "unknown", code: res.code });
    return;
  }

  // Security checks
  const reg = res.reg;
  if (reg.status === "rejected") {
    ciSoundReject();
    _ciShowProfile({ kind: "rejected", res });
    return;
  }
  if (reg.status !== "approved" && reg.status !== "waitlist") {
    ciSoundReject();
    _ciShowProfile({ kind: "not-approved", res });
    return;
  }

  // Duplicate check
  const alreadyIn = res.entity && res.entity.checkedIn;
  if (alreadyIn) {
    ciSoundDuplicate();
    _ciShowProfile({ kind: "duplicate", res });
    return;
  }

  // Valid — show profile card, then confirm
  ciSoundValid();
  _ciShowProfile({ kind: "valid", res });

  if (window._ciRush) {
    // Auto-confirm after 1.5s in rush mode
    if (window._ciAutoTimer) clearTimeout(window._ciAutoTimer);
    window._ciAutoTimer = setTimeout(() => _ciConfirmCheckin(res), 1500);
  }
}

async function _ciConfirmCheckin(res) {
  const reg = res.reg;
  const now = Date.now();
  const adminId = (Store.user && Store.user.uid) || "admin";
  try {
    if (res.kind === "reg") {
      reg.checkedIn = now;
      reg.checkedBy = adminId;
    } else if (res.kind === "P" && reg.players && reg.players[res.idx]) {
      reg.players[res.idx].checkedIn = now;
      reg.players[res.idx].checkedBy = adminId;
    } else if (res.kind === "G" && reg.guests && reg.guests[res.idx]) {
      reg.guests[res.idx].checkedIn = now;
      reg.guests[res.idx].checkedBy = adminId;
    }
    // Optimistic: update UI immediately; sync in background
    _ciAppendRecent(res);
    _ciShowProfile({ kind: "confirmed", res });
    await Store.saveReg(reg);
    await Store.logAction("Checked in", `${res.code} — ${res.displayName}`);
    _ciBuildMap();
    _ciUpdateKPIs();
    renderCiList();
    if (window._ciRush) {
      setTimeout(() => {
        const slot = $("#ci-profile-slot");
        if (slot) slot.innerHTML = _ciIdleHtml();
      }, 3000);
    }
  } catch (e) {
    toast("Sync failed — will retry: " + (e.message || "error"), "err");
  }
}

function _ciDeny(code, reason) {
  Store.logAction("Denied check-in", code + " — " + reason);
  const slot = $("#ci-profile-slot");
  if (slot) slot.innerHTML = _ciIdleHtml();
  toast("Denied: " + reason, "warn");
}

function _ciShowProfile(opts) {
  const slot = $("#ci-profile-slot"); if (!slot) return;
  const kind = opts.kind;

  if (kind === "malformed") {
    slot.innerHTML = `<div class="ci-card ci-card-err">
      <div class="cc-stripe">INVALID CODE FORMAT</div>
      <div class="cc-body-err">
        <div class="cce-ic">⚠️</div>
        <b>Not a valid EX-CAP pass</b>
        <span>Code: <code>${esc(opts.code)}</code></span>
        <p>Codes look like <code>EXCAP-FT26-T001</code>. Try again.</p>
        <button class="btn btn-line" onclick="_ciClear()">Clear</button>
      </div>
    </div>`;
    return;
  }
  if (kind === "unknown") {
    slot.innerHTML = `<div class="ci-card ci-card-err">
      <div class="cc-stripe">CODE NOT FOUND</div>
      <div class="cc-body-err">
        <div class="cce-ic">🔍</div>
        <b>No registration matches this code</b>
        <span>Code: <code>${esc(opts.code)}</code></span>
        <p>Verify the code was scanned correctly, or ask organizer.</p>
        <button class="btn btn-line" onclick="_ciClear()">Clear</button>
      </div>
    </div>`;
    return;
  }

  const res = opts.res;
  const reg = res.reg;
  const d = reg.data || {};
  const isSub = res.isSub;
  const entityPhoto = (res.entity && res.entity.photo) || d.photo || "";
  const displayName = res.displayName;
  const initials = (displayName || "?").split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();
  const batch = [d.sscBatch && "SSC " + d.sscBatch, d.hscBatch && "HSC " + d.hscBatch].filter(Boolean).join(" · ") || "—";
  const phone = reg.contact || d.phone || d.captainPhone || "—";

  let stripe = "", stripeClass = "", statusLine = "", buttons = "";
  if (kind === "valid") {
    stripe = "✓ VALID PASS — CONFIRM ENTRY"; stripeClass = "ok";
    statusLine = "Ready to admit. Verify photo matches person.";
    buttons = `
      <button class="btn ci-btn-big ci-btn-ok" onclick='_ciConfirmCheckin(${JSON.stringify({ reg: { id: reg.id }, kind: res.kind, idx: res.idx, code: res.code, displayName })}, true)'>✓ Confirm entry</button>
      <button class="btn ci-btn-big ci-btn-deny" onclick="_ciShowDenyOptions('${esc(res.code)}')">✕ Deny</button>`;
  } else if (kind === "duplicate") {
    const when = fmtDateTime(res.entity.checkedIn || (isSub ? 0 : reg.checkedIn));
    stripe = "⚠ ALREADY CHECKED IN"; stripeClass = "warn";
    statusLine = `Previously admitted at ${when}. Do not re-admit.`;
    buttons = `<button class="btn ci-btn-big btn-line" onclick="_ciClear()">Continue scanning</button>`;
  } else if (kind === "rejected") {
    stripe = "✕ REGISTRATION REJECTED"; stripeClass = "err";
    statusLine = "This registration was rejected. Do not admit.";
    buttons = `<button class="btn ci-btn-big btn-line" onclick="_ciClear()">Continue</button>`;
  } else if (kind === "not-approved") {
    stripe = "⏳ NOT YET APPROVED"; stripeClass = "warn";
    statusLine = `Status: ${reg.status.toUpperCase()}. Approve in Registrations first.`;
    buttons = `<button class="btn ci-btn-big btn-line" onclick="_ciClear()">Continue</button>`;
  } else if (kind === "confirmed") {
    stripe = "✓ ADMITTED"; stripeClass = "ok solid";
    statusLine = "Check-in recorded.";
    buttons = `<button class="btn ci-btn-big btn-line" onclick="_ciClear()">Next scan</button>`;
  }

  slot.innerHTML = `<div class="ci-card ci-card-${stripeClass}">
    <div class="cc-stripe">${stripe}</div>
    <div class="cc-body">
      <div class="cc-photo">${entityPhoto ? `<img src="${esc(entityPhoto)}">` : `<span>${esc(initials)}</span>`}</div>
      <div class="cc-info">
        <div class="cc-name">${esc(displayName)}</div>
        <div class="cc-tags">
          <span class="cc-tag">${esc(reg.type)}${isSub ? " · " + (res.kind === "P" ? "Player" : "Guest") : ""}</span>
          <span class="cc-tag">${esc(d.category || "—")}</span>
        </div>
        <div class="cc-rows">
          <div><b>ID</b><span>${esc(res.code)}</span></div>
          <div><b>Batch</b><span>${esc(batch)}</span></div>
          <div><b>Phone</b><span>${esc(phone)}</span></div>
          ${d.hostTeam ? `<div><b>Team guest of</b><span>${esc(d.hostTeam)}</span></div>` : ""}
        </div>
        <p class="cc-status">${esc(statusLine)}</p>
      </div>
    </div>
    <div class="cc-actions">${buttons}</div>
  </div>`;
}

// Refresh idle placeholder
function _ciIdleHtml() {
  return `<div class="ci-idle">
    <div class="ci-idle-ic">👀</div>
    <b>Ready to scan</b>
    <p>Point your camera at a pass, or type an ID above.</p>
  </div>`;
}
function _ciClear() { const s = $("#ci-profile-slot"); if (s) s.innerHTML = _ciIdleHtml(); }

function _ciShowDenyOptions(code) {
  const reasons = ["Wrong person for this pass", "Suspicious behaviour", "Duplicate/copy pass", "Other"];
  const slot = $("#ci-profile-slot"); if (!slot) return;
  slot.innerHTML = `<div class="ci-card ci-card-warn">
    <div class="cc-stripe">DENY — PICK REASON</div>
    <div class="cc-body-err">
      <div class="cce-ic">🚫</div>
      <b>Why are you denying entry?</b>
      <div class="ci-deny-reasons">
        ${reasons.map(r => `<button class="btn btn-line" onclick="_ciDeny('${esc(code)}','${esc(r)}')">${esc(r)}</button>`).join("")}
      </div>
      <button class="btn btn-ghost" onclick="_ciClear()">Cancel</button>
    </div>
  </div>`;
}

function ciRush(on) { window._ciRush = on; }

/* Live KPI helpers */
function _ciRatePerMin() {
  const fiveAgo = Date.now() - 5 * 60 * 1000;
  let count = 0;
  App.regs.forEach(r => {
    if (r.checkedIn && r.checkedIn >= fiveAgo) count++;
    (r.players || []).forEach(p => { if (p.checkedIn && p.checkedIn >= fiveAgo) count++; });
    (r.guests || []).forEach(g => { if (g.checkedIn && g.checkedIn >= fiveAgo) count++; });
  });
  return Math.round(count / 5);
}
function _ciRecentCount() {
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  let count = 0;
  App.regs.forEach(r => {
    if (r.checkedIn && r.checkedIn >= dayStart.getTime()) count++;
    (r.players || []).forEach(p => { if (p.checkedIn && p.checkedIn >= dayStart.getTime()) count++; });
    (r.guests || []).forEach(g => { if (g.checkedIn && g.checkedIn >= dayStart.getTime()) count++; });
  });
  return count;
}
function _ciUpdateKPIs() {
  const st = checkinStats();
  document.querySelectorAll(".ci-kpi b").forEach((b, i) => {
    if (i === 0) b.textContent = st.inN;
    else if (i === 1) b.textContent = st.total;
    else if (i === 2) b.textContent = st.total - st.inN;
    else if (i === 3) b.textContent = _ciRatePerMin();
  });
  const bar = $(".ci-progress-fill");
  if (bar && st.total) bar.style.width = Math.round(st.inN / st.total * 100) + "%";
  const rc = $("#ci-recent-count"); if (rc) rc.textContent = _ciRecentCount() + " today";
}
function _ciAppendRecent(res) {} // list re-renders after save

/* Fast lookup — build a Map once, then O(1) per scan */
let _ciMap = null;
function _ciBuildMap() {
  _ciMap = new Map();
  (App.regs || []).forEach(r => {
    _ciMap.set(r.id, r);
    (r.players || []).forEach((p, i) => _ciMap.set(`${r.id}#P${i + 1}`, { reg: r, kind: "P", idx: i, entity: p }));
    (r.guests || []).forEach((g, i) => _ciMap.set(`${r.id}#G${i + 1}`, { reg: r, kind: "G", idx: i, entity: g }));
  });
}

function _ciResolveCode(code) {
  if (!_ciMap) _ciBuildMap();
  const clean = String(code || "").trim().toUpperCase();
  if (!/^EXCAP-FT\d{2}-/.test(clean)) return { outcome: "malformed", code: clean };
  const hit = _ciMap.get(clean);
  if (!hit) return { outcome: "unknown", code: clean };
  // Normalize to a common shape
  const isSub = clean.includes("#");
  const reg = isSub ? hit.reg : hit;
  const kind = isSub ? hit.kind : "reg";
  const idx = isSub ? hit.idx : -1;
  const entity = isSub ? hit.entity : reg;
  const displayName = isSub ? (entity.name || "—") : (reg.data.teamName || reg.data.name || "—");
  return { outcome: "found", reg, kind, idx, entity, displayName, code: clean, isSub };
}
function showCi(cls, icon, name, sub, photo) {
  const el = $("#ci-result"); if (!el) return;
  el.innerHTML = `<div class="ci-card ${cls}"><div class="ci-photo">${photo ? `<img src="${photo}">` : (cls === "ok" ? "✓" : cls === "dup" ? "!" : "✕")}</div>
        <div><div style="font-family:var(--font-display);font-weight:800;font-size:18px">${esc(name)}</div>
        <div style="color:var(--muted);font-size:13px">${esc(sub)}</div>
        <div class="pill ${cls === 'ok' ? 'ok' : cls === 'dup' ? 'rev' : 'red'}" style="margin-top:6px">${cls === 'ok' ? 'Checked in ✓' : cls === 'dup' ? 'Already in' : 'Invalid'}</div></div></div>`;
  if (cls === "ok") beepOK();
  else if (cls === "dup") beepDup();
  else beepFail();
}
function checkinStats() {
  let inN = 0, total = 0;
  App.regs.forEach(r => {
    if (["approved"].includes(r.status) || r.type === "student") { total++; if (r.checkedIn) inN++; }
    (r.players || []).forEach(p => { total++; if (p.checkedIn) inN++; });
    (r.guests || []).forEach(g => { total++; if (g.checkedIn) inN++; });
  });
  return { inN, total };
}
function adminCheckin() {
  _ciBuildMap();
  const st = checkinStats();
  const rate = _ciRatePerMin();

  $("#admin-body").innerHTML = `
    <div class="ci-page">

      <!-- Top KPIs -->
      <div class="ci-kpi-row">
        <div class="ci-kpi ok">
          <div class="ck-ic">✅</div>
          <div><b>${st.inN}</b><span>Checked in</span></div>
        </div>
        <div class="ci-kpi">
          <div class="ck-ic">🎫</div>
          <div><b>${st.total}</b><span>Eligible</span></div>
        </div>
        <div class="ci-kpi">
          <div class="ck-ic">⏳</div>
          <div><b>${st.total - st.inN}</b><span>Awaiting</span></div>
        </div>
        <div class="ci-kpi rate">
          <div class="ck-ic">⚡</div>
          <div><b>${rate}</b><span>per min (last 5m)</span></div>
        </div>
      </div>
      <div class="ci-progress"><div class="ci-progress-fill" style="width:${st.total ? Math.round(st.inN / st.total * 100) : 0}%"></div></div>

      <!-- Main scan area -->
      <div class="ci-main">
        <!-- Left: scanner + controls -->
        <div class="ci-scanner-col">
          <div class="ci-scanner-card">
            <div class="ci-hd">
              <h3>Scan pass</h3>
              <div class="ci-hd-controls">
                <label class="ci-toggle">
                  <input type="checkbox" id="ci-rush" ${window._ciRush ? "checked" : ""} onchange="ciRush(this.checked)">
                  <span class="ci-toggle-slider"></span>
                  <span class="ci-toggle-lbl">Rush mode</span>
                </label>
                <label class="ci-vol-wrap" title="Volume">
                  <span>🔊</span>
                  <input type="range" id="ci-vol" min="0" max="100" value="${_ciVolume * 100}" onchange="_ciVolume = this.value / 100" oninput="_ciVolume = this.value / 100">
                </label>
              </div>
            </div>
            <div id="reader" class="ci-reader"></div>
            <div class="ci-scanner-btns">
              <button class="btn btn-pitch" id="ci-start" onclick="ciStart()">📷 Start camera</button>
              <button class="btn btn-line" onclick="ciStop()">⏹ Stop</button>
              <button class="btn btn-line" onclick="ciSoundValid()" title="Test sound">🔊 Test</button>
            </div>
            <div class="ci-manual-row">
              <input id="ci-manual" placeholder="Or type code manually…" onkeydown="if(event.key==='Enter')ciManual()">
              <button class="btn btn-primary" onclick="ciManual()">Check in</button>
            </div>
          </div>
        </div>

        <!-- Right: profile card slot -->
        <div class="ci-profile-col" id="ci-profile-slot">
          <div class="ci-idle">
            <div class="ci-idle-ic">👀</div>
            <b>Ready to scan</b>
            <p>Point your camera at a pass, or type an ID above. Details will appear here.</p>
          </div>
        </div>
      </div>

      <!-- Recent feed -->
      <div class="panel">
        <div class="ci-recent-hd">
          <h3>Recent activity</h3>
          <span class="ci-recent-count" id="ci-recent-count">${_ciRecentCount()} today</span>
        </div>
        <div id="ci-list"></div>
      </div>

    </div>`;
  renderCiList();
}
function ciStart() {
  const btn = $("#ci-start");
  if (!window.QR || !window.Html5Qrcode) { toast("Scanner needs the live HTTPS site + camera permission", "warn"); return; }
  if (window._ciScanner && window._ciScanner.stop) window._ciScanner.stop();
  const onDecode = (text) => doCheckin(text);
  onDecode.__err = (e) => toast("Camera error — check permission", "err");
  window._ciScanner = QR.scanner("reader", onDecode);
  if (window._ciScanner.ok) { btn.textContent = "Scanning…"; } else toast(window._ciScanner.error || "Scanner unavailable", "warn");
}
function ciStop() { if (window._ciScanner && window._ciScanner.stop) { _ciScanner.stop(); window._ciScanner = null; const b = $("#ci-start"); if (b) b.textContent = "Start camera"; } }
function ciManual() { const c = $("#ci-manual").value.trim(); if (!c) { toast("Enter a code", "warn"); return; } doCheckin(c); $("#ci-manual").value = ""; }
function renderCiList() {
  const list = [];
  App.regs.forEach(r => {
    if (r.checkedIn) list.push({ t: r.checkedIn, name: r.data.teamName || r.data.name, sub: r.type + " · " + r.id, regId: r.id, kind: "reg" });
    (r.players || []).forEach((p, i) => { if (p.checkedIn) list.push({ t: p.checkedIn, name: p.name, sub: r.data.teamName + " · Player " + (i + 1), regId: r.id, kind: "P", idx: i }); });
    (r.guests || []).forEach((g, i) => { if (g.checkedIn) list.push({ t: g.checkedIn, name: g.name, sub: (r.data.teamName || "") + " · Guest " + (i + 1), regId: r.id, kind: "G", idx: i }); });
  });
  list.sort((a, b) => b.t - a.t);
  const el = $("#ci-list"); if (!el) return;
  el.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Name</th><th>Pass</th><th></th></tr></thead><tbody>
        ${list.slice(0, 80).map(x => `<tr>
          <td style="white-space:nowrap">${fmtDateTime(x.t)}</td>
          <td><b>${esc(x.name)}</b></td>
          <td style="color:var(--muted)">${esc(x.sub)}</td>
          <td><button class="btn btn-sm btn-danger" onclick="undoCheckin('${x.regId}','${x.kind}',${x.idx != null ? x.idx : -1})">Undo</button></td>
        </tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">No check-ins yet.</td></tr>`}
      </tbody></table></div>`;
}
async function undoCheckin(regId, kind, idx) {
  const r = App.regs.find(x => x.id === regId); if (!r) return;
  let stamp = 0;
  if (kind === "reg") stamp = r.checkedIn || 0;
  else if (kind === "P" && r.players?.[+idx]) stamp = r.players[+idx].checkedIn || 0;
  else if (kind === "G" && r.guests?.[+idx]) stamp = r.guests[+idx].checkedIn || 0;
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (stamp < hourAgo) {
    toast("Undo only allowed within 1 hour — contact head organizer", "warn");
    return;
  }
  if (!confirm("Remove this check-in?")) return;
  let name = r.data.teamName || r.data.name || regId;
  if (kind === "reg") { delete r.checkedIn; delete r.checkedBy; }
  else if (kind === "P" && r.players[+idx]) { name = r.players[+idx].name || name; delete r.players[+idx].checkedIn; delete r.players[+idx].checkedBy; }
  else if (kind === "G" && r.guests[+idx]) { name = r.guests[+idx].name || name; delete r.guests[+idx].checkedIn; delete r.guests[+idx].checkedBy; }
  try {
    await Store.saveReg(r);
    await Store.logAction("Undo check-in", regId + " — " + name);
    ciSoundUndo();
    toast("Check-in removed");
    _ciBuildMap();
    _ciUpdateKPIs();
    renderCiList();
  } catch (e) { toast("Could not undo: " + (e.message || "error"), "err"); }
}

/* ============================================================
   MESSAGES / SUPPORT TICKETS
   ============================================================ */
async function adminMessages() {
  $("#admin-body").innerHTML = `<div class="panel"><p class="ph-help">Loading messages…</p></div>`;
  let tickets = []; try { tickets = await Store.listTickets(); } catch (e) { }
  App._tickets = tickets;
  const open = tickets.filter(t => t.status === "open").length;
  $("#admin-body").innerHTML = `
        <div class="kpis"><div class="kpi accent"><div class="v num">${open}</div><div class="k">Open</div></div>
          <div class="kpi"><div class="v num">${tickets.length}</div><div class="k">Total messages</div></div>
          <div class="kpi"><div class="v num">${tickets.length - open}</div><div class="k">Resolved</div></div></div>
        <div class="panel"><h3>Contact &amp; support inbox</h3>
          <p class="ph-help">Every message from the site's contact form lands here.</p>
          <div id="tk-list">${tickets.length ? tickets.map(ticketRow).join("") : `<div class="empty-wall">No messages yet.</div>`}</div>
        </div>`;
}
function ticketRow(t) {
  return `<div class="tk ${t.status}">
        <div class="tk-main">
          <div class="tk-head"><b>${esc(t.name)}</b><span class="pill ${t.status === 'open' ? 'rev' : 'ok'}">${t.status === 'open' ? 'Open' : 'Resolved'}</span></div>
          <a href="mailto:${esc(t.email)}" class="tk-email">${esc(t.email)}</a>
          <p class="tk-msg">${esc(t.message)}</p>
          <span class="tk-time">${fmtDateTime(t.created)}</span>
        </div>
        <div class="tk-actions">
          <a class="btn btn-sm btn-primary" href="mailto:${esc(t.email)}?subject=Re%3A%20EX-CAP%20support&body=${encodeURIComponent("Hi " + t.name + ",\n\n")}">Reply</a>
          ${t.status === "open"
      ? `<button class="btn btn-sm btn-pitch" onclick="resolveTicket('${t.id}',true)">Mark resolved</button>`
      : `<button class="btn btn-sm btn-line" onclick="resolveTicket('${t.id}',false)">Reopen</button>`}
        </div>
      </div>`;
}
async function resolveTicket(id, resolved) {
  await Store.updateTicket(id, { status: resolved ? "resolved" : "open" });
  await Store.logAction(resolved ? "Resolved message" : "Reopened message", id);
  toast(resolved ? "Marked resolved" : "Reopened");
  adminMessages();
}

/* ---------- activity log ---------- */
async function adminLog() {
  $("#admin-body").innerHTML = `<div class="panel"><h3>Activity log</h3><p class="ph-help">Every admin action is recorded here — who did what and when. Newest first.</p>
        <div id="log-body"><div style="padding:24px;text-align:center;color:var(--muted)"><span class="spinner"></span> Loading…</div></div></div>`;
  let logs = []; try { logs = await Store.listLogs(300); } catch (e) { }
  $("#log-body").innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead><tbody>
        ${logs.map(l => `<tr><td style="white-space:nowrap">${fmtDateTime(l.ts)}</td>
          <td class="nm"><b>${esc(l.by)}</b><span>${esc(l.email)}</span></td>
          <td>${esc(l.action)}</td><td style="color:var(--muted)">${esc(l.detail || "—")}</td></tr>`).join("")
    || `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">No activity yet.</td></tr>`}
      </tbody></table></div>`;
}

/* ============================================================
   Custom PDF Export — pick type, scope, and fields
   ============================================================ */

// Define what fields exist per registration type
const PDF_FIELDS = {
  team: [
    { k: "id",            l: "Registration ID",   d: true  },
    { k: "teamName",      l: "Team name",          d: true  },
    { k: "category",      l: "Category",           d: true  },
    { k: "clubName", l: "Club", d: true },
    { k: "captainName",   l: "Captain name",       d: true  },
    { k: "captainPhone",  l: "Captain phone",      d: true  },
    { k: "viceName",      l: "Vice-captain",       d: false },
    { k: "email",         l: "Email",              d: true  },
    { k: "sscBatch",      l: "SSC batch",          d: true  },
    { k: "hscBatch",      l: "HSC batch",          d: true  },
    { k: "playerCount",   l: "Player count",       d: true  },
    { k: "tshirt",        l: "T-shirt size",       d: false },
    { k: "paymentStatus", l: "Payment status",     d: true  },
    { k: "paymentMethod", l: "Payment method",     d: false },
    { k: "paymentTxn",    l: "Transaction ID",     d: false },
    { k: "paymentSender", l: "Sender number",      d: false },
    { k: "status",        l: "Status",             d: true  },
    { k: "created",       l: "Registered at",      d: false },
    { k: "adminNotes",    l: "Internal notes",     d: false },
    { k: "playerList",    l: "Full player list",   d: false }
  ],
  guest: [
    { k: "id",       l: "Registration ID",  d: true  },
    { k: "name",     l: "Full name",         d: true  },
    { k: "phone",    l: "Mobile",            d: true  },
    { k: "email",    l: "Email",             d: true  },
    { k: "category", l: "Category",          d: true  },
    { k: "sscBatch", l: "SSC batch",         d: true  },
    { k: "hscBatch", l: "HSC batch",         d: true  },
    { k: "nid",      l: "NID number",        d: true  },
    { k: "photo",    l: "Photo",             d: false },
    { k: "status",   l: "Status",            d: true  },
    { k: "created",  l: "Registered at",     d: false }
  ],
  visitor: [
    { k: "id",       l: "Registration ID",  d: true  },
    { k: "name",     l: "Full name",         d: true  },
    { k: "phone",    l: "Mobile",            d: true  },
    { k: "email",    l: "Email",             d: true  },
    { k: "category", l: "Category",          d: true  },
    { k: "relation", l: "Relation",          d: true  },
    { k: "sscBatch", l: "SSC batch",         d: false },
    { k: "hscBatch", l: "HSC batch",         d: false },
    { k: "status",   l: "Status",            d: true  }
  ],
  volunteer: [
    { k: "id",             l: "Registration ID",  d: true  },
    { k: "name",           l: "Full name",         d: true  },
    { k: "phone",          l: "Mobile",            d: true  },
    { k: "email",          l: "Email",             d: true  },
    { k: "preferredRole",  l: "Preferred role",    d: true  },
    { k: "availability",   l: "Availability",      d: true  },
    { k: "experience",     l: "Experience",        d: false },
    { k: "sscBatch",       l: "SSC batch",         d: false },
    { k: "hscBatch",       l: "HSC batch",         d: false },
    { k: "status",         l: "Status",            d: true  }
  ]
};

/* Tournament fixtures seed data — 25 matches, 18 teams */
const FIXTURES_SEED = [
  { id: "M01", matchNo: 1, stage: "group", group: "A", homeTeamName: "SCPSC Gladiators", awayTeamName: "Rampant XI-25", kickoff: "2026-07-10T09:00:00+06:00", endsAt: "2026-07-10T09:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M02", matchNo: 2, stage: "group", group: "B", homeTeamName: "Dark Horse-25", awayTeamName: "Elite United 23", kickoff: "2026-07-10T09:00:00+06:00", endsAt: "2026-07-10T09:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M03", matchNo: 3, stage: "group", group: "C", homeTeamName: "Conspiracy FC", awayTeamName: "Aether FC", kickoff: "2026-07-10T09:30:00+06:00", endsAt: "2026-07-10T10:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M04", matchNo: 4, stage: "group", group: "D", homeTeamName: "SCPSCSC B", awayTeamName: "Dominators", kickoff: "2026-07-10T09:30:00+06:00", endsAt: "2026-07-10T10:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M05", matchNo: 5, stage: "group", group: "E", homeTeamName: "Boyosh Kom Rokto Gorom Ekadosh'26", awayTeamName: "Dark Hawks", kickoff: "2026-07-10T10:00:00+06:00", endsAt: "2026-07-10T10:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M06", matchNo: 6, stage: "group", group: "F", homeTeamName: "SCPSC Warriors 05/07", awayTeamName: "SCPSCSC A", kickoff: "2026-07-10T10:00:00+06:00", endsAt: "2026-07-10T10:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M07", matchNo: 7, stage: "group", group: "B", homeTeamName: "Dark Horse-25", awayTeamName: "Obscure XI", kickoff: "2026-07-10T10:30:00+06:00", endsAt: "2026-07-10T11:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M08", matchNo: 8, stage: "group", group: "A", homeTeamName: "SCPSC Gladiators", awayTeamName: "Champs (C-24)", kickoff: "2026-07-10T10:30:00+06:00", endsAt: "2026-07-10T11:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M09", matchNo: 9, stage: "group", group: "C", homeTeamName: "Real Classicos CF", awayTeamName: "Aether FC", kickoff: "2026-07-10T11:00:00+06:00", endsAt: "2026-07-10T11:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M10", matchNo: 10, stage: "group", group: "D", homeTeamName: "SCPSCSC B", awayTeamName: "Retro Reign 16'18'", kickoff: "2026-07-10T11:00:00+06:00", endsAt: "2026-07-10T11:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M11", matchNo: 11, stage: "group", group: "E", homeTeamName: "Boyosh Kom Rokto Gorom Ekadosh'26", awayTeamName: "Covid-19", kickoff: "2026-07-10T11:30:00+06:00", endsAt: "2026-07-10T12:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M12", matchNo: 12, stage: "group", group: "A", homeTeamName: "Rampant XI-25", awayTeamName: "Champs (C-24)", kickoff: "2026-07-10T11:30:00+06:00", endsAt: "2026-07-10T12:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M13", matchNo: 13, stage: "group", group: "B", homeTeamName: "Elite United 23", awayTeamName: "Obscure XI", kickoff: "2026-07-10T12:00:00+06:00", endsAt: "2026-07-10T12:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M14", matchNo: 14, stage: "group", group: "C", homeTeamName: "Aether FC", awayTeamName: "Conspiracy FC", kickoff: "2026-07-10T12:00:00+06:00", endsAt: "2026-07-10T12:30:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M15", matchNo: 15, stage: "group", group: "F", homeTeamName: "SSC Batch 2000", awayTeamName: "SCPSC Warriors 05/07", kickoff: "2026-07-10T12:30:00+06:00", endsAt: "2026-07-10T13:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M16", matchNo: 16, stage: "group", group: "E", homeTeamName: "Dark Hawks", awayTeamName: "Covid-19", kickoff: "2026-07-10T12:30:00+06:00", endsAt: "2026-07-10T13:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M17", matchNo: 17, stage: "group", group: "F", homeTeamName: "SSC Batch 2000", awayTeamName: "SCPSCSC A", kickoff: "2026-07-10T14:30:00+06:00", endsAt: "2026-07-10T15:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "M18", matchNo: 18, stage: "group", group: "D", homeTeamName: "Dominators", awayTeamName: "Retro Reign 16'18'", kickoff: "2026-07-10T14:30:00+06:00", endsAt: "2026-07-10T15:00:00+06:00", venue: "SCPSC School Field", status: "scheduled" },
  { id: "QF1", matchNo: 19, stage: "quarterfinal", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner Group A", awayPlaceholder: "Winner Group C", kickoff: "2026-07-10T15:00:00+06:00", endsAt: "2026-07-10T15:30:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" },
  { id: "QF2", matchNo: 20, stage: "quarterfinal", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner Group E", awayPlaceholder: "1st Runner-up", kickoff: "2026-07-10T15:00:00+06:00", endsAt: "2026-07-10T15:30:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" },
  { id: "QF3", matchNo: 21, stage: "quarterfinal", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner Group B", awayPlaceholder: "Winner Group D", kickoff: "2026-07-10T15:30:00+06:00", endsAt: "2026-07-10T16:00:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" },
  { id: "QF4", matchNo: 22, stage: "quarterfinal", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner Group F", awayPlaceholder: "2nd Runner-up", kickoff: "2026-07-10T15:30:00+06:00", endsAt: "2026-07-10T16:00:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" },
  { id: "SF1", matchNo: 23, stage: "semifinal", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner QF1", awayPlaceholder: "Winner QF2", kickoff: "2026-07-10T16:15:00+06:00", endsAt: "2026-07-10T16:45:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" },
  { id: "SF2", matchNo: 24, stage: "semifinal", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner QF3", awayPlaceholder: "Winner QF4", kickoff: "2026-07-10T16:15:00+06:00", endsAt: "2026-07-10T16:45:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" },
  { id: "F1", matchNo: 25, stage: "final", group: null, homeTeamName: null, awayTeamName: null, homePlaceholder: "Winner SF1", awayPlaceholder: "Winner SF2", kickoff: "2026-07-10T17:15:00+06:00", endsAt: "2026-07-10T17:45:00+06:00", venue: "SCPSC School Field", status: "awaiting-teams" }
];

let _pdfExportType = "team";
let _pdfExportScope = "all";
let _pdfExportFields = {};   // { fieldKey: true/false }

function showCustomPdfExport() {
  _pdfExportType = "team";
  _pdfExportScope = "all";
  _pdfExportFields = {};
  PDF_FIELDS.team.forEach(f => { _pdfExportFields[f.k] = f.d; });

  showModal(`<div class="pdf-export-wrap">
    <div class="pe-head">
      <div class="pe-ic">📋</div>
      <div>
        <h3>Custom PDF Export</h3>
        <p>Choose registration type, scope, and which fields to include.</p>
      </div>
    </div>

    <div class="pe-body" id="pe-body">${renderPdfExportForm()}</div>

    <div class="pe-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="pe-generate" onclick="generateCustomPdf()">⤓ Generate PDF</button>
    </div>
  </div>`, "wide");
}

function renderPdfExportForm() {
  const counts = {
    team: App.regs.filter(r => r.type === "team").length,
    guest: App.regs.filter(r => r.type === "guest").length,
    visitor: App.regs.filter(r => r.type === "visitor").length,
    volunteer: App.regs.filter(r => r.type === "volunteer").length
  };
  const selectedCount = (window.selectedIds && typeof window.selectedIds.size === "number") ? window.selectedIds.size : 0;
  const fields = PDF_FIELDS[_pdfExportType] || [];

  return `
    <!-- Step 1: type -->
    <div class="pe-step">
      <div class="pe-step-h"><span class="pe-step-n">1</span> Registration type</div>
      <div class="pe-type-grid">
        ${["team", "guest", "visitor", "volunteer"].map(t => `
          <button class="pe-type ${_pdfExportType === t ? "active" : ""}" onclick="setPdfExportType('${t}')">
            <span class="pt-ic">${t === "team" ? "⚽" : t === "guest" ? "🎟️" : t === "visitor" ? "👤" : "🤝"}</span>
            <b>${t.charAt(0).toUpperCase() + t.slice(1)}s</b>
            <span class="pt-cnt">${counts[t]}</span>
          </button>
        `).join("")}
      </div>
    </div>

    <!-- Step 2: scope -->
    <div class="pe-step">
      <div class="pe-step-h"><span class="pe-step-n">2</span> Which records</div>
      <div class="pe-scope">
        <label class="pe-radio ${_pdfExportScope === "all" ? "active" : ""}">
          <input type="radio" name="pe-scope" value="all" ${_pdfExportScope === "all" ? "checked" : ""} onchange="setPdfExportScope('all')">
          <span>All ${_pdfExportType}s (${counts[_pdfExportType]})</span>
        </label>
        <label class="pe-radio ${_pdfExportScope === "approved" ? "active" : ""}">
          <input type="radio" name="pe-scope" value="approved" ${_pdfExportScope === "approved" ? "checked" : ""} onchange="setPdfExportScope('approved')">
          <span>Approved only</span>
        </label>
        <label class="pe-radio ${_pdfExportScope === "review" ? "active" : ""}">
          <input type="radio" name="pe-scope" value="review" ${_pdfExportScope === "review" ? "checked" : ""} onchange="setPdfExportScope('review')">
          <span>Under review only</span>
        </label>
        <label class="pe-radio ${_pdfExportScope === "selected" ? "active" : ""} ${!selectedCount ? "disabled" : ""}">
          <input type="radio" name="pe-scope" value="selected" ${_pdfExportScope === "selected" ? "checked" : ""} ${!selectedCount ? "disabled" : ""} onchange="setPdfExportScope('selected')">
          <span>Selected only (${selectedCount})</span>
        </label>
      </div>
    </div>

    <!-- Step 3: fields -->
    <div class="pe-step">
      <div class="pe-step-h">
        <span class="pe-step-n">3</span> Fields to include
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn-sm btn-line" onclick="togglePdfFields(true)">All</button>
          <button class="btn btn-sm btn-line" onclick="togglePdfFields(false)">None</button>
        </div>
      </div>
      <div class="pe-fields">
        ${fields.map(f => `
          <label class="pe-fld ${_pdfExportFields[f.k] ? "checked" : ""}">
            <input type="checkbox" ${_pdfExportFields[f.k] ? "checked" : ""} onchange="togglePdfField('${f.k}', this.checked)">
            <span>${esc(f.l)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function setPdfExportType(t) {
  _pdfExportType = t;
  _pdfExportFields = {};
  PDF_FIELDS[t].forEach(f => { _pdfExportFields[f.k] = f.d; });
  $("#pe-body").innerHTML = renderPdfExportForm();
}
function setPdfExportScope(s) {
  _pdfExportScope = s;
  $("#pe-body").innerHTML = renderPdfExportForm();
}
function togglePdfField(k, checked) {
  _pdfExportFields[k] = checked;
  // Update the label class without full re-render for smoothness
  const label = document.querySelector(`.pe-fld input[onchange*="'${k}'"]`)?.parentElement;
  if (label) label.classList.toggle("checked", checked);
}
function togglePdfFields(all) {
  PDF_FIELDS[_pdfExportType].forEach(f => { _pdfExportFields[f.k] = all; });
  $("#pe-body").innerHTML = renderPdfExportForm();
}

function generateCustomPdf() {
  // Filter records
  let list = App.regs.filter(r => r.type === _pdfExportType);
  if (_pdfExportScope === "approved") list = list.filter(r => r.status === "approved");
  else if (_pdfExportScope === "review") list = list.filter(r => r.status === "review");
  else if (_pdfExportScope === "selected") {
    const sel = (window.selectedIds && typeof window.selectedIds.has === "function") ? window.selectedIds : new Set();
    list = list.filter(r => sel.has(r.id));
  }

  if (!list.length) { toast("No records match your selection", "warn"); return; }

  // Which fields
  const activeFields = PDF_FIELDS[_pdfExportType].filter(f => _pdfExportFields[f.k]);
  if (!activeFields.length) { toast("Pick at least one field", "warn"); return; }

  closeModal();
  toast("Building PDF…");
  _renderCustomPdf(list, activeFields, _pdfExportType, _pdfExportScope);
}

function _renderCustomPdf(list, activeFields, type, scope) {
  const s = App.settings;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
  const scopeLabel = { all: "All", approved: "Approved", review: "Under review", selected: "Selected" }[scope] || "";

  const getVal = (r, k) => {
    const d = r.data || {};
    switch (k) {
      case "id": return r.id;
      case "teamName": return d.teamName || "—";
      case "name": return d.name || "—";
      case "category": return d.category || "—";
      case "captainName": return d.captainName || "—";
      case "captainPhone": return d.captainPhone || r.contact || "—";
      case "viceName": return d.viceName || "—";
      case "phone": return r.contact || d.phone || "—";
      case "email": return d.email || r.captainEmail || "—";
      case "sscBatch": return d.sscBatch ? `SSC ${d.sscBatch}` : "—";
      case "hscBatch": return d.hscBatch ? `HSC ${d.hscBatch}` : "—";
      case "playerCount": return `${(r.players || []).length}/${s.playersPerTeam}`;
      case "tshirt": return d.tshirt || "—";
      case "clubName": return d.clubName || (d.club === "sports" ? "Sports Club" : d.club === "business" ? "Business & Career Club" : "—");
      case "nid": return d.nid || "—";
      case "relation": return d.relation || "—";
      case "preferredRole": return d.preferredRole || "—";
      case "availability": return d.availability || "—";
      case "experience": return d.experience || "—";
      case "paymentStatus": return r.paymentStatus || "—";
      case "paymentMethod": return r.payment?.method || "—";
      case "paymentTxn": return r.payment?.txn || "—";
      case "paymentSender": return r.payment?.sender || "—";
      case "status": return r.status || "—";
      case "created": return r.created ? new Date(r.created).toLocaleDateString() : "—";
      case "adminNotes": return r.adminNotes || "—";
      case "photo": return d.photo || "";
      case "playerList": return r.players || [];
      default: return "—";
    }
  };

  const statusColor = st => st === "approved" ? "#16a34a" : st === "review" ? "#d97706" : st === "rejected" ? "#dc2626" : "#6b7280";
  const initials2 = str => (str || "?").split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();

  const w = window.open("", "_blank");
  if (!w) { toast("Allow pop-ups to download", "warn"); return; }

  const logoTag = (key) => {
    const up = App.logos && App.logos[key];
    if (up) return `<img class="lg" src="${up}" alt="">`;
    return `<img class="lg" src="${location.origin}/assets/logo-${key}.png" alt="" onerror="this.style.display='none'">`;
  };

  // Filter fields to display in the profile body (photo/name/status/id are rendered separately in the card header)
  const specialInHeader = ["photo", "id", "status"];
  const nameKey = type === "team" ? "teamName" : "name";
  const bodyFields = activeFields.filter(f => !specialInHeader.includes(f.k) && f.k !== nameKey && f.k !== "playerList");
  const showPlayerList = activeFields.some(f => f.k === "playerList");
  const showPhoto = activeFields.some(f => f.k === "photo");
  const showId = activeFields.some(f => f.k === "id");
  const showStatus = activeFields.some(f => f.k === "status");
  const showName = activeFields.some(f => f.k === nameKey);

  // Build each profile card
  const cards = list.map((r, i) => {
    const d = r.data || {};
    const displayName = showName ? (type === "team" ? d.teamName : d.name) || "—" : "";
    const photo = showPhoto ? (d.photo || d.logo || "") : "";

    const rows = bodyFields.map(f => {
      let val = getVal(r, f.k);
      if (typeof val === "object") val = String(val);
      return `<div class="p-row">
        <span class="p-lbl">${esc(f.l)}</span>
        <span class="p-val">${esc(String(val))}</span>
      </div>`;
    }).join("");

    const players = showPlayerList && r.type === "team" && (r.players || []).length ? `
      <div class="p-players">
        <div class="p-players-h">Players (${r.players.length})</div>
        <div class="p-players-grid">
          ${r.players.map((p, j) => `<div class="p-player">
            <span class="pp-n">${j + 1}</span>
            <span class="pp-name">${esc(p.name || "—")}</span>
            <span class="pp-role">${esc(p.role || "Player")}</span>
          </div>`).join("")}
        </div>
      </div>
    ` : "";

    return `<div class="profile-card">
      <div class="pc-head">
        ${showPhoto ? `<div class="pc-photo">${photo ? `<img src="${esc(photo)}" alt="">` : `<span>${esc(initials2(displayName))}</span>`}</div>` : ""}
        <div class="pc-title">
          <div class="pc-num">#${i + 1}</div>
          ${showName ? `<div class="pc-name">${esc(displayName)}</div>` : ""}
          <div class="pc-meta">
            ${showId ? `<span class="pc-id">${esc(r.id)}</span>` : ""}
            ${showStatus ? `<span class="pc-st" style="background:${statusColor(r.status)}">${esc(r.status)}</span>` : ""}
          </div>
        </div>
      </div>
      ${rows ? `<div class="pc-body">${rows}</div>` : ""}
      ${players}
    </div>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(typeLabel)} Report — ${esc(s.tournamentName || "EX-CAP")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#f5f6fa;color:#0f1424;font-family:'Inter',system-ui,Arial,sans-serif;font-size:11px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{max-width:820px;margin:20px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px -30px rgba(0,0,0,.35);border:1px solid #e6e8f0}

  /* header */
  .head{position:relative;padding:22px 30px 20px;background:linear-gradient(120deg,#7c3aed,#db2777);color:#fff;overflow:hidden}
  .head::after{content:"";position:absolute;right:-70px;top:-70px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.09)}
  .head-top{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
  .head-logos{display:flex;gap:8px}
  .head-logos .lg{width:40px;height:40px;border-radius:9px;background:#fff;padding:4px;object-fit:contain}
  .head-title h1{font-family:'Archivo',sans-serif;font-weight:900;font-size:18px;letter-spacing:-.01em;line-height:1.1;text-transform:uppercase}
  .head-title .k{font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:3px}
  .meta{position:relative;z-index:1;margin-top:14px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:8px 14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:10.5px}
  .meta b{font-family:'Archivo',sans-serif;font-weight:800}

  .body{padding:24px 24px 26px}
  .section-lbl{font-family:'Archivo',sans-serif;font-weight:900;font-size:12px;color:#7c3aed;letter-spacing:.05em;text-transform:uppercase;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #ece5fa}

  /* PROFILE GRID — 2 columns, 3-4 rows per page = 6-8 profiles per page */
  .profile-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:12px;
  }
  .profile-card{
    background:#fff;
    border:1px solid #e2e5f0;
    border-radius:10px;
    padding:12px 14px;
    break-inside:avoid;
    page-break-inside:avoid;
    display:flex;
    flex-direction:column;
    min-height:0;
  }

  /* Card header */
  .pc-head{
    display:flex;
    gap:10px;
    align-items:flex-start;
    padding-bottom:10px;
    margin-bottom:10px;
    border-bottom:1px solid #eef0f7;
  }
  .pc-photo{
    flex:none;
    width:52px;height:52px;
    border-radius:10px;
    overflow:hidden;
    background:linear-gradient(135deg,#7c3aed,#db2777);
    display:grid;place-items:center;
  }
  .pc-photo img{width:100%;height:100%;object-fit:cover}
  .pc-photo span{
    color:#fff;
    font-family:'Archivo',sans-serif;
    font-weight:900;font-size:16px;
    letter-spacing:.02em;
  }
  .pc-title{flex:1;min-width:0}
  .pc-num{
    font-family:'Inter',monospace;
    font-size:9px;
    color:#9aa1b4;
    font-weight:700;
    margin-bottom:2px;
  }
  .pc-name{
    font-family:'Archivo',sans-serif;
    font-weight:800;
    font-size:13.5px;
    color:#0f1424;
    letter-spacing:-.005em;
    line-height:1.2;
    margin-bottom:5px;
    word-wrap:break-word;
    overflow-wrap:break-word;
  }
  .pc-meta{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
  .pc-id{
    font-family:'Inter',monospace;
    font-size:8.5px;
    color:#6b7280;
    background:#f4f6fb;
    padding:2px 6px;
    border-radius:5px;
    border:1px solid #e2e5f0;
  }
  .pc-st{
    color:#fff;
    font-size:8px;
    font-weight:800;
    letter-spacing:.06em;
    padding:2px 7px;
    border-radius:999px;
    text-transform:uppercase;
  }

  /* Card body */
  .pc-body{
    display:flex;
    flex-direction:column;
    gap:4px;
    font-size:10.5px;
  }
  .p-row{
    display:flex;
    gap:8px;
    align-items:baseline;
    padding:3px 0;
    border-bottom:1px dashed #f4f6fb;
    min-height:0;
  }
  .p-row:last-child{border-bottom:0}
  .p-lbl{
    color:#9aa1b4;
    font-weight:700;
    font-size:8.5px;
    text-transform:uppercase;
    letter-spacing:.05em;
    width:78px;
    flex:none;
    padding-top:1px;
  }
  .p-val{
    color:#0f1424;
    font-weight:600;
    flex:1;
    word-wrap:break-word;
    overflow-wrap:anywhere;
    line-height:1.35;
  }

  /* Players sub-list (team only, if selected) */
  .p-players{
    margin-top:10px;
    padding-top:10px;
    border-top:1px solid #eef0f7;
  }
  .p-players-h{
    font-family:'Archivo',sans-serif;
    font-weight:800;
    font-size:9px;
    color:#7c3aed;
    letter-spacing:.1em;
    text-transform:uppercase;
    margin-bottom:6px;
  }
  .p-players-grid{
    display:grid;
    grid-template-columns:1fr;
    gap:2px;
  }
  .p-player{
    display:grid;
    grid-template-columns:16px 1fr auto;
    gap:6px;
    padding:3px 6px;
    background:#fafbff;
    border-radius:4px;
    font-size:9.5px;
    align-items:center;
  }
  .pp-n{color:#9aa1b4;font-family:monospace;font-weight:600;font-size:9px}
  .pp-name{color:#0f1424;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pp-role{color:#7c3aed;font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:.03em}

  /* footer */
  .foot{
    background:#f7f8fc;
    padding:12px 30px;
    border-top:1px solid #eceef5;
    font-size:10px;color:#6b7280;
    display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;
  }
  .foot .brand{font-family:'Archivo',sans-serif;font-weight:800;color:#7c3aed;letter-spacing:.08em}

  .empty{padding:40px;text-align:center;color:#9aa1b4;font-size:13px}

  @media print{
    html,body{background:#fff}
    .sheet{margin:0;box-shadow:none;border:0;max-width:none;border-radius:0}
    .profile-card{break-inside:avoid;page-break-inside:avoid}
    @page{margin:10mm;size:A4 portrait}
  }
</style>
</head><body>
  <div class="sheet">
    <div class="head">
      <div class="head-top">
        <div class="head-logos">${logoTag("scpsc")}${logoTag("tournament")}${logoTag("excap")}</div>
        <div class="head-title">
          <h1>${esc(s.tournamentName || "EX-CAP Football Tournament")} ${esc(s.edition || "")}</h1>
          <div class="k">${esc(typeLabel)} · ${esc(scopeLabel)} · Custom Export</div>
        </div>
      </div>
      <div class="meta">
        <div>Generated: <b>${esc(dateStr)}</b> · <b>${esc(timeStr)}</b></div>
        <div>Records: <b>${list.length}</b></div>
        <div>Fields: <b>${activeFields.length}</b></div>
        <div>Venue: <b>${esc(s.venue || "SCPSC field")}</b></div>
      </div>
    </div>

    <div class="body">
      <div class="section-lbl">${esc(typeLabel)} — ${esc(scopeLabel)} (${list.length} records)</div>
      ${list.length ? `<div class="profile-grid">${cards}</div>` : `<div class="empty">No matching records.</div>`}
    </div>

    <div class="foot">
      <span>Generated by EX-CAP admin platform · ${list.length} record${list.length === 1 ? "" : "s"}</span>
      <span class="brand">EX-CAP · ALUMNI OF SCPSC</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function(){
      requestAnimationFrame(function(){
        setTimeout(function(){ window.print(); }, 600);
      });
    });
  <\/script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

/* keep admin re-rendering on auth changes (Firebase restores session) */
Store.onAuth(async u => {
  if (u && currentRoute() === "admin") {
    if (!Store._profile) await Store.getProfile();
    if (!App.regs || !App.regs.length) { try { App.regs = await Store.listRegs(); } catch (e) { } }
    App.isAdmin = true;
    refreshCurrentTab();
  }
});

