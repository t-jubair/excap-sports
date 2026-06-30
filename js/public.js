/* ============================================================
   EX-CAP Sports — public.js
   Home + info pages + all registration flows.
   ============================================================ */

/* ---------- form primitives ---------- */
function field(id, label, o = {}) {
  const { type = "text", ph = "", req = false, help = "", options, val = "" } = o;
  const lab = label ? `<label class="fl" for="${id}">${esc(label)} ${req ? '<span class="req">*</span>' : '<span class="opt">(optional)</span>'}</label>` : "";
  const helpEl = help ? `<div class="help">${esc(help)}</div>` : "";
  let input;
  if (type === "select") input = `<select id="${id}">${options.map(op => `<option ${op === val ? "selected" : ""}>${esc(op)}</option>`).join("")}</select>`;
  else if (type === "textarea") input = `<textarea id="${id}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;
  else input = `<input id="${id}" type="${type}" placeholder="${esc(ph)}" value="${esc(val)}">`;
  return `<div class="fld">${lab}${helpEl}${input}<div class="field-err" id="${id}-err"></div></div>`;
}
function uploader(id, label, note = "PNG/JPG · max 5MB") {
  return `<div class="fld"><label class="fl">${esc(label)} <span class="opt">(optional)</span></label>
  <div class="uploader" onclick="$('#${id}').click()"><div class="prev" id="${id}-prev">📷</div>
  <div class="ut"><b id="${id}-name">Click to upload</b><span>${note}</span></div></div>
  <input id="${id}" type="file" accept="image/*" class="hidden" onchange="handleUpload(event,'${id}')"></div>`;
}
const uploadData = {};
function handleUpload(e, id) {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024 && !window.processImage) { toast("Image too large — keep under 5 MB", "warn"); e.target.value = ""; return; }
  const apply = (d) => { uploadData[id] = d; const p = $("#" + id + "-prev"); if (p) p.innerHTML = `<img src="${d}">`; const n = $("#" + id + "-name"); if (n) n.textContent = (f.name || "image").slice(0, 22); };
  if (window.processImage) { processImage(f, 640, (d, err) => { if (!d) { toast(err || "Could not read image", "warn"); return; } apply(d); }); }
  else { const rd = new FileReader(); rd.onload = () => apply(rd.result); rd.readAsDataURL(f); }
  e.target.value = "";
}
const val = id => { const e = $("#" + id); return e ? e.value.trim() : ""; };
function setErr(id, msg) { const e = $("#" + id), er = $("#" + id + "-err"); if (e) e.classList.toggle("err", !!msg); if (er) { er.textContent = msg || ""; er.classList.toggle("show", !!msg); } }
function validate(rules) { let ok = true, first = null; for (const [id, test, msg] of rules) { const bad = !test(val(id)); setErr(id, bad ? msg : ""); if (bad) { ok = false; first = first || id; } } if (first) { const e = $("#" + first); e && e.scrollIntoView({ behavior: "smooth", block: "center" }); } return ok; }
const isPhone = v => /^01[3-9]\d{8}$/.test(v.replace(/\D/g, "")) || /^\d{6,15}$/.test(v.replace(/\D/g, ""));
const nonEmpty = v => v.length > 0;
const isEmail = v => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
function stepsBar(steps, active) { return `<div class="steps">${steps.map((s, i) => `<div class="step ${i === active ? 'active' : ''} ${i < active ? 'done' : ''}"><div class="b">${i < active ? '✓' : i + 1}</div>${s}</div>${i < steps.length - 1 ? '<div class="sep"></div>' : ''}`).join("")}</div>`; }

/* phase helper: is registration open? */
function regPhase() {
  const now = Date.now(), open = new Date(App.settings.regOpen).getTime(), close = new Date(App.settings.regDeadline).getTime();
  if (now < open) return "before";
  if (now > close) return "closed";
  return "open";
}
/* per-type override: admin can pause/close a specific registration type */
function regStatusFor(type) { const rs = (App.settings && App.settings.regStatus) || cfg.settings.regStatus || {}; return rs[type] || "open"; }
function regPhaseFor(type) {
  const st = regStatusFor(type);
  if (st === "paused") return "paused";
  if (st === "closed") return "closed";
  return regPhase();
}
function phaseLabel(p) { return p === "open" ? "Open" : p === "before" ? "Opening soon" : p === "paused" ? "Paused" : "Closed"; }
const REG_YEARS = (() => { const a = []; for (let y = 2032; y >= 1977; y--)a.push(String(y)); return a; })();
function regGate(type) {
  const p = regPhaseFor(type);
  if (p === "open") return null;
  const msg = {
    before: ["Registration opens soon", "This registration opens on " + fmtDate(App.settings.regOpen) + ".", "🕓"],
    paused: ["Registration paused", "This registration is temporarily paused by the organizers. Please check back shortly.", "⏸️"],
    closed: ["Registration closed", "This registration is now closed. Contact the organizers if you need help.", "🔒"]
  }[p];
  renderInfo(msg[0], msg[1], msg[2]);
  return true;
}

/* small batch field helper — TWO independent SSC + HSC year selects */
function batchFields(idPrefix, d = {}) {
  return `<div class="fld"><label class="fl">SSC batch (year) <span class="opt">(optional)</span></label>
    <select id="${idPrefix}-ssc">${["", ...REG_YEARS].map(y => `<option value="${y}" ${d.sscBatch === y ? "selected" : ""}>${y || "Select SSC year"}</option>`).join("")}</select></div>
  <div class="fld"><label class="fl">HSC batch (year) <span class="opt">(optional)</span></label>
    <select id="${idPrefix}-hsc">${["", ...REG_YEARS].map(y => `<option value="${y}" ${d.hscBatch === y ? "selected" : ""}>${y || "Select HSC year"}</option>`).join("")}</select></div>`;
}

/* ============================================================
   HOME
   ============================================================ */
const REG_TYPES = [
  ["⚽", "Register a team", "For captains. Build your squad, invite guests and pay via bKash.", [["Approval", "By organizers"], ["You get", "Team + player passes"]], "register-team", "From captains building a squad"],
  ["🎟️", "Team guest", "For supporters and alumni — free entry, get a QR pass for the gate.", [["Approval", "Yes"], ["You get", "Guest QR pass"]], "register-guest", "Alumni & supporters"],
  ["🤝", "Volunteer", "Join the crew that runs match day. Pick a role; organizers assign your zone and shift.", [["Approval", "By organizers"], ["You get", "Crew pass + duty"]], "register-volunteer", "Help run match day"]
];

/* ============================================================
   MAINTENANCE / COMING-SOON HOLDING PAGE (public, while building)
   ============================================================ */
function renderMaintenance() {
  const s = App.settings, c = cfg.contact, clubs = getClubs();
  const phase = regPhase();
  $("#app").innerHTML = `
  <div class="maint">
    <div class="maint-bg" aria-hidden="true">${pitchLines()}</div>
    <span class="maint-ball b1">⚽</span><span class="maint-ball b2">⚽</span>
    <div class="maint-card">
      <div class="maint-logos">
        <span class="maint-logo">${logoImg("scpsc", "SC")}</span>
        <span class="maint-logo big">${logoImg("tournament", "FT")}</span>
        <span class="maint-logo">${logoImg("excap", "EX")}</span>
      </div>
      <div class="maint-badge"><span class="md-dot"></span> Getting the pitch ready</div>
      <h1>The EX-CAP field is<br><span class="g">almost ready</span></h1>
      <p class="maint-lead">We're putting the final touches on the official ${esc(s.tournamentName || "EX-CAP Football Tournament")} ${esc(s.edition || "")} site — registrations, live scoreboard, fixtures and check-in are warming up. Kick-off soon.</p>

      <div class="maint-counters">
        <div class="mc-block">
          <div class="mc-label">${phase === "before" ? "Registration opens in" : phase === "open" ? "Registration closes in" : "Registration closed"}</div>
          <div class="maint-cd ${phase === "closed" ? "is-off" : ""}" id="maint-cd-reg">${["Days", "Hrs", "Min", "Sec"].map(k => `<div class="cd-cell"><div class="v num">--</div><div class="k">${k}</div></div>`).join("")}</div>
        </div>
        <div class="mc-block">
          <div class="mc-label">Match day kicks off in</div>
          <div class="maint-cd" id="maint-cd-match">${["Days", "Hrs", "Min", "Sec"].map(k => `<div class="cd-cell"><div class="v num">--</div><div class="k">${k}</div></div>`).join("")}</div>
        </div>
      </div>
      <div class="maint-cap">${fmtDate(s.tournamentDate)} · ${esc(s.venue || "SCPSC field")}</div>

      <form class="maint-notify" onsubmit="maintNotify(event)">
        <input id="maint-email" type="email" placeholder="Email me when it's live" autocomplete="email">
        <button class="btn btn-primary" type="submit">Notify me</button>
      </form>

      <div class="maint-socials">${socialLinks(cfg.socials, "soc")}</div>

      <div class="maint-foot">
        <a class="maint-link" onclick="go('admin')">🔐 Organizer login</a>
        <span class="dotsep">·</span>
        <a class="maint-link" href="mailto:${esc(c.email)}">Contact us</a>
        <span class="dotsep">·</span>
        <a class="maint-link" href="https://excapscpsc.com" target="_blank" rel="noopener">EX-CAP main site ↗</a>
      </div>
    </div>

    <div class="maint-eco">
      <div class="me-block">
        <div class="me-head">Organized by</div>
        <div class="me-org"><span class="me-logo">${logoImg("excap", "EX")}</span><div><b>EX-CAP</b><span>Alumni Association of SCPSC</span></div></div>
      </div>
      ${clubs.length ? `<div class="me-block">
        <div class="me-head">Supported by</div>
        <div class="me-clubs">${clubs.map(cl => `<div class="me-club"><span class="me-logo sm">${logoImg(cl.key, initials(cl.name))}</span><div><b>${esc(cl.name)}</b><span>${esc(cl.role || "")}</span></div></div>`).join("")}</div>
      </div>`: ""}
    </div>

    <div class="maint-credit">Played at the ${esc(s.venue || "SCPSC field")} · Developed by ${esc(cfg.developer.name)}</div>
  </div>`+ footerHTML();
  const reg = $("#maint-cd-reg"); if (reg && phase !== "closed") { registerCountdown(reg, phase === "before" ? s.regOpen : s.regDeadline); }
  const mm = $("#maint-cd-match"); if (mm) { registerCountdown(mm, s.tournamentDate); }
}
function maintNotify(e) {
  e.preventDefault();
  const email = ($("#maint-email").value || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Enter a valid email", "warn"); return; }
  try { Store.saveTicket({ id: "NT" + Date.now().toString(36).toUpperCase(), name: "Launch notify", email, message: "Wants to be notified when the site launches.", status: "open", created: Date.now() }); } catch (_) { }
  toast("Thanks — we'll email you at launch!"); $("#maint-email").value = "";
}

registerRoute("home", renderHome);
registerRoute("", renderHome);
function renderHome() {
  const s = App.settings, used = slotsUsed(), confirmedN = confirmedTeams().length;
  const confirmed = confirmedTeams();
  const stats = [[used, "Teams in"], [s.playersPerTeam, "Per squad"], [2, "Fields"], [20, "Min / match"], [getClubs().length, "Clubs"]];
  const phase = regPhase();
  const reg = REG_TYPES;
  $("#app").innerHTML = anncHTML() + navHTML("home") + `
  <section class="hero"><div class="pitch-bg"></div>${pitchLines()}
    <div class="wrap hero-in">
      <div>
        <span class="eyebrow"><span class="live"></span>${phase === "open" ? "Registration open" : phase === "before" ? "Registration opening soon" : "Registration closed"} · ${fmtDate(s.regDeadline)}</span>
        <h1 class="title">The SCPSC field<br><span class="g">is calling again</span></h1>
        <p class="lead">EX-CAP brings students, players, alumni and the SCPSC community together through football. Build your team and play on home ground — open to all, no cap on entries.</p>
        <div class="hero-cta">
          <button class="btn btn-primary" onclick="go('register')">Register now</button>
          <button class="btn btn-ghost" onclick="go('live')">▶ Live scoreboard</button>
          <button class="btn btn-line" onclick="go('tournament')">Tournament info</button>
        </div>
      </div>
      <div class="hero-card">
        <div class="hc-top"><span class="hc-label">Kick-off in</span><span class="pill ok">Live</span></div>
        <div class="cd" id="cd-event">${["Days", "Hours", "Min", "Sec"].map(k => `<div class="cd-cell"><div class="v num">--</div><div class="k">${k}</div></div>`).join("")}</div>
        <div class="cd-cap">until ${fmtDate(s.tournamentDate)} · ${esc(s.venue)}</div>
        <div class="slots">
          <div class="row"><span class="hc-label">Teams registered</span><span class="big num"><b>${used}</b></span></div>
          <div class="row" style="margin-top:6px"><span class="hc-label">Confirmed</span><span class="big num" style="color:var(--pitch)"><b>${confirmedN}</b></span></div>
        </div>
      </div>
    </div>
  </section>

  <div class="ball-band"><div class="line"></div><div class="foot-ball ball-roll"></div></div>

  <section class="block"><div class="wrap">
    <div class="cd-strip">
      <div class="cd-mini ${phase !== "before" ? "done" : ""}" data-fmt="compact"><div class="lbl">Registration opens</div><div class="t">—</div><div class="sub">${fmtDate(s.regOpen)}</div></div>
      <div class="cd-mini ${phase === "closed" ? "done" : ""}" data-fmt="compact"><div class="lbl">Registration closes</div><div class="t">—</div><div class="sub">${fmtDate(s.regDeadline)}</div></div>
      <div class="cd-mini" data-fmt="compact"><div class="lbl">Tournament kick-off</div><div class="t">—</div><div class="sub">${fmtDate(s.tournamentDate)}</div></div>
    </div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap">
    <div class="stats">${stats.map(([v, k]) => `<div class="stat reveal"><div class="v num" data-count="${v}">0</div><div class="k">${k}</div></div>`).join("")}</div>
  </div></section>

  <section class="block" id="home-live-sec" style="padding-top:0;display:none"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Happening now</div><h2 class="sec">Live & latest</h2></div>
      <button class="btn btn-line" onclick="go('live')">Full scoreboard →</button></div>
    <div class="match-grid" id="home-live"></div>
  </div></section>

  <section class="block" id="home-champ-sec" style="padding-top:0;display:none"><div class="wrap" id="home-champ"></div></section>

  <section class="block"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Choose your entry</div><h2 class="sec">Register in minutes</h2><p class="sec-sub">Three clear paths. Every approved registration gets a QR pass for gate check-in.</p></div>
      <button class="btn btn-line" onclick="go('register')">All options →</button></div>
    <div class="reg-quick">${reg.map(([ic, t, desc, meta, r, tag], i) => `
      <button class="rq reveal d${i}" onclick="go('${r}')"><span class="rq-ic">${ic}</span><span class="rq-t">${t}</span><span class="rq-sub">${tag}</span></button>`).join("")}
    </div>
    <div class="center" style="margin-top:22px"><button class="btn btn-primary" onclick="go('register')">Open registration hub →</button></div>
  </div></section>

  <section class="block" style="background:var(--navy-2)"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Teams entering the field</div><h2 class="sec">Confirmed teams</h2><p class="sec-sub">Approved squads appear here automatically. Private details are never shown publicly.</p></div>
      <button class="btn btn-line" onclick="go('teams')">View all teams</button></div>
    <div class="team-grid">${confirmed.length ? confirmed.slice(0, 8).map(teamCard).join("") : `<div class="empty-wall">No confirmed teams yet — be the first to claim a slot.<br><br><button class="btn btn-primary" onclick="go('register-team')">Register your team</button></div>`}</div>
  </div></section>

  <section class="block eco-block"><div class="wrap">
    <div class="section-head" style="justify-content:center;text-align:center"><div>
      <div class="kicker">Organized &amp; supported by</div>
      <h2 class="sec">The people behind it</h2>
      <p class="sec-sub" style="margin:10px auto 0">EX-CAP, the alumni association of SCPSC, organizes the tournament — powered on match day by the SCPSC clubs. Played at the SCPSC field.</p>
    </div></div>

    <div class="ecosystem">
      <div class="eco-row">
        <span class="eco-tag organizer">Organizer</span>
        <div class="eco-node node-org reveal">
          <div class="eco-logo">${logoImg("excap", "EX")}</div>
          <div class="eco-info"><b>EX-CAP</b><span>Alumni Association of SCPSC</span></div>
          <div class="eco-badge">Hosts &amp; runs the tournament</div>
        </div>
        <div class="eco-venue">📍 Played at the <b>${esc(s.venue || "SCPSC field")}</b></div>
      </div>

      <div class="eco-connector"><span class="dotline"></span><em>powered on match day by</em><span class="dotline"></span></div>

      <div class="eco-row">
        <span class="eco-tag clubs">Supporting clubs</span>
        <div class="eco-clubs">
          ${getClubs().map(cl => `
            <div class="eco-club reveal"><div class="eco-logo sm">${logoImg(cl.key, initials(cl.name))}</div>
              <div class="eco-info"><b>${esc(cl.name)}</b><span>${esc(cl.role || "")}</span></div></div>`).join("")}
        </div>
      </div>
    </div>
  </div></section>
  `+ footerHTML();

  registerCountdown($("#cd-event"), s.tournamentDate);
  registerCountdown($$(".cd-mini")[0], s.regOpen);
  registerCountdown($$(".cd-mini")[1], s.regDeadline);
  registerCountdown($$(".cd-mini")[2], s.tournamentDate);

  // live + champions strips (real-time)
  if (window.clearLiveSubs) clearLiveSubs();
  if (window.Store && Store.subscribeMatches) {
    _liveUnsub = Store.subscribeMatches(matches => {
      const sec = $("#home-live-sec"), wrap = $("#home-live"); if (!wrap) return;
      const liveM = matches.filter(m => m.status === "live" || m.status === "halftime");
      const done = matches.filter(m => m.status === "finished").slice(-3).reverse();
      const show = (liveM.length ? liveM : done).slice(0, 3);
      if (show.length) { sec.style.display = ""; wrap.innerHTML = show.map(m => matchCard(m, liveM.length > 0)).join(""); }
      else sec.style.display = "none";
    });
    _resUnsub = Store.subscribeResults(res => {
      const sec = $("#home-champ-sec"), wrap = $("#home-champ"); if (!wrap) return;
      if (res && res.published && res.champion) {
        sec.style.display = "";
        wrap.innerHTML = `<div class="champ-banner"><div class="cb-glow"></div>
          <div class="cb-trophy">🏆</div><div class="cb-label">Champions ${esc(s.edition)}</div>
          <div class="cb-name">${esc(res.champion)}</div>
          ${res.runnerUp ? `<div class="cb-sub">Runners-up · ${esc(res.runnerUp)}</div>` : ""}
          <button class="btn btn-primary" style="margin-top:16px" onclick="go('results')">See all awards →</button></div>`;
      } else sec.style.display = "none";
    });
  }
}
function teamCard(r) {
  const d = r.data || {}, hue = teamHue(d.teamName);
  const st = r.status === "approved" ? ["ok", "Confirmed"] : r.status === "waitlist" ? ["wait", "Waiting list"] : ["rev", "Under review"];
  const batch = [d.sscBatch && "SSC " + d.sscBatch, d.hscBatch && "HSC " + d.hscBatch].filter(Boolean).join(" · ") || d.batch || "";
  return `<div class="team-card reveal">
    <div class="tc-top"><div class="tc-logo" style="background:${d.logo ? 'transparent' : `hsl(${hue} 70% 45%)`}">${d.logo ? `<img src="${d.logo}">` : esc(initials(d.teamName))}</div>
    <div><div class="tc-name">${esc(d.teamName || "Team")}</div><div class="tc-cat">${esc(d.category || "")} ${batch ? "· " + esc(batch) : ""}</div></div></div>
    <div class="tc-row"><span>Captain</span><b>${esc(d.captainName || "—")}</b></div>
    <div class="tc-row"><span>Players</span><b>${(r.playerCount != null ? r.playerCount : (r.players || []).length)}/${App.settings.playersPerTeam}</b></div>
    <div class="tc-row" style="border-bottom:0;padding-bottom:0"><span>Status</span><span class="pill ${st[0]}">${st[1]}</span></div></div>`;
}

/* ============================================================
   TEAMS / TOURNAMENT / HELP
   ============================================================ */
registerRoute("teams", function () {
  const list = teamRegs().filter(r => ["approved", "review", "submitted", "waitlist"].includes(r.status));
  $("#app").innerHTML = anncHTML() + navHTML("teams") + `<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Teams</h1>
    <p class="ph-sub">${confirmedTeams().length} confirmed · ${list.length} total entries</p></div>
    <div class="team-grid">${list.length ? list.map(teamCard).join("") : `<div class="empty-wall">No teams yet.<br><br><button class="btn btn-primary" onclick="go('register-team')">Be the first</button></div>`}</div>
  </div>`+ footerHTML();
});
registerRoute("tournament", function () {
  const s = App.settings;
  const rows = [["Format", "Group stage → knockouts"], ["Teams", "Open — no cap"], ["Squad size", s.playersPerTeam + " players"], ["Fields", "2 (parallel matches)"], ["Match length", "20 minutes"], ["Venue", s.venue], ["Tournament date", fmtDate(s.tournamentDate)], ["Registration", fmtDate(s.regOpen) + " → " + fmtDate(s.regDeadline)]];
  $("#app").innerHTML = anncHTML() + navHTML("tournament") + `<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Tournament format</h1>
    <p class="ph-sub">Groups and fixtures are generated automatically once registration closes.</p></div>
    <div class="form-shell" style="max-width:560px">${rows.map(([k, v]) => `<div class="rv" style="padding:13px 0"><span>${k}</span><b>${esc(String(v))}</b></div>`).join("")}
    <div class="note-box" style="margin-top:20px"><span class="i">📋</span><div>Group draw, fixtures, live scores and the knockout bracket appear here once organizers publish them.</div></div>
    <div class="form-actions" style="justify-content:center"><button class="btn btn-primary" onclick="go('register-team')">Register your team</button></div></div>
  </div>`+ footerHTML();
});
registerRoute("help", function () {
  const s = App.settings;
  const faqs = [
    ["How do I register a team?", `Pick “Register a team”, add team details and at least 4 players, mark your captain (C) and vice-captain (V), pay the entry fee via bKash (enter your sending number and transaction ID), then submit. Organizers approve it and your QR passes activate.`],
    ["What's the entry fee?", `৳${s.teamFee} per team. Pay via bKash to the merchant QR shown during registration, then enter the sending number and transaction ID.`],
    ["Is guest registration free?", `Yes — guest registration is free. You'll get a QR pass to show at the gate.`],
    ["When does registration close?", `${fmtDate(s.regDeadline)}. Contact the organizers if you need help after that.`]
  ];
  $("#app").innerHTML = anncHTML() + navHTML("help") + `<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Help & FAQ</h1></div>
    <div class="form-shell" style="max-width:680px">${faqs.map(([q, a]) => `<div class="review-sec"><h4 style="color:var(--ink);text-transform:none;font-size:15px;font-family:var(--font-body);font-weight:700">${esc(q)}</h4><p style="color:var(--muted);font-size:14px;margin:6px 0 0">${esc(a)}</p></div>`).join("")}
    <div class="note-box"><span class="i">✉️</span><div>Still stuck? Contact organizers at <b>${esc(cfg.contact.email)}</b>.</div></div></div>
  </div>`+ footerHTML();
});

/* ============================================================
   REGISTRATION HUB
   ============================================================ */
let draft = null;
registerRoute("register", function () {
  const s = App.settings, used = slotsUsed(), phase = regPhase();
  $("#app").innerHTML = anncHTML() + navHTML("register") + `
  <div class="wrap page">
    <div class="page-head center">
      <span class="crumb" onclick="go('home')">← Back to home</span>
      <span class="reg-phase ${phase}">${phase === "open" ? "● Registration open" : phase === "before" ? "● Opening soon" : "● Registration closed"}</span>
      <h1 class="ph">How would you like to join?</h1>
      <p class="ph-sub">Pick the option that fits you. Each one opens a short, guided form — and every approved entry gets a QR pass for the gate.</p>
    </div>
    <div class="reg-hub">
      ${REG_TYPES.map(([ic, t, desc, meta, r, tag], i) => {
    const type = r.replace("register-", ""); const p = regPhaseFor(type); const open = p === "open";
    return `<button class="hub-card reveal d${i} ${open ? "" : "disabled"}" onclick="${open ? `go('${r}')` : `toast('This registration is ${phaseLabel(p)}','warn')`}">
          <div class="hub-ic">${ic}</div>
          <div class="hub-body">
            <h3>${t} <span class="hub-status ${p}">${phaseLabel(p)}</span></h3>
            <p>${desc}</p>
            <div class="hub-meta">${meta.map(([a, b]) => `<span>${a}: <b>${b}</b></span>`).join("")}</div>
          </div>
          <div class="hub-go">${open ? "Start" : phaseLabel(p)} <span class="arr">→</span></div>
        </button>`;
  }).join("")}
    </div>
    <div class="reg-note note-box" style="max-width:none;margin-top:22px"><span class="i">🎟️</span>
      <div><b>${used} team${used === 1 ? "" : "s"} registered so far.</b> Guest registration is free. Every entry is approved by the organizers — you'll get an email + SMS and a QR pass once you're in. There's no cap on teams, so bring your squad!</div>
    </div>
  </div>`+ footerHTML();
  observeReveal();
});

/* ============================================================
   TEAM REGISTRATION (multi-step)
   ============================================================ */
registerRoute("register-team", () => renderTeamReg());
function renderTeamReg(step) {
  const s = App.settings;
  if (regGate("team")) return;
  draft = draft || { data: {}, players: Array.from({ length: s.playersPerTeam }, () => ({ status: "empty" })), guests: [], payment: { mode: "bkash" }, step: 0, captainIdx: 0, viceIdx: 1 };
  const st = typeof step === "number" ? step : draft.step; draft.step = st;
  const steps = ["Team", "Players", "Payment", "Review"];
  const shell = inner => anncHTML() + navHTML("register") + `<div class="wrap page"><div class="page-head">
    <span class="crumb" onclick="go('register')">← All options</span><h1 class="ph">Register a team</h1>
    <p class="ph-sub">${s.playersPerTeam} players · entry fee ৳${esc(s.teamFee)} · approval by organizers.</p></div>
    <div class="form-shell">${stepsBar(steps, st)}${inner}</div></div>` + footerHTML();

  if (st === 0) {
    const d = draft.data;
    $("#app").innerHTML = shell(`
      <div class="fsec-h">Team identity</div>
      ${field("t-name", "Team name", { req: true, ph: "e.g. Batch '18 United", val: d.teamName })}
      ${field("t-cat", "Category", { type: "select", options: ["Alumni", "Current", "Mixed"], val: d.category })}
      <div class="grid2">
        ${batchFields("t", d)}
      </div>

      <div class="fsec-h">Team contact <span class="fsec-sub">(manages this registration)</span></div>
      ${field("t-contact", "Contact name", { req: true, val: d.contactName })}
      <div class="grid2">
        ${field("t-phone", "Contact mobile", { type: "tel", req: true, ph: "01XXXXXXXXX", val: draft.capPhone })}
        ${field("t-email", "Contact email", { type: "email", req: true, ph: "captain@email.com", val: draft.capEmail })}
      </div>

      <div class="fsec-h">Team logo <span class="fsec-sub">(optional — you can add it later)</span></div>
      ${uploader("t-logo", "Team logo")}

      <div class="form-actions"><button class="btn btn-ghost" onclick="go('register')">← Cancel</button><button class="btn btn-primary" onclick="teamStep0()">Continue →</button></div>`);
    if (d.logo) $("#t-logo-prev").innerHTML = `<img src="${d.logo}">`;
  } else if (st === 1) {
    $("#app").innerHTML = shell(`
      <div class="note-box"><span class="i">👥</span><div>Add each player's name and mobile, then pick your <b>captain (C)</b> and <b>vice-captain (V)</b>. Add at least 4 to continue.</div></div>
      <div id="players">${draft.players.map((p, i) => playerRow(p, i)).join("")}</div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(0)">← Back</button><button class="btn btn-primary" onclick="teamStep1()">Continue →</button></div>`);
  } else if (st === 2) {
    $("#app").innerHTML = shell(`
      <div class="note-box"><span class="i">💳</span><div>Entry fee: <b>৳${esc(s.teamFee)}</b>. Pay via <b>bKash</b> — scan the merchant QR below, then enter your <b>sending number</b> and <b>transaction ID</b>.</div></div>
      <div id="pay-body"></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(1)">← Back</button><button class="btn btn-primary" onclick="teamStep2()">Continue →</button></div>`);
    selectPay("bkash");
  } else if (st === 3) {
    const d = draft.data, filled = draft.players.filter(p => p.name);
    const capN = (draft.players[draft.captainIdx] || {}).name || d.contactName || "—";
    const viceN = (draft.players[draft.viceIdx] || {}).name || "—";
    const batchSummary = [d.sscBatch && "SSC " + d.sscBatch, d.hscBatch && "HSC " + d.hscBatch].filter(Boolean).join(" · ") || "—";
    $("#app").innerHTML = shell(`
      <div class="review-sec"><h4>Team</h4>
        <div class="rv"><span>Name</span><b>${esc(d.teamName)}</b></div>
        <div class="rv"><span>Category</span><b>${esc(d.category || "—")}</b></div>
        <div class="rv"><span>Batch</span><b>${esc(batchSummary)}</b></div>
        <div class="rv"><span>Captain</span><b>${esc(capN)}</b></div>
        <div class="rv"><span>Vice-captain</span><b>${esc(viceN)}</b></div>
        <div class="rv"><span>Contact</span><b>${esc(d.contactName || "")} · ${esc(draft.capPhone)}</b></div></div>
      <div class="review-sec"><h4>Roster (${filled.length}/${s.playersPerTeam})</h4>${draft.players.map((p, i) => `<div class="rv"><span>Player ${i + 1}${i === draft.captainIdx ? " (C)" : i === draft.viceIdx ? " (V)" : ""}</span><b>${p.name ? esc(p.name) : '<span style="color:var(--amber)">empty</span>'}</b></div>`).join("")}</div>
      <div class="review-sec"><h4>Payment</h4>
        <div class="rv"><span>Method</span><b>bKash</b></div>
        <div class="rv"><span>Sender number</span><b>${esc(draft.payment.sender || "—")}</b></div>
        <div class="rv"><span>Transaction ID</span><b>${esc(draft.payment.txn || "—")}</b></div>
        <div class="rv"><span>Amount</span><b>৳${esc(s.teamFee)}</b></div></div>
      <div class="note-box"><span class="i">✓</span><div>By submitting you confirm the roster is accurate and your team accepts the tournament rules.</div></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="renderTeamReg(2)">← Back</button><button class="btn btn-pitch" id="submit-btn" onclick="teamSubmit()">Submit registration ✓</button></div>`);
  }
}
function playerRow(p, i) {
  return `<div class="player-row pr-cv"><div class="pn">${i + 1}</div>
  <input placeholder="Player ${i + 1} name" value="${esc(p.name || '')}" oninput="draft.players[${i}].name=this.value">
  <input placeholder="Mobile" value="${esc(p.phone || '')}" oninput="draft.players[${i}].phone=this.value">
  <div class="cv"><button type="button" class="cvb ${draft.captainIdx === i ? 'on c' : ''}" title="Captain" onclick="setCV('c',${i})">C</button><button type="button" class="cvb ${draft.viceIdx === i ? 'on v' : ''}" title="Vice-captain" onclick="setCV('v',${i})">V</button></div></div>`;
}
function setCV(role, i) {
  if (role === "c") { draft.captainIdx = i; if (draft.viceIdx === i) draft.viceIdx = -1; }
  else { draft.viceIdx = i; if (draft.captainIdx === i) draft.captainIdx = -1; }
  const box = $("#players"); if (box) box.innerHTML = draft.players.map((p, idx) => playerRow(p, idx)).join("");
}

function selectPay(mode) {
  draft.payment.mode = "bkash";
  const body = $("#pay-body"); if (!body) return;
  const s = App.settings;
  body.innerHTML = `
    <div class="bkash-pay">
      <div class="bkash-qr">${s.bkashQR ? `<img src="${s.bkashQR}" alt="bKash merchant QR">` : `<div class="qr-empty">Merchant QR will appear here<br><small>Admin uploads it in the panel</small></div>`}</div>
      <div class="bkash-info">
        <div class="note-box" style="margin:0 0 12px"><span class="i">📲</span><div>Scan the merchant QR in your bKash app${s.bkashNumber ? ` (or send to <b>${esc(s.bkashNumber)}</b>)` : ""}, pay <b>৳${esc(s.teamFee)}</b>, then fill in the details below.</div></div>
        ${field("p-sender", "Sender number (you paid from)", { type: "tel", req: true, ph: "01XXXXXXXXX", val: draft.payment.sender })}
        ${field("p-txn", "bKash Transaction ID", { req: true, ph: "e.g. 9X8Y7Z6A", val: draft.payment.txn, help: "From your bKash confirmation SMS." })}
      </div>
    </div>`;
}
function teamStep0() {
  if (!validate([["t-name", nonEmpty, "Team name is required"], ["t-contact", nonEmpty, "Contact name is required"], ["t-phone", isPhone, "Enter a valid mobile number"], ["t-email", isEmail, "Enter a valid email"]])) return;
  if (teamRegs().some(r => (r.data.teamName || "").toLowerCase() === val("t-name").toLowerCase())) { setErr("t-name", "A team with this name already exists"); return; }
  draft.capPhone = val("t-phone"); draft.capEmail = val("t-email");
  draft.data = {
    teamName: val("t-name"),
    category: val("t-cat"),
    sscBatch: val("t-ssc"),
    hscBatch: val("t-hsc"),
    contactName: val("t-contact"),
    captainPhone: draft.capPhone,
    email: draft.capEmail,
    logo: uploadData["t-logo"] || draft.data.logo || ""    // optional — never blocks submit
  };
  renderTeamReg(1);
}
function teamStep1() {
  const filled = draft.players.filter(p => p.name);
  if (filled.length < 4) { toast("Add at least 4 players", "warn"); return; }
  if (draft.captainIdx < 0 || !draft.players[draft.captainIdx] || !draft.players[draft.captainIdx].name) { toast("Pick your captain (C)", "warn"); return; }
  renderTeamReg(2);
}
function teamStep2() {
  const sender = (val("p-sender") || "").trim();
  const txn = (val("p-txn") || "").trim();
  if (!sender) { toast("Enter the sending number you paid from", "warn"); setErr("p-sender", "Required"); return; }
  if (!txn) { toast("Enter the bKash transaction ID", "warn"); setErr("p-txn", "Required"); return; }
  draft.payment = { mode: "bkash", method: "bKash", txn, sender };
  renderTeamReg(3);
}
async function teamSubmit() {
  const btn = $("#submit-btn"); if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
  const s = App.settings;
  let id;
  try { id = await Promise.race([Store.nextId("team", "EXCAP-FT" + s.edition.slice(-2) + "-T", 3), new Promise((_, rej) => setTimeout(() => rej("t"), 6000))]); }
  catch (e) { id = "EXCAP-FT" + s.edition.slice(-2) + "-T" + Date.now().toString(36).toUpperCase().slice(-5); }
  const cap = draft.players[draft.captainIdx] || {}, vice = draft.players[draft.viceIdx] || {};
  const data = Object.assign({}, draft.data, { captainName: cap.name || draft.data.contactName || "", viceName: vice.name || "" });
  const rec = {
    id, type: "team", status: "review", created: Date.now(),
    data, captainEmail: draft.capEmail,
    players: draft.players.filter(p => p.name).map((p, i) => ({ name: p.name, phone: p.phone, role: i === draft.captainIdx ? "Captain" : i === draft.viceIdx ? "Vice-captain" : "Player", status: "registered" })),
    guests: [],
    payment: draft.payment,
    paymentStatus: draft.payment.txn ? "submitted" : "pending",
    contact: draft.capPhone
  };
  try { await Store.saveReg(rec); }
  catch (e) {
    toast("Could not submit — please try again", "err");
    if (btn) { btn.disabled = false; btn.innerHTML = "Submit registration ✓"; }
    return;
  }
  App.regs.unshift(rec);
  try { App.publicTeams = await Store.listPublicTeams(); } catch (e) { }
  const saved = rec; draft = null; renderConfirm("team", saved);
}

/* ============================================================
   GUEST  (free)
   ============================================================ */
registerRoute("register-guest", function () {
  if (regGate("guest")) return;
  $("#app").innerHTML = anncHTML() + navHTML("register") + `<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('register')">← All options</span>
    <h1 class="ph">Guest registration <span class="free-chip">FREE</span></h1><p class="ph-sub">For alumni guests and supporters. Free entry — you'll get a QR pass for the gate.</p></div>
    <div class="form-shell">
      <div class="note-box"><span class="i">🎉</span><div><b>Guest registration is free.</b> Fill this in and you'll receive a QR pass to show at the gate.</div></div>

      <div class="fsec-h">Your details</div>
      ${field("g-name", "Full name", { req: true })}
      <div class="grid2">
        ${field("g-phone", "Mobile", { type: "tel", req: true, ph: "01XXXXXXXXX" })}
        ${field("g-email", "Email", { type: "email", req: true })}
      </div>

      <div class="fsec-h">Batch</div>
      <div class="grid2">
        ${batchFields("g")}
      </div>

      ${uploader("g-photo", "Photo")}

      <div class="form-actions"><button class="btn btn-ghost" onclick="go('register')">← Cancel</button><button class="btn btn-pitch" id="submit-btn" onclick="submitGuest()">Submit ✓</button></div></div>
  </div>`+ footerHTML();
});
async function submitGuest() {
  if (!validate([["g-name", nonEmpty, "Name required"], ["g-phone", isPhone, "Valid mobile required"], ["g-email", isEmail, "Valid email required"]])) return;
  const btn = $("#submit-btn"); if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
  let id;
  try { id = await Promise.race([Store.nextId("guest", "EXCAP-FT" + App.settings.edition.slice(-2) + "-G", 4), new Promise((_, rej) => setTimeout(() => rej("t"), 6000))]); }
  catch (e) { id = "EXCAP-FT" + App.settings.edition.slice(-2) + "-G" + Date.now().toString(36).toUpperCase().slice(-5); }
  const rec = {
    id, type: "guest", status: "review", created: Date.now(),
    data: { name: val("g-name"), category: "Alumni", sscBatch: val("g-ssc"), hscBatch: val("g-hsc"), email: val("g-email"), photo: uploadData["g-photo"] || "" },
    contact: val("g-phone")
  };
  try { await Store.saveReg(rec); }
  catch (e) { toast("Could not submit — please try again", "err"); if (btn) { btn.disabled = false; btn.innerHTML = "Submit ✓"; } return; }
  App.regs.unshift(rec); renderConfirm("guest", rec);
}

/* ============================================================
   VISITOR  (kept for completeness; same SSC+HSC fields as guest)
   ============================================================ */
registerRoute("register-visitor", function () {
  if (regGate("visitor")) return;
  $("#app").innerHTML = anncHTML() + navHTML("register") + `<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
    <h1 class="ph">Visitor registration <span class="free-chip">FREE</span></h1><p class="ph-sub">For alumni, guardians, club reps and supporters not attached to a team.</p></div>
    <div class="form-shell">
      <div class="fsec-h">Your details</div>
      ${field("v-name", "Full name", { req: true })}
      <div class="grid2">
        ${field("v-phone", "Mobile", { type: "tel", req: true, ph: "01XXXXXXXXX" })}
        ${field("v-email", "Email", { type: "email" })}
      </div>
      ${field("v-cat", "Category", { type: "select", options: ["EX-CAP member", "Ex-student", "Parent / guardian", "Invited guest", "Club representative", "General supporter", "Other"] })}

      <div class="fsec-h">Batch</div>
      <div class="grid2">
        ${batchFields("v")}
      </div>

      ${uploader("v-photo", "Photo")}
      ${field("v-rules", "Event rules", { type: "select", options: ["I accept the event rules", "I do not accept"], help: "Required" })}

      <div class="form-actions"><button class="btn btn-ghost" onclick="go('home')">← Cancel</button><button class="btn btn-pitch" id="submit-btn" onclick="submitVisitor()">Submit ✓</button></div></div>
  </div>`+ footerHTML();
});
async function submitVisitor() {
  if (!validate([["v-name", nonEmpty, "Name required"], ["v-phone", isPhone, "Valid mobile required"], ["v-email", isEmail, "Valid email"]])) return;
  if ($("#v-rules").value.startsWith("I do not")) { toast("You must accept the event rules", "warn"); return; }
  const btn = $("#submit-btn"); btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  let id;
  try { id = await Store.nextId("visitor", "EXCAP-FT" + App.settings.edition.slice(-2) + "-V", 4); }
  catch (e) { id = "EXCAP-FT" + App.settings.edition.slice(-2) + "-V" + Date.now().toString(36).toUpperCase().slice(-5); }
  const rec = {
    id, type: "visitor", status: "review", created: Date.now(),
    data: { name: val("v-name"), category: val("v-cat"), sscBatch: val("v-ssc"), hscBatch: val("v-hsc"), email: val("v-email"), photo: uploadData["v-photo"] || "" },
    contact: val("v-phone")
  };
  try { await Store.saveReg(rec); }
  catch (e) { toast("Could not submit — please try again", "err"); if (btn) { btn.disabled = false; btn.innerHTML = "Submit ✓"; } return; }
  App.regs.unshift(rec); renderConfirm("visitor", rec);
}

/* ============================================================
   VOLUNTEER
   ============================================================ */
registerRoute("register-volunteer", function () {
  if (regGate("volunteer")) return;
  const roles = App.settings.volunteerRoles || [];
  $("#app").innerHTML = anncHTML() + navHTML("register") + `<div class="wrap page"><div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
    <h1 class="ph">Volunteer registration</h1><p class="ph-sub">Join the crew that makes match day run. Organizers review and assign you a role and zone.</p></div>
    <div class="form-shell">
      <div class="note-box"><span class="i">🤝</span><div>Tell us where you'd like to help. You'll get an email + SMS once an organizer confirms your role and shift.</div></div>

      <div class="fsec-h">Your details</div>
      ${field("vol-name", "Full name", { req: true })}
      <div class="grid2">
        ${field("vol-phone", "Mobile", { type: "tel", req: true, ph: "01XXXXXXXXX" })}
        ${field("vol-email", "Email", { type: "email", help: "Confirmation is sent here." })}
      </div>

      <div class="fsec-h">Role & shift</div>
      <div class="grid2">
        ${field("vol-role", "Preferred role", { type: "select", options: roles })}
        ${field("vol-avail", "Availability", { type: "select", options: ["Full day", "Morning only", "Afternoon only", "Flexible"] })}
      </div>
      <div class="grid2">
        ${field("vol-batch", "SCPSC batch (if any)", { ph: "2018" })}
        ${field("vol-tshirt", "T-shirt size", { type: "select", options: ["S", "M", "L", "XL", "XXL"] })}
      </div>
      ${field("vol-exp", "Relevant experience", { type: "textarea", ph: "Optional — past events, skills, etc." })}
      ${field("vol-emergency", "Emergency contact", { type: "tel", ph: "Family member's number" })}

      <div class="fsec-h">Finish</div>
      ${uploader("vol-photo", "Photo")}
      ${field("vol-rules", "Volunteer guidelines", { type: "select", options: ["I agree to volunteer guidelines", "I do not agree"], help: "Required" })}

      <div class="form-actions"><button class="btn btn-ghost" onclick="go('home')">← Cancel</button><button class="btn btn-pitch" id="submit-btn" onclick="submitVolunteer()">Submit ✓</button></div></div>
  </div>`+ footerHTML();
});
async function submitVolunteer() {
  if (!validate([["vol-name", nonEmpty, "Name required"], ["vol-phone", isPhone, "Valid mobile required"], ["vol-email", isEmail, "Valid email"]])) return;
  if ($("#vol-rules").value.startsWith("I do not")) { toast("You must agree to the volunteer guidelines", "warn"); return; }
  const btn = $("#submit-btn"); btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  let id;
  try { id = await Store.nextId("volunteer", "EXCAP-FT" + App.settings.edition.slice(-2) + "-VL", 3); }
  catch (e) { id = "EXCAP-FT" + App.settings.edition.slice(-2) + "-VL" + Date.now().toString(36).toUpperCase().slice(-5); }
  const rec = {
    id, type: "volunteer", status: "review", created: Date.now(),
    data: {
      name: val("vol-name"), email: val("vol-email"), preferredRole: val("vol-role"), batch: val("vol-batch"),
      availability: val("vol-avail"), tshirt: val("vol-tshirt"), experience: val("vol-exp"), emergency: val("vol-emergency"), photo: uploadData["vol-photo"] || "",
      assignedRole: "", assignedZone: "", shift: "", dutyStatus: "Pending"
    },
    contact: val("vol-phone")
  };
  try { await Store.saveReg(rec); }
  catch (e) { toast("Could not submit — please try again", "err"); if (btn) { btn.disabled = false; btn.innerHTML = "Submit ✓"; } return; }
  App.regs.unshift(rec); renderConfirm("volunteer", rec);
}

/* ============================================================
   CONFIRMATION + bKash return handling
   ============================================================ */
function renderConfirm(type, rec) {
  window._lastRec = rec;
  const titles = { team: "Team registration submitted", guest: "Guest registration submitted", visitor: "Visitor registration submitted", volunteer: "Volunteer application submitted" };
  const name = rec.data.teamName || rec.data.name || "You";
  const approved = rec.status === "approved";
  const msg = approved ? "You're confirmed. Show this QR pass at the gate." : "Your registration is with the organizers for review. You'll get an email and SMS once it's approved, and your QR pass will activate at the gate.";
  const e = emergencyInfo();
  $("#app").innerHTML = navHTML("") + `<div class="wrap page"><div class="confirm">
    <div class="tick">${approved ? '✓' : '🎉'}</div><h1 class="ph" style="font-size:30px">${titles[type] || "Registration submitted"}</h1>
    <p class="ph-sub" style="margin:12px auto 0;max-width:560px">${msg}</p>
    <div style="margin-top:18px"><div style="font-size:12px;color:var(--muted-2);text-transform:uppercase;letter-spacing:.1em">Your registration ID</div><div class="id-chip">${rec.id}</div></div>
    <div class="ticket"><div class="tk-top"><b>${esc(type)} pass</b><span class="pill ${approved ? 'ok' : 'rev'}" style="background:rgba(255,255,255,.18);color:#fff;border:0">${approved ? 'Confirmed' : 'Pending'}</span></div>
      <div class="tk-body"><div class="qr">${qrSvg(rec.id)}</div><div class="tk-info">
        <div class="l">Name</div><div class="v">${esc(name)}</div>
        <div class="l">Venue · Date</div><div class="v">${esc(App.settings.venue)} · ${fmtDate(App.settings.tournamentDate)}</div>
        <div class="l">ID</div><div class="v num">${rec.id}</div></div></div></div>

    <div class="conf-emerg">
      <div class="ce-ic">🆘</div>
      <div class="ce-tx"><b>Questions about your registration?</b><span>Contact ${esc(e.name || "our team")}${e.role ? " · " + esc(e.role) : ""}</span></div>
      <div class="ce-act">${e.phone ? `<a class="btn btn-sm btn-primary" href="tel:${esc((e.phone || "").replace(/[^\d+]/g, ""))}">📞 Call</a>` : ""}${e.email ? `<a class="btn btn-sm btn-line" href="mailto:${esc(e.email)}">✉ Email</a>` : ""}</div>
    </div>

    <div class="form-actions" style="justify-content:center;margin-top:24px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="downloadRegPdf('${rec.id}')">⤓ Download PDF</button>
      <button class="btn btn-line" onclick="go('home')">Back to home</button>
      ${type === "team" ? `<button class="btn btn-ghost" onclick="go('teams')">View teams</button>` : ""}
    </div>
  </div></div>`+ footerHTML();
}

/* ---- printable registration sheet → PDF (works on member + admin) ---- */
function regSheetHTML(rec) {
  const s = App.settings, d = rec.data || {};
  const passes = [{ code: rec.id, name: d.teamName || d.name || "Registrant", sub: (rec.type || "") + " pass" }];
  if (rec.type === "team") {
    (rec.players || []).forEach((p, i) => passes.push({ code: rec.id + "#P" + (i + 1), name: p.name || ("Player " + (i + 1)), sub: p.role || ("Player " + (i + 1)) }));
    (rec.guests || []).forEach((g, i) => passes.push({ code: rec.id + "#G" + (i + 1), name: g.name || ("Guest " + (i + 1)), sub: "Guest" }));
  }
  const rows = Object.entries(d).filter(([k, v]) => v && !["photo", "logo"].includes(k)).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join("");
  const passHTML = passes.map(p => `<div class="p"><div class="q">${(window.QR && QR.svg) ? QR.svg(p.code) : qrSvg(p.code)}</div><b>${esc(p.name)}</b><span>${esc(p.sub)}</span><small>${esc(p.code)}</small></div>`).join("");
  return `<div class="sheet">
    <h1>${esc(s.tournamentName || "EX-CAP Football Tournament")} ${esc(s.edition || "")}</h1>
    <div class="meta">Registration ID <b>${esc(rec.id)}</b> · Status: ${esc(rec.status)} · ${esc(new Date(rec.created).toLocaleString())}</div>
    <h2>Details</h2><table>${rows}<tr><td>contact</td><td>${esc(rec.contact || "")}</td></tr></table>
    <h2>QR passes — scan at the gate</h2><div class="passes">${passHTML}</div>
    <div class="foot">Venue: ${esc(s.venue || "")} · Date: ${fmtDate(s.tournamentDate)} · Keep this for entry.</div>
  </div>`;
}
function downloadRegPdf(id) {
  const rec = (App.regs || []).find(r => r.id === id) || (window._lastRec && window._lastRec.id === id ? window._lastRec : null);
  if (!rec) { toast("Could not find this registration", "err"); return; }
  const w = window.open("", "_blank");
  if (!w) { toast("Allow pop-ups to download the PDF", "warn"); return; }
  const css = `*{font-family:Arial,Helvetica,sans-serif;color:#111;box-sizing:border-box}.sheet{max-width:720px;margin:0 auto;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#555;border-bottom:1px solid #ddd;padding-bottom:6px;margin:22px 0 10px}.meta{font-size:12px;color:#666;margin-bottom:6px}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:6px 4px;border-bottom:1px solid #eee;text-transform:capitalize}td:first-child{color:#888;width:35%}.passes{display:flex;flex-wrap:wrap;gap:14px}.p{width:150px;border:1px solid #ddd;border-radius:10px;padding:12px;text-align:center}.p .q{width:120px;height:120px;margin:0 auto 8px}.p .q svg{width:100%;height:100%}.p b{display:block;font-size:13px}.p span{font-size:11px;color:#666}.p small{display:block;font-size:9px;color:#999;margin-top:3px;word-break:break-all}.foot{margin-top:20px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px}@media print{@page{margin:12mm}}`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(rec.id)} — EX-CAP</title><style>${css}</style></head><body>${regSheetHTML(rec)}<script>window.onload=function(){setTimeout(function(){window.print();},250);}<\/script></body></html>`);
  w.document.close();
}
function renderInfo(title, msg, icon) {
  $("#app").innerHTML = navHTML("") + `<div class="wrap page"><div class="confirm">
    <div class="tick" style="background:rgba(245,165,36,.14);border-color:var(--amber)">${icon}</div>
    <h1 class="ph" style="font-size:28px">${title}</h1><p class="ph-sub" style="margin:12px auto 0">${msg}</p>
    <div class="form-actions" style="justify-content:center;margin-top:24px"><button class="btn btn-primary" onclick="go('home')">Back to home</button></div>
  </div></div>`+ footerHTML();
}

/* On any page load, if we returned from bKash, finish the payment. */
(async function handleBkashReturn() {
  if (!window.Bkash || !Bkash.readCallback) return;
  const { paymentID, status } = Bkash.readCallback();
  if (!paymentID) return;
  const regId = sessionStorage.getItem("excap_pending_reg");
  history.replaceState({}, "", location.pathname + location.hash);
  if (status !== "success") { toast("bKash payment " + (status || "cancelled"), "warn"); return; }
  try {
    const out = await Bkash.executePayment(paymentID);
    await Store.ready; const rec = await Store.getReg(regId);
    if (rec) { rec.paymentStatus = out.transactionStatus === "Completed" ? "verified" : "pending"; rec.payment.txn = out.trxID || paymentID; await Store.saveReg(rec); }
    toast("bKash payment " + (out.transactionStatus || "received"));
  } catch (e) { toast("Could not confirm bKash payment", "err"); }
})();