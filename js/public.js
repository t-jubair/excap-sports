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
  return `<div class="fld"><label class="fl">SSC batch (year) <span class="opt">*</span></label>
    <select id="${idPrefix}-ssc">${["", ...REG_YEARS].map(y => `<option value="${y}" ${d.sscBatch === y ? "selected" : ""}>${y || "Select SSC year"}</option>`).join("")}</select></div>
  <div class="fld"><label class="fl">HSC batch (year) <span class="opt">*</span></label>
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

  <section class="block at-glance-sec"><div class="wrap">
    <div class="section-head center">
      <div>
        <div class="kicker">At a glance</div>
        <h2 class="sec">The tournament in one view</h2>
        <p class="sec-sub">Key dates, format, prize pool and rules — everything you need before match day.</p>
      </div>
    </div>

    <div class="ag-count-row">
      <div class="ag-count reveal ${phase !== "before" ? "done" : ""}" data-fmt="compact">
        <div class="ag-c-lbl">Registration opens</div>
        <div class="ag-c-val t">—</div>
        <div class="ag-c-sub">${fmtDate(s.regOpen)}</div>
      </div>
      <div class="ag-count reveal d1 ${phase === "closed" ? "done" : ""}" data-fmt="compact">
        <div class="ag-c-lbl">Registration closes</div>
        <div class="ag-c-val t">—</div>
        <div class="ag-c-sub">${fmtDate(s.regDeadline)}</div>
      </div>
      <div class="ag-count reveal d2 accent" data-fmt="compact">
        <div class="ag-c-lbl">Tournament kick-off</div>
        <div class="ag-c-val t">—</div>
        <div class="ag-c-sub">${fmtDate(s.tournamentDate)}</div>
      </div>
    </div>

    <div class="ag-facts">
      <div class="ag-fact reveal"><span class="ag-f-ic">⚽</span><b>7-a-side · Futsal</b><span>20 min · barefoot · Chinese bar goals</span></div>
      <div class="ag-fact reveal d1"><span class="ag-f-ic">🏆</span><b>Prize pool</b><span>Champion · runners-up · Golden Ball · Golden Gloves</span></div>
      <div class="ag-fact reveal d2"><span class="ag-f-ic">👕</span><b>Player kit</b><span>Aprons, wristbands, anklets, gloves — provided</span></div>
      <div class="ag-fact reveal d3"><span class="ag-f-ic">📋</span><b>Fair play</b><span>Full rules + code of conduct on file</span></div>
    </div>

    <div class="ag-links">
      <button class="ag-link reveal" onclick="go('tournament')">
        <span class="ag-l-ic">📖</span>
        <b>Tournament Info</b>
        <span>Format, prize pool, facilities</span>
        <span class="ag-l-arr">→</span>
      </button>
      <button class="ag-link reveal d1" onclick="go('conduct')">
        <span class="ag-l-ic">🤝</span>
        <b>Code of Conduct</b>
        <span>Safety rules & fair play</span>
        <span class="ag-l-arr">→</span>
      </button>
      <button class="ag-link reveal d2" onclick="go('register-team')">
        <span class="ag-l-ic">⚽</span>
        <b>Register a team</b>
        <span>Build your squad</span>
        <span class="ag-l-arr">→</span>
      </button>
      <button class="ag-link reveal d3" onclick="go('register-guest')">
        <span class="ag-l-ic">🎟️</span>
        <b>Guest entry</b>
        <span>Free QR pass</span>
        <span class="ag-l-arr">→</span>
      </button>
    </div>
  </div></section>

  <section class="block" id="home-live-sec" style="padding-top:0;display:none"><div class="wrap">
    <div class="section-head"><div><div class="kicker">Happening now</div><h2 class="sec">Live & latest</h2></div>
      <button class="btn btn-line" onclick="go('live')">Full scoreboard →</button></div>
    <div class="match-grid" id="home-live"></div>
  </div></section>

  <section class="block" id="home-champ-sec" style="padding-top:0;display:none"><div class="wrap" id="home-champ"></div></section>





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
          
        </div>
        <div class="eco-venue">📍 Played at the <b>${esc(s.venue || "SCPSC field")}</b></div>
      </div>

      <div class="eco-connector"><span class="dotline"></span><em></em><span class="dotline"></span></div>

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
  registerCountdown($$(".ag-count")[0], s.regOpen);
  registerCountdown($$(".ag-count")[1], s.regDeadline);
  registerCountdown($$(".ag-count")[2], s.tournamentDate);

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
  $("#app").innerHTML = anncHTML() + navHTML("tournament") + `
    <div class="wrap page tournament-page">
      <div class="page-head">
        <span class="crumb" onclick="go('home')">← Back to home</span>
        <div class="ti-eyebrow">Everything you need to know</div>
        <h1 class="ph">Tournament Info & Rules</h1>
        <p class="ph-sub">Format, rules, prize pool and player facilities for the ${esc(s.tournamentName || "EX-CAP Football Tournament")} ${esc(s.edition || "")}.</p>
      </div>

      <div class="ti-hero">
        <div class="ti-hero-card">
          <div class="ti-hc-lbl">Venue</div>
          <div class="ti-hc-v">${esc(s.venue || "SCPSC field")}</div>
        </div>
        <div class="ti-hero-card">
          <div class="ti-hc-lbl">Match date</div>
          <div class="ti-hc-v">${fmtDate(s.tournamentDate)}</div>
        </div>
        <div class="ti-hero-card">
          <div class="ti-hc-lbl">Squad size</div>
          <div class="ti-hc-v">${s.playersPerTeam} on field</div>
        </div>
        <div class="ti-hero-card">
          <div class="ti-hc-lbl">Match length</div>
          <div class="ti-hc-v">20 minutes</div>
        </div>
      </div>

      <!-- Registration -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">01</span><h2>Registration</h2></div>
        <div class="ti-sec-b">
          <div class="ti-list">
            <div class="ti-li"><span class="ti-dot"></span><div><b>Batch-wise teams</b> get priority in slot allocation.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Multiple teams</b> from a single batch are allowed.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Mixed-batch teams</b> may be considered if slots remain available.</div></div>
          </div>
          <div class="ti-cta">
            <button class="btn btn-primary" onclick="go('register-team')">Register your team →</button>
          </div>
        </div>
      </section>

      <!-- Format -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">02</span><h2>Tournament Format</h2></div>
        <div class="ti-sec-b">
          <div class="ti-grid2">
            <div class="ti-fact"><div class="ti-fact-ic">⚽</div><div><b>Squad</b><span>7 players on field, 4 substitutes</span></div></div>
            <div class="ti-fact"><div class="ti-fact-ic">⏱️</div><div><b>Duration</b><span>20 minutes per match</span></div></div>
            <div class="ti-fact"><div class="ti-fact-ic">📏</div><div><b>Field</b><span>Standard futsal size</span></div></div>
            <div class="ti-fact"><div class="ti-fact-ic">🥅</div><div><b>Goal post</b><span>Chinese bar goals</span></div></div>
            <div class="ti-fact"><div class="ti-fact-ic">👣</div><div><b>Play style</b><span>Matches played barefoot</span></div></div>
            <div class="ti-fact"><div class="ti-fact-ic">🏆</div><div><b>Structure</b><span>Group stage → knockouts → final</span></div></div>
          </div>
          <div class="ti-note">
            <b>Groups are drawn carefully:</b> teams from the same batch will <b>not</b> face each other in the final. Groups will be arranged to keep the bracket fair and exciting.
          </div>
        </div>
      </section>
      
      <!-- Prize Pool -->
      <section class="ti-sec ti-prize-sec">
        <div class="ti-sec-h"><span class="ti-num">03</span><h2>Prize Pool</h2></div>
        <div class="ti-sec-b">
          <div class="prize-grid">
            <div class="prize champ">
              <div class="prize-medal">🥇</div>
              <div class="prize-lbl">Champion</div>
              <div class="prize-sub">Trophy + Medals</div>
            </div>
            <div class="prize runner">
              <div class="prize-medal">🥈</div>
              <div class="prize-lbl">Runners-Up</div>
              <div class="prize-sub">Trophy + Medals</div>
            </div>
          </div>

          <div class="prize-awards">
            <div class="pa"><span class="pa-ic">⚽</span><div><b>Golden Ball</b><span>Top scorer of the tournament</span></div></div>
            <div class="pa"><span class="pa-ic">🧤</span><div><b>Golden Gloves</b><span>Best goalkeeper of the tournament</span></div></div>
            <div class="pa"><span class="pa-ic">🌟</span><div><b>Player of the Tournament</b><span>Standout performer overall</span></div></div>
            <div class="pa"><span class="pa-ic">🏅</span><div><b>Man of the Match</b><span>Crest awarded every match</span></div></div>
          </div>
        </div>
      </section>
      <!-- Fees -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">04</span><h2>Registration Fees</h2></div>
        <div class="ti-sec-b">
          <div class="ti-grid2">
            <div class="ti-fact"><div class="ti-fact-ic">💳</div><div><b>Team entry</b><span>৳${esc(App.settings.teamFee)} per team · pay via bKash</span></div></div>
            <div class="ti-fact"><div class="ti-fact-ic">🎟️</div><div><b>Guest entry</b><span>Free — QR pass for the gate</span></div></div>
          </div>
          <div class="ti-note">
            Team payment is <b>bKash only</b>. Scan the merchant QR shown during registration, then enter your sending number and transaction ID. Organizers verify and approve.
          </div>
        </div>
      </section>
      <!-- Player Facilities -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">04</span><h2>Player Facilities</h2></div>
        <div class="ti-sec-b">
          <p class="ti-lead">Every registered team gets kit and match-day support to make the experience professional and comfortable.</p>
          <div class="fac-grid">
            <div class="fac"><span class="fac-ic">👕</span><div><b>Aprons</b><span>Provided to every team — returnable after each match</span></div></div>
            <div class="fac"><span class="fac-ic">〰️</span><div><b>Wristbands</b><span>For all players</span></div></div>
            <div class="fac"><span class="fac-ic">🦵</span><div><b>Anklets</b><span>For all players</span></div></div>
            <div class="fac"><span class="fac-ic">🧤</span><div><b>Gloves</b><span>8 pairs for goalkeepers</span></div></div>
            <div class="fac"><span class="fac-ic">🍎</span><div><b>Snacks & refreshments</b><span>Provided during match day</span></div></div>
            <div class="fac"><span class="fac-ic">💧</span><div><b>Hydration</b><span>Water available at every match</span></div></div>
          </div>
          <div class="ti-note ti-warn">
            <b>Returnable items:</b> aprons and goalkeeper gloves must be returned <b>after every match</b>. Please keep them clean and undamaged.
          </div>
        </div>
      </section>

      <!-- Schedule -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">05</span><h2>Key dates</h2></div>
        <div class="ti-sec-b">
          <div class="ti-dates">
            <div class="ti-date"><div class="td-lbl">Registration opens</div><div class="td-v">${fmtDate(s.regOpen)}</div></div>
            <div class="ti-date"><div class="td-lbl">Registration closes</div><div class="td-v">${fmtDate(s.regDeadline)}</div></div>
            <div class="ti-date accent"><div class="td-lbl">Match day</div><div class="td-v">${fmtDate(s.tournamentDate)}</div></div>
          </div>
        </div>
      </section>

      <div class="ti-final-cta">
        <h3>Ready to enter the field?</h3>
        <p>Build your squad and claim your slot. Approval is by organizers — you'll get a QR pass for the gate once you're in.</p>
        <div class="row2" style="justify-content:center;flex-wrap:wrap;gap:10px">
          <button class="btn btn-primary" onclick="go('register-team')">Register a team</button>
          <button class="btn btn-line" onclick="go('register-guest')">Guest registration (Free)</button>
          <button class="btn btn-ghost" onclick="emergencyModal()">🆘 Contact organizers</button>
        </div>
      </div>
    </div>` + footerHTML();
});
registerRoute("help", function () {
  const s = App.settings;
  const faqs = [
    ["How do I register a team?", `Pick "Register a team", add team details and at least 6 players, mark your captain (C) and vice-captain (V), pay the entry fee via bKash (enter your sending number and transaction ID), then submit. Organizers approve it and your QR passes activate.`],
    ["What's the entry fee?", `৳${s.teamFee} per team. Pay via bKash to the merchant QR shown during registration, then enter the sending number and transaction ID.`],
    ["Is guest registration free?", `Yes — guest registration is free. You'll get a QR pass to show at the gate.`],
    ["Where can I read the rules?", `Full rules, format, prize pool and player facilities are on the <b class="link-in-faq" onclick="go('tournament')">Tournament Info & Rules</b> page. Player safety and behaviour rules are on the <b class="link-in-faq" onclick="go('conduct')">Code of Conduct & Safety</b> page.`],
    ["When does registration close?", `${fmtDate(s.regDeadline)}. Contact the organizers if you need help after that.`]
  ];
  $("#app").innerHTML = anncHTML() + navHTML("help") + `<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span><h1 class="ph">Help & FAQ</h1></div>
    <div class="form-shell" style="max-width:680px">${faqs.map(([q, a]) => `<div class="review-sec"><h4 style="color:var(--ink);text-transform:none;font-size:15px;font-family:var(--font-body);font-weight:700">${esc(q)}</h4><p style="color:var(--muted);font-size:14px;margin:6px 0 0">${a}</p></div>`).join("")}
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
      <div>Guest registration is free. Every entry is approved by the organizers — you'll get an email + SMS and a QR pass once you're in. There's no cap on teams, so bring your squad!</div>
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
  if (!validate([
    ["t-name", nonEmpty, "Team name is required"],
    ["t-contact", nonEmpty, "Contact name is required"],
    ["t-phone", isPhone, "Enter a valid mobile number"],
    ["t-email", isEmail, "Enter a valid email"],
    ["t-ssc", nonEmpty, "SSC batch year is required"],
    ["t-hsc", nonEmpty, "HSC batch year is required"]
  ])) return;
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
  if (filled.length < 6) { toast("Add at least 6 players", "warn"); return; }
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
    const em = emergencyInfo();
    showModal(`<div class="emerg-card">
      <div class="emerg-ic" style="background:rgba(220,38,38,.12);border-color:#dc2626">⚠️</div>
      <h3>Registration didn't go through</h3>
      <p class="emerg-msg">We couldn't save your registration right now. Please check your internet and try again — or contact us directly and we'll register you manually.</p>
      <div class="emerg-person">
        <div class="ep-ava">${esc(initials(em.name || "EX"))}</div>
        <div><b>${esc(em.name || "")}</b><span>${esc(em.role || "")}</span></div>
      </div>
      <div class="emerg-actions">
        ${em.phone ? `<a class="btn btn-primary" href="tel:${esc((em.phone || "").replace(/[^\\d+]/g, ""))}">📞 Call ${esc(em.phone)}</a>` : ""}
        ${em.email ? `<a class="btn btn-line" href="mailto:${esc(em.email)}">✉ Email us</a>` : ""}
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:6px" onclick="closeModal()">Try again</button>
    </div>`, "narrow");
    if (btn) { btn.disabled = false; btn.innerHTML = "Submit registration ✓"; }
    return;
  }
  App.regs.unshift(rec);
  try { App.publicTeams = await Store.listPublicTeams(); } catch (e) { }
  const saved = rec; draft = null; renderConfirm("team", saved);
  try {
    if (rec.data.email || rec.captainEmail) {
      Notify.sendBroadcastEmail({
        toEmail: rec.data.email || rec.captainEmail,
        toName: rec.data.teamName || rec.data.name || "there",
        subject: "We received your EX-CAP registration",
        message: `Hi,\n\nWe've received your ${rec.type} registration (ID: ${rec.id}). Organizers will review it and confirm shortly. You'll get another email + SMS once approved.\n\n— EX-CAP Team`
      });
    }
    if (rec.contact) {
      Notify.sendSMS({ to: rec.contact, message: `EX-CAP: ${rec.type} registration received. ID ${rec.id}. Approval SMS to follow.` });
    }
  } catch (e) { }
  try {
    const shortId = rec.id.replace("EXCAP-FT26-", "");
    const name = rec.data.teamName || rec.data.name || "there";

    // Email (registration received)
    if (rec.data.email || rec.captainEmail) {
      Notify.sendBroadcastEmail({
        toEmail: rec.data.email || rec.captainEmail,
        toName: name,
        subject: "We received your EX-CAP registration",
        message: `Great news — we've received your ${rec.type} registration (ID: ${rec.id}).\n\nOur organizers will review it and confirm by SMS + email shortly. Once approved, your QR pass activates and you can use it at the gate.\n\nUse the buttons below to download your provisional pass or read the tournament rules.`
      });
    }

    // SMS (registration received) — professional format
    if (rec.contact) {
      const smsBody =
        `Dear ${name},\n\n` +
        `We've received your ${rec.type} registration (${shortId}) for the EX-CAP Football Tournament. ` +
        `Our organizers will review it and confirm shortly by SMS + email.\n\n` +
        `Regards,\nEX-CAP Team`;
      Notify.sendSMS({ to: rec.contact, message: smsBody });
    }
  } catch (e) { console.warn("Post-submit notify failed", e); }
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
  if (!validate([
    ["g-name", nonEmpty, "Name required"],
    ["g-phone", isPhone, "Valid mobile required"],
    ["g-email", isEmail, "Valid email required"],
    ["g-ssc", nonEmpty, "SSC batch year is required"],
    ["g-hsc", nonEmpty, "HSC batch year is required"]
  ])) return;
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
  try {
    if (rec.data.email) {
      Notify.sendBroadcastEmail({
        toEmail: rec.data.email,
        toName: rec.data.name || "there",
        subject: "We received your EX-CAP registration",
        message: `Great news — we've received your guest registration. Your ID is ${rec.id}. You'll get a confirmation email + SMS once organizers approve it, and your QR pass activates at the gate.`
      });
    }
    if (rec.contact) {
      Notify.sendSMS({ to: rec.contact, message: `EX-CAP: Guest registration received. ID ${rec.id}. Approval SMS to follow.` });
    }
  } catch (e) { }
  App.regs.unshift(rec); renderConfirm("guest", rec);
  try {
    const shortId = rec.id.replace("EXCAP-FT26-", "");
    const name = rec.data.teamName || rec.data.name || "there";

    // Email (registration received)
    if (rec.data.email || rec.captainEmail) {
      Notify.sendBroadcastEmail({
        toEmail: rec.data.email || rec.captainEmail,
        toName: name,
        subject: "We received your EX-CAP registration",
        message: `Great news — we've received your ${rec.type} registration (ID: ${rec.id}).\n\nOur organizers will review it and confirm by SMS + email shortly. Once approved, your QR pass activates and you can use it at the gate.\n\nUse the buttons below to download your provisional pass or read the tournament rules.`
      });
    }

    // SMS (registration received) — professional format
    if (rec.contact) {
      const smsBody =
        `Dear ${name},\n\n` +
        `We've received your ${rec.type} registration (${shortId}) for the EX-CAP Football Tournament. ` +
        `Our organizers will review it and confirm shortly by SMS + email.\n\n` +
        `Regards,\nEX-CAP Team`;
      Notify.sendSMS({ to: rec.contact, message: smsBody });
    }
  } catch (e) { console.warn("Post-submit notify failed", e); }
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
registerRoute("conduct", function () {
  $("#app").innerHTML = anncHTML() + navHTML("") + `
    <div class="wrap page tournament-page">
      <div class="page-head">
        <span class="crumb" onclick="go('tournament')">← Tournament info</span>
        <div class="ti-eyebrow">Respect · Safety · Fair Play</div>
        <h1 class="ph">Code of Conduct & Safety</h1>
        <p class="ph-sub">Every player, captain, guest and volunteer accepts these rules on registration. Breaches may lead to disqualification or removal from the tournament.</p>
      </div>

      <!-- Code of conduct -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">01</span><h2>Code of Conduct</h2></div>
        <div class="ti-sec-b">
          <p class="ti-lead">The EX-CAP tournament is an alumni reunion first — a football match second. Please help everyone enjoy it.</p>
          <div class="ti-list">
            <div class="ti-li"><span class="ti-dot"></span><div><b>Respect for all.</b> Treat opponents, referees, organizers, volunteers and spectators with respect at all times.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Zero tolerance for abuse.</b> Verbal, physical, or discriminatory abuse — including insults, threats, or offensive language — will result in immediate removal.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Referee decisions are final.</b> Disputes should be raised calmly by the captain only, after the whistle. No arguing during play.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Fair play.</b> No deliberate fouls, diving, time-wasting, or unsportsmanlike behaviour.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Team responsibility.</b> Captains are responsible for their squad and guests' conduct on and off the pitch.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Facility care.</b> Keep the SCPSC field clean. Bin all waste. Return borrowed items (aprons, gloves) undamaged after the tournament.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>No substances.</b> Smoking, alcohol and any intoxicants are strictly prohibited on the venue.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div><b>Photography.</b> Organizers may photograph or record the event for promotional use. Notify organizers if you wish to opt out.</div></div>
          </div>
        </div>
      </section>

      <!-- Safety rules -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">02</span><h2>Safety Rules</h2></div>
        <div class="ti-sec-b">
          <div class="fac-grid">
            <div class="fac"><span class="fac-ic">👣</span><div><b>Barefoot play</b><span>Matches are played barefoot — no boots, studs or spikes allowed on the field</span></div></div>
            <div class="fac"><span class="fac-ic">🚫</span><div><b>No jewellery</b><span>Remove rings, chains, watches and hard bracelets before entering the field</span></div></div>
            <div class="fac"><span class="fac-ic">🩹</span><div><b>Injury protocol</b><span>Stop play immediately for any injury. First-aid support will be on-site</span></div></div>
            <div class="fac"><span class="fac-ic">🩺</span><div><b>Fitness self-declaration</b><span>Players confirm they are medically fit to play. Inform organizers of any condition</span></div></div>
            <div class="fac"><span class="fac-ic">💧</span><div><b>Stay hydrated</b><span>Water is available at all times. Rest during breaks — no push-through if unwell</span></div></div>
            <div class="fac"><span class="fac-ic">👕</span><div><b>Proper kit</b><span>Wear the provided apron, wristband and anklets during matches</span></div></div>
            <div class="fac"><span class="fac-ic">🧤</span><div><b>Goalkeepers</b><span>Use the provided gloves. Avoid dangerous slides near attackers</span></div></div>
            <div class="fac"><span class="fac-ic">⚠️</span><div><b>No dangerous tackles</b><span>Sliding tackles, high kicks and tackles from behind carry an immediate card</span></div></div>
          </div>
        </div>
      </section>

      <!-- Emergency -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">03</span><h2>Emergency & Reporting</h2></div>
        <div class="ti-sec-b">
          <p class="ti-lead">If anything goes wrong on match day, contact the organizers immediately.</p>
          <div class="ti-note">
            <b>See an injury, a fight, or an unsafe situation?</b> Alert the nearest volunteer or organizer. First-aid support will be on-site throughout the tournament. For serious incidents, contact the emergency lead below.
          </div>
          <div style="text-align:center;margin-top:16px">
            <button class="btn btn-primary" onclick="emergencyModal()">🆘 View emergency contact</button>
          </div>
        </div>
      </section>

      <!-- Acknowledgement -->
      <section class="ti-sec">
        <div class="ti-sec-h"><span class="ti-num">04</span><h2>Acknowledgement</h2></div>
        <div class="ti-sec-b">
          <p class="ti-lead">By registering for the EX-CAP Football Tournament, every player, captain, guest and volunteer accepts:</p>
          <div class="ti-list">
            <div class="ti-li"><span class="ti-dot"></span><div>Full responsibility for their own conduct on and off the pitch.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div>That they are medically fit to participate at their own risk.</div></div>
            <div class="ti-li"><span class="ti-dot"></span><div>All decisions of the organizers on eligibility, disciplinary matters and results are final.</div></div>
          </div>
          <div class="ti-note ti-warn" style="margin-top:12px">
            <b>Serious breaches</b> — violence, harassment, cheating, or damage to property — may lead to immediate disqualification, removal from the venue, and being barred from future EX-CAP events.
          </div>
        </div>
      </section>

      <div class="ti-final-cta">
        <h3>Let's have a great tournament</h3>
        <p>Football at its best — competitive on the pitch, family off it. Thanks for keeping the EX-CAP spirit alive.</p>
        <div class="row2" style="justify-content:center;flex-wrap:wrap;gap:10px">
          <button class="btn btn-primary" onclick="go('tournament')">← Tournament Info & Rules</button>
          <button class="btn btn-line" onclick="go('register-team')">Register a team</button>
        </div>
      </div>
    </div>` + footerHTML();
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
  try {
    const shortId = rec.id.replace("EXCAP-FT26-", "");
    const name = rec.data.teamName || rec.data.name || "there";

    // Email (registration received)
    if (rec.data.email || rec.captainEmail) {
      Notify.sendBroadcastEmail({
        toEmail: rec.data.email || rec.captainEmail,
        toName: name,
        subject: "We received your EX-CAP registration",
        message: `Great news — we've received your ${rec.type} registration (ID: ${rec.id}).\n\nOur organizers will review it and confirm by SMS + email shortly. Once approved, your QR pass activates and you can use it at the gate.\n\nUse the buttons below to download your provisional pass or read the tournament rules.`
      });
    }

    // SMS (registration received) — professional format
    if (rec.contact) {
      const smsBody =
        `Dear ${name},\n\n` +
        `We've received your ${rec.type} registration (${shortId}) for the EX-CAP Football Tournament. ` +
        `Our organizers will review it and confirm shortly by SMS + email.\n\n` +
        `Regards,\nEX-CAP Team`;
      Notify.sendSMS({ to: rec.contact, message: smsBody });
    }
  } catch (e) { console.warn("Post-submit notify failed", e); }
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
  try {
    const shortId = rec.id.replace("EXCAP-FT26-", "");
    const name = rec.data.teamName || rec.data.name || "there";

    // Email (registration received)
    if (rec.data.email || rec.captainEmail) {
      Notify.sendBroadcastEmail({
        toEmail: rec.data.email || rec.captainEmail,
        toName: name,
        subject: "We received your EX-CAP registration",
        message: `Great news — we've received your ${rec.type} registration (ID: ${rec.id}).\n\nOur organizers will review it and confirm by SMS + email shortly. Once approved, your QR pass activates and you can use it at the gate.\n\nUse the buttons below to download your provisional pass or read the tournament rules.`
      });
    }

    // SMS (registration received) — professional format
    if (rec.contact) {
      const smsBody =
        `Dear ${name},\n\n` +
        `We've received your ${rec.type} registration (${shortId}) for the EX-CAP Football Tournament. ` +
        `Our organizers will review it and confirm shortly by SMS + email.\n\n` +
        `Regards,\nEX-CAP Team`;
      Notify.sendSMS({ to: rec.contact, message: smsBody });
    }
  } catch (e) { console.warn("Post-submit notify failed", e); }
}

/* ============================================================
   CONFIRMATION + bKash return handling
   ============================================================ */

// email link entry point: /#confirm-EXCAP-FT26-T001 → shows that reg's confirmation
registerRoute("confirm", function () {
  // hash looks like #confirm-<id>; strip prefix to get the id
  const m = location.hash.match(/^#confirm-(.+)$/);
  const id = m ? decodeURIComponent(m[1]) : "";
  const rec = (App.regs || []).find(r => r.id === id) || (window._lastRec && window._lastRec.id === id ? window._lastRec : null);
  if (!rec) {
    renderInfo("Registration not found", `We couldn't find registration <b>${esc(id)}</b>. If this is your ID, please contact organizers.`, "🔍");
    return;
  }
  renderConfirm(rec.type, rec);
});
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

    <h2>Details</h2>
    <table>${rows}<tr><td>contact</td><td>${esc(rec.contact || "")}</td></tr></table>

    <h2>QR passes — scan at the gate</h2>
    <div class="passes">${passHTML}</div>

    <h2>Tournament essentials</h2>
    <div class="rules-box">
      <b>Format:</b> 7 players on field, 4 substitutes · 20 minutes per match · barefoot play · group stage → knockouts.<br>
      <b>Venue:</b> ${esc(s.venue || "SCPSC field")} · <b>Match date:</b> ${fmtDate(s.tournamentDate)}
    </div>

    <h2>Code of Conduct (summary)</h2>
    <ul class="rl">
      <li>Respect all players, referees, organizers and spectators. Zero tolerance for abuse.</li>
      <li>Referee decisions are final. Disputes only via captain, after the whistle.</li>
      <li>Fair play only — no deliberate fouls, diving, or unsportsmanlike behaviour.</li>
      <li>Captains are responsible for their squad and guests' conduct.</li>
      <li>Keep the venue clean. Return borrowed items (aprons, gloves) undamaged after the tournament.</li>
      <li>Smoking, alcohol and intoxicants are strictly prohibited on the venue.</li>
    </ul>

    <h2>Safety Rules (summary)</h2>
    <ul class="rl">
      <li><b>Barefoot play.</b> No boots, studs or spikes on the field.</li>
      <li><b>Remove jewellery</b> — rings, chains, watches, hard bracelets — before playing.</li>
      <li><b>Stop play for any injury.</b> First-aid support is on-site.</li>
      <li><b>Fitness self-declaration:</b> players confirm they are medically fit to play.</li>
      <li><b>Stay hydrated.</b> Water available at all times.</li>
      <li><b>No dangerous tackles</b> — slides, high kicks, tackles from behind carry an immediate card.</li>
    </ul>

    <div class="foot">
      By registering, you accept the Code of Conduct and Safety Rules in full.<br>
      Full rules: sports.excapscpsc.com/#tournament · Conduct: sports.excapscpsc.com/#conduct<br>
      Venue: ${esc(s.venue || "")} · Date: ${fmtDate(s.tournamentDate)} · Keep this for entry.
    </div>
  </div>`;
}

async function downloadRegPdf(id) {
  const rec = (App.regs || []).find(r => r.id === id) || (window._lastRec && window._lastRec.id === id ? window._lastRec : null);
  if (!rec) { toast("Could not find this registration", "err"); return; }

  // wait up to 5 seconds for html2pdf CDN to finish loading
  if (!window.html2pdf) {
    toast("Loading PDF library…");
    for (let i = 0; i < 50 && !window.html2pdf; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (!window.html2pdf) {
      toast("PDF library couldn't load — check your internet", "err");
      return;
    }
  }

  toast("Preparing PDF…");

  const s = App.settings, d = rec.data || {};
  const name = d.teamName || d.name || "Registrant";
  const email = d.email || rec.captainEmail || "";
  const phone = rec.contact || d.phone || d.captainPhone || "";
  const category = d.category || "";
  const batch = [d.sscBatch && "SSC " + d.sscBatch, d.hscBatch && "HSC " + d.hscBatch].filter(Boolean).join(" · ") || d.batch || "";
  const typeLabel = { team: "Team registration", guest: "Guest pass", visitor: "Visitor pass", volunteer: "Volunteer application", student: "Student pass" }[rec.type] || "Registration";
  const statusLabel = rec.status === "approved" ? "Approved" : rec.status === "review" ? "Under review" : rec.status;
  const statusColor = rec.status === "approved" ? "#16a34a" : "#d97706";

  const passes = [{ code: rec.id, name, sub: typeLabel }];
  if (rec.type === "team") {
    (rec.players || []).forEach((p, i) => passes.push({ code: rec.id + "#P" + (i + 1), name: p.name || ("Player " + (i + 1)), sub: p.role || ("Player " + (i + 1)) }));
    (rec.guests || []).forEach((g, i) => passes.push({ code: rec.id + "#G" + (i + 1), name: g.name || ("Guest " + (i + 1)), sub: "Guest" }));
  }

  const detailRows = [
    ["Name", name],
    rec.type === "team" ? ["Category", category] : null,
    rec.type === "team" ? ["Batch", batch] : null,
    rec.type !== "team" && category ? ["Category", category] : null,
    rec.type !== "team" && batch ? ["Batch", batch] : null,
    d.captainName ? ["Captain", d.captainName] : null,
    d.viceName ? ["Vice-captain", d.viceName] : null,
    d.preferredRole ? ["Preferred role", d.preferredRole] : null,
    d.availability ? ["Availability", d.availability] : null,
    d.tshirt ? ["T-shirt size", d.tshirt] : null,
    ["Phone", phone],
    email ? ["Email", email] : null,
    ["Registration ID", rec.id],
    ["Submitted", new Date(rec.created).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })],
    ["Status", statusLabel]
  ].filter(Boolean);

  const detailHTML = detailRows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(String(v))}</td></tr>`).join("");
  const passHTML = passes.map(p => `<div class="pass"><div class="qr">${(window.QR && QR.svg) ? QR.svg(p.code) : qrSvg(p.code)}</div><div class="pn">${esc(p.name)}</div><div class="ps">${esc(p.sub)}</div><div class="pc">${esc(p.code)}</div></div>`).join("");

  const logoTag = (key) => {
    const up = App.logos && App.logos[key];
    if (up) return `<img class="lg" src="${up}" alt="">`;
    return `<img class="lg" src="${location.origin}/assets/logo-${key}.png" alt="" onerror="this.style.display='none'">`;
  };

  // Build a hidden off-screen container in the CURRENT document (not a popup)
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:0;top:0;width:760px;background:#fff;color:#0f1424;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;z-index:-9999;opacity:0;pointer-events:none";
  container.innerHTML = `
    <div style="max-width:760px;margin:0 auto;background:#fff;border-radius:0;overflow:hidden">

      <div style="position:relative;padding:26px 32px 22px;background:linear-gradient(120deg,#7c3aed,#db2777);color:#fff;overflow:hidden">
        <table role="presentation" style="width:100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:auto;white-space:nowrap;vertical-align:middle">
            ${logoTag("scpsc")}${logoTag("tournament")}${logoTag("excap")}
          </td>
          <td style="vertical-align:middle;padding-left:14px">
            <h1 style="margin:0;font-weight:900;font-size:20px;letter-spacing:-.01em;text-transform:uppercase;color:#fff">${esc(s.tournamentName || "EX-CAP Football Tournament")} ${esc(s.edition || "")}</h1>
            <div style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:4px;color:#fff">${esc(typeLabel)} · ${esc(s.venue || "SCPSC field")}</div>
          </td>
        </tr></table>
        <table role="presentation" style="margin-top:18px;background:rgba(0,0,0,.22);border-radius:12px;width:100%" cellpadding="0" cellspacing="0"><tr>
          <td style="padding:12px 16px;color:#fff">
            <div style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.75">Registration ID</div>
            <div style="font-weight:900;font-size:17px;letter-spacing:.02em">${esc(rec.id)}</div>
          </td>
          <td style="padding:12px 16px;text-align:right">
            <span style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:#fff;color:${statusColor};border-radius:999px;padding:5px 12px;display:inline-block">${esc(statusLabel)}</span>
          </td>
        </tr></table>
      </div>

      <div style="padding:26px 32px 22px">
        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;margin:0 0 10px;border-bottom:2px solid #ece5fa;padding-bottom:6px">Registration details</div>
        <table style="width:100%;border-collapse:collapse">${detailHTML.replace(/<td class="k">/g, '<td style="padding:9px 0;border-bottom:1px solid #eef0f7;color:#6b7280;width:38%;font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:11px">').replace(/<td class="v">/g, '<td style="padding:9px 0;border-bottom:1px solid #eef0f7;color:#0f1424;font-weight:600;text-align:right;font-size:12.5px">')}</table>

        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;margin:22px 0 10px;border-bottom:2px solid #ece5fa;padding-bottom:6px">QR passes — scan at the gate</div>
        <table role="presentation" style="width:100%" cellpadding="0" cellspacing="0"><tr>
          ${passes.map(p => `<td style="width:33.33%;padding:6px;vertical-align:top">
            <div style="background:#fff;border:1px solid #e2e5f0;border-radius:14px;padding:14px 12px;text-align:center">
              <div style="width:150px;height:150px;margin:0 auto 10px;background:#fff;border:1px solid #eceef5;border-radius:10px;padding:8px">${(window.QR && QR.svg) ? QR.svg(p.code) : qrSvg(p.code)}</div>
              <div style="font-family:Arial,sans-serif;font-weight:800;font-size:13px;color:#0f1424">${esc(p.name)}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:capitalize">${esc(p.sub)}</div>
              <div style="font-size:9px;color:#9aa1b4;margin-top:6px;font-family:monospace;word-break:break-all">${esc(p.code)}</div>
            </div>
          </td>`).join("")}
        </tr></table>

        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;margin:22px 0 10px;border-bottom:2px solid #ece5fa;padding-bottom:6px">Tournament essentials</div>
        <div style="background:#f4f6fb;border:1px solid #e2e5f0;border-radius:12px;padding:14px 16px;font-size:12px;line-height:1.7;color:#334155">
          <div><b style="color:#7c3aed">Format:</b> 7-a-side · 4 substitutes · barefoot play</div>
          <div><b style="color:#7c3aed">Duration:</b> 20 minutes per match</div>
          <div><b style="color:#7c3aed">Field:</b> Standard futsal size · Chinese bar goal posts</div>
          <div><b style="color:#7c3aed">Team fee:</b> ৳${esc(s.teamFee)} · bKash only · Guest entry free</div>
          <div><b style="color:#7c3aed">Venue:</b> ${esc(s.venue || "SCPSC field")}</div>
          <div><b style="color:#7c3aed">Match date:</b> ${fmtDate(s.tournamentDate)}</div>
        </div>

        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;margin:22px 0 10px;border-bottom:2px solid #ece5fa;padding-bottom:6px">Code of Conduct</div>
        <ul style="margin:0;padding-left:20px;font-size:12px;line-height:1.7;color:#334155">
          <li>Respect all players, referees, organizers and spectators. Zero tolerance for abuse.</li>
          <li>Referee decisions are final. Disputes only via captain, after the whistle.</li>
          <li>Fair play only — no deliberate fouls, diving, or unsportsmanlike behaviour.</li>
          <li>Captains are responsible for their squad and guests' conduct.</li>
          <li>Aprons and gloves must be returned <b>after every match</b>. Keep them clean and undamaged.</li>
          <li>Smoking, alcohol and intoxicants are strictly prohibited on the venue.</li>
        </ul>

        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;margin:22px 0 10px;border-bottom:2px solid #ece5fa;padding-bottom:6px">Safety Rules</div>
        <ul style="margin:0;padding-left:20px;font-size:12px;line-height:1.7;color:#334155">
          <li><b>Barefoot play.</b> No boots, studs or spikes on the field.</li>
          <li><b>Remove jewellery</b> — rings, chains, watches, hard bracelets — before playing.</li>
          <li><b>Stop play for any injury.</b> First-aid support is on-site.</li>
          <li><b>Fitness self-declaration:</b> players confirm they are medically fit to play.</li>
          <li><b>Stay hydrated.</b> Water available at all times.</li>
          <li><b>No dangerous tackles</b> — slides, high kicks, tackles from behind carry an immediate card.</li>
        </ul>

        <div style="margin-top:18px;padding:12px 16px;background:linear-gradient(120deg,rgba(124,58,237,.06),rgba(219,39,119,.05));border:1px dashed rgba(124,58,237,.35);border-radius:10px;font-size:11.5px;color:#5b6275;line-height:1.6;text-align:center">
          By registering, you accept the Code of Conduct and Safety Rules in full.<br>
          Full details: <b style="color:#7c3aed">sports.excapscpsc.com/#tournament</b>
        </div>
      </div>

      <div style="background:#f7f8fc;padding:16px 32px;border-top:1px solid #eceef5;display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;color:#6b7280">
        <span>Venue: <b style="color:#0f1424">${esc(s.venue || "SCPSC field")}</b> · Date: <b style="color:#0f1424">${fmtDate(s.tournamentDate)}</b> · Keep this for entry.</span>
        <span style="font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7c3aed">EX-CAP · Alumni of SCPSC</span>
      </div>

    </div>
  `;

  // Add logo styling
  const styleEl = document.createElement("style");
  styleEl.textContent = ".lg{width:44px;height:44px;border-radius:11px;background:#fff;padding:5px;object-fit:contain;margin-right:6px;vertical-align:middle;display:inline-block}";
  container.appendChild(styleEl);

  document.body.appendChild(container);

  const filename = `EX-CAP_${rec.id}.pdf`;
  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false, windowWidth: 760 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    document.body.removeChild(container);
    toast("PDF downloaded ✓");
  }).catch(err => {
    document.body.removeChild(container);
    console.error("PDF gen failed", err);
    toast("Could not generate PDF — try again", "err");
  });
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