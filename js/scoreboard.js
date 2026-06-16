/* ============================================================
   EX-CAP Sports — scoreboard.js
   Public live scoreboard, fixtures and champions pages.
   Real-time via Store.subscribeMatches / subscribeResults.
   ============================================================ */
const ROUNDS=["Group","Round of 16","Quarter-final","Semi-final","Third place","Final"];
const STATUS_LABEL={scheduled:"Scheduled",live:"LIVE",halftime:"Half-time",finished:"Full-time"};

let _liveUnsub=null, _resUnsub=null;
function clearLiveSubs(){ if(_liveUnsub){_liveUnsub();_liveUnsub=null;} if(_resUnsub){_resUnsub();_resUnsub=null;} }
window.addEventListener("hashchange",clearLiveSubs);

function teamBadge(id,name,size=44){
  const reg=App.regs.find(r=>r.id===id), logo=reg&&reg.data&&reg.data.logo, hue=teamHue(name);
  return `<div class="mb-badge" style="width:${size}px;height:${size}px;${logo?'':`background:hsl(${hue} 70% 45%)`}">${logo?`<img src="${logo}">`:esc((name||"?").split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase())}</div>`;
}
function matchCard(m,big=false){
  const live=m.status==="live"||m.status==="halftime", done=m.status==="finished";
  const sa=m.scoreA==null?"–":m.scoreA, sb=m.scoreB==null?"–":m.scoreB;
  const winA=done&&m.scoreA>m.scoreB, winB=done&&m.scoreB>m.scoreA;
  return `<div class="match-card ${live?'is-live':''} ${big?'big':''}">
    <div class="mc-top"><span class="mc-round">${esc(m.round||"Group")}${m.group?" · "+esc(m.group):""}</span>
      <span class="mc-status ${m.status}">${live?'<span class="ldot"></span>':''}${STATUS_LABEL[m.status]||m.status}</span></div>
    <div class="mc-body">
      <div class="mc-team ${winA?'win':''}">${teamBadge(m.teamAId,m.teamA,big?56:42)}<b>${esc(m.teamA||"TBD")}</b></div>
      <div class="mc-score"><span class="${live?'pulse-s':''}">${sa}</span><i>:</i><span class="${live?'pulse-s':''}">${sb}</span></div>
      <div class="mc-team right ${winB?'win':''}"><b>${esc(m.teamB||"TBD")}</b>${teamBadge(m.teamBId,m.teamB,big?56:42)}</div>
    </div>
    <div class="mc-foot"><span>${m.kickoff?fmtDateTime(new Date(m.kickoff).getTime()):"Time TBA"}</span><span>${esc(m.field||"")}</span></div>
    ${(m.scorersA&&m.scorersA.length)||(m.scorersB&&m.scorersB.length)?`<div class="mc-scorers"><div>${(m.scorersA||[]).map(s=>`⚽ ${esc(s)}`).join("<br>")}</div><div style="text-align:right">${(m.scorersB||[]).map(s=>`${esc(s)} ⚽`).join("<br>")}</div></div>`:""}
  </div>`;
}

/* ---------- LIVE SCOREBOARD ---------- */
registerRoute("live",renderLive);
function renderLive(){
  $("#app").innerHTML=anncHTML()+navHTML("live")+`<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
      <h1 class="ph">Live scoreboard</h1><p class="ph-sub">Scores update in real time as the organizers record them. No need to refresh.</p></div>
    <div id="live-wrap"><div class="empty-wall">Loading matches…</div></div>
  </div>`+footerHTML();
  clearLiveSubs();
  _liveUnsub=Store.subscribeMatches(matches=>{
    App._matches=matches;
    const liveM=matches.filter(m=>m.status==="live"||m.status==="halftime");
    const done=matches.filter(m=>m.status==="finished").slice(-6).reverse();
    const up=matches.filter(m=>m.status==="scheduled").slice(0,8);
    const wrap=$("#live-wrap"); if(!wrap) return;
    wrap.innerHTML=`
      ${liveM.length?`<div class="live-banner"><span class="ldot"></span> ${liveM.length} match${liveM.length>1?'es':''} live now</div>
        <div class="match-grid big">${liveM.map(m=>matchCard(m,true)).join("")}</div>`:`<div class="note-box" style="max-width:none"><span class="i">⏱️</span><div>No live match right now. Upcoming fixtures and latest results are below.</div></div>`}
      ${up.length?`<h2 class="sec" style="font-size:24px;margin:30px 0 16px">Upcoming</h2><div class="match-grid">${up.map(m=>matchCard(m)).join("")}</div>`:""}
      ${done.length?`<h2 class="sec" style="font-size:24px;margin:30px 0 16px">Latest results</h2><div class="match-grid">${done.map(m=>matchCard(m)).join("")}</div>`:""}
      ${!matches.length?`<div class="empty-wall">Fixtures will appear here once the organizers publish the schedule.</div>`:""}
      <div class="center" style="margin-top:28px"><button class="btn btn-line" onclick="go('fixtures')">Full fixtures →</button> <button class="btn btn-line" onclick="go('results')">Awards & champions →</button></div>`;
  });
}

/* ---------- FIXTURES ---------- */
registerRoute("fixtures",renderFixtures);
function renderFixtures(){
  $("#app").innerHTML=anncHTML()+navHTML("fixtures")+`<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
      <h1 class="ph">Fixtures & schedule</h1><p class="ph-sub">Full match schedule by stage. Tap Live for in-progress scores.</p></div>
    <div id="fx-wrap"><div class="empty-wall">Loading…</div></div>
  </div>`+footerHTML();
  clearLiveSubs();
  _liveUnsub=Store.subscribeMatches(matches=>{
    const wrap=$("#fx-wrap"); if(!wrap) return;
    if(!matches.length){ wrap.innerHTML=`<div class="empty-wall">No fixtures published yet.</div>`; return; }
    const byRound={}; matches.forEach(m=>{ (byRound[m.round||"Group"]=byRound[m.round||"Group"]||[]).push(m); });
    wrap.innerHTML=ROUNDS.filter(r=>byRound[r]).map(r=>`
      <h2 class="sec" style="font-size:22px;margin:8px 0 14px">${r}</h2>
      <div class="match-grid">${byRound[r].map(m=>matchCard(m)).join("")}</div>`).join("");
  });
}

/* ---------- RESULTS / CHAMPIONS ---------- */
registerRoute("results",renderResults);
function renderResults(){
  $("#app").innerHTML=anncHTML()+navHTML("results")+`<div class="wrap page">
    <div class="page-head"><span class="crumb" onclick="go('home')">← Back to home</span>
      <h1 class="ph">Champions & awards</h1><p class="ph-sub">The honours board for EX-CAP ${esc(App.settings.edition)}.</p></div>
    <div id="res-wrap"><div class="empty-wall">Loading…</div></div>
  </div>`+footerHTML();
  clearLiveSubs();
  _resUnsub=Store.subscribeResults(res=>{
    const wrap=$("#res-wrap"); if(!wrap) return;
    if(!res||!res.published){ wrap.innerHTML=`<div class="empty-wall">🏆<br><br>Champions will be crowned here once the final whistle blows.</div>`; return; }
    const podium=[["2",res.runnerUp,"Runner-up","silver"],["1",res.champion,"Champion","gold"],["3",res.thirdPlace,"Third place","bronze"]];
    const awards=[["⚽","Top scorer",res.topScorer],["⭐","Best player",res.bestPlayer],["🧤","Best goalkeeper",res.bestGoalkeeper],["🤝","Fair play",res.fairPlay]].filter(a=>a[2]);
    wrap.innerHTML=`
      <div class="podium">${podium.map(([rank,name,label,cls])=>`
        <div class="pod ${cls} ${rank==='1'?'first':''}">
          <div class="pod-trophy">${rank==='1'?'🏆':rank==='2'?'🥈':'🥉'}</div>
          <div class="pod-name">${esc(name||"—")}</div><div class="pod-label">${label}</div>
          <div class="pod-bar">${rank}</div></div>`).join("")}</div>
      ${awards.length?`<h2 class="sec" style="font-size:22px;margin:36px 0 16px">Individual awards</h2>
      <div class="award-grid">${awards.map(([ic,l,v])=>`<div class="award reveal"><div class="aw-ic">${ic}</div><div><div class="aw-l">${l}</div><div class="aw-v">${esc(v)}</div></div></div>`).join("")}</div>`:""}
      <div class="center" style="margin-top:30px"><button class="btn btn-line" onclick="go('fixtures')">View all fixtures →</button></div>`;
    observeReveal();
  });
}
