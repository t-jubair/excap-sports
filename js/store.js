/* ============================================================
   EX-CAP Sports — store.js
   Unified data layer. Uses Firebase Firestore when configured,
   otherwise falls back to localStorage so the site is fully
   clickable before any backend is wired up.
   Exposes: Store.ready, Store.getSettings, Store.saveSettings,
   Store.getLogos, Store.setLogo, Store.removeLogo,
   Store.listRegs, Store.saveReg, Store.getReg, Store.nextId,
   Store.adminLogin, Store.adminLogout, Store.onAuth
   ============================================================ */
   (function(){
    const cfg = window.EXCAP;
    const usingFirebase = cfg.firebase.apiKey && !cfg.firebase.apiKey.startsWith("PASTE_");
    let db=null, auth=null, fb=null;
  
    /* ---------- localStorage fallback ---------- */
    const LS = {
      key:"excap_data_v2",
      read(){ try{ return JSON.parse(localStorage.getItem(this.key))||{}; }catch(e){ return {}; } },
      write(o){ localStorage.setItem(this.key, JSON.stringify(o)); }
    };
  
    const Store = { mode: usingFirebase?"firebase":"local", _authCb:null };
  
    /* ---------- init ---------- */
    Store.ready = (async function init(){
      if(!usingFirebase) return;
      // dynamic ESM imports from gstatic CDN
      const appMod  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      const fsMod   = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const authMod = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      const app = appMod.initializeApp(cfg.firebase);
      db = fsMod.getFirestore(app);
      auth = authMod.getAuth(app);
      fb = { ...fsMod, ...authMod };
      authMod.onAuthStateChanged(auth, u=>{ Store.user=u; (Store._authCbs||[]).forEach(cb=>{try{cb(u);}catch(e){}}); });
    })();
  
    /* ===== SETTINGS ===== */
    Store.getSettings = async function(){
      if(Store.mode==="local"){
        const d=LS.read(); return {...cfg.settings, ...cfg.brand && {}, ...(d.settings||{})};
      }
      const ref=fb.doc(db,"config","settings");
      const snap=await fb.getDoc(ref);
      return snap.exists()? {...cfg.settings, ...snap.data()} : {...cfg.settings};
    };
    Store.saveSettings = async function(s){
      if(Store.mode==="local"){ const d=LS.read(); d.settings=s; LS.write(d); return; }
      await fb.setDoc(fb.doc(db,"config","settings"), s, {merge:true});
    };
  
    /* ===== LOGOS (stored as base64 strings in one doc) ===== */
    Store.getLogos = async function(){
      if(Store.mode==="local"){ return LS.read().logos||{}; }
      try{
        const snap=await fb.getDocs(fb.collection(db,"logos"));
        const out={}; snap.forEach(d=>{ const v=d.data(); if(v && v.data) out[d.id]=v.data; });
        return out;
      }catch(e){ return {}; }
    };
    Store.setLogo = async function(key,dataURL){
      if(Store.mode==="local"){ const d=LS.read(); d.logos=d.logos||{}; d.logos[key]=dataURL; LS.write(d); return; }
      await fb.setDoc(fb.doc(db,"logos",key), {data:dataURL, updated:Date.now()});
    };
    Store.removeLogo = async function(key){
      if(Store.mode==="local"){ const d=LS.read(); if(d.logos) delete d.logos[key]; LS.write(d); return; }
      await fb.deleteDoc(fb.doc(db,"logos",key));
    };
    Store.deleteReg = async function(id){
      if(Store.mode==="local"){
        const d=LS.read();
        d.regs=(d.regs||[]).filter(r=>r.id!==id);
        d.publicTeams=(d.publicTeams||[]).filter(r=>r.id!==id);
        LS.write(d); return;
      }
      await fb.deleteDoc(fb.doc(db,"registrations",id));
      try{ await fb.deleteDoc(fb.doc(db,"public_teams",id)); }catch(e){}
    };
  
    /* ===== REGISTRATIONS ===== */
    Store.listRegs = async function(){
      if(Store.mode==="local"){ return (LS.read().regs||[]).sort((a,b)=>b.created-a.created); }
      const q=fb.query(fb.collection(db,"registrations"), fb.orderBy("created","desc"));
      const snap=await fb.getDocs(q);
      return snap.docs.map(d=>d.data());
    };
    Store.getReg = async function(id){
      if(Store.mode==="local"){ return (LS.read().regs||[]).find(r=>r.id===id)||null; }
      const snap=await fb.getDoc(fb.doc(db,"registrations",id));
      return snap.exists()?snap.data():null;
    };
    Store.saveReg = async function(rec){
      if(Store.mode==="local"){
        const d=LS.read(); d.regs=d.regs||[];
        const i=d.regs.findIndex(r=>r.id===rec.id);
        if(i>=0) d.regs[i]=rec; else d.regs.unshift(rec);
        LS.write(d);
      } else {
        await fb.setDoc(fb.doc(db,"registrations",rec.id), rec, {merge:true});
      }
      Store.deleteReg = async function(id){
        if(Store.mode==="local"){
          const d=LS.read(); d.regs=(d.regs||[]).filter(r=>r.id!==id);
          d.publicTeams=(d.publicTeams||[]).filter(r=>r.id!==id); LS.write(d); return;
        }
        await fb.deleteDoc(fb.doc(db,"registrations",id));
        try{ await fb.deleteDoc(fb.doc(db,"public_teams",id)); }catch(e){}
      };
      // mirror teams to a PII-free public collection the public site can read
      if(rec.type==="team"){ try{ await Store.savePublicTeam(rec); }catch(e){} }
    };
  
    /* ===== PUBLIC TEAMS (PII-free mirror for the public site) =====
       Contains ONLY safe fields (no phone/email) so it can be world-readable. */
    function slimTeam(rec){
      const d=rec.data||{};
      return { id:rec.id, type:"team", status:rec.status||"review", created:rec.created||Date.now(),
        playerCount:(rec.players||[]).filter(p=>p&&p.name).length,
        data:{ teamName:d.teamName||"", shortName:d.shortName||"", category:d.category||"",
               batch:d.batch||"", logo:d.logo||"", captainName:d.captainName||"" } };
    }
    Store.savePublicTeam = async function(rec){
      const slim=slimTeam(rec);
      if(Store.mode==="local"){ const d=LS.read(); d.pub=d.pub||{}; d.pub[slim.id]=slim; LS.write(d); window.dispatchEvent(new Event("excap-live")); return; }
      await fb.setDoc(fb.doc(db,"public_teams",slim.id), slim, {merge:true});
    };
    Store.listPublicTeams = async function(){
      if(Store.mode==="local"){ return Object.values(LS.read().pub||{}).sort((a,b)=>(b.created||0)-(a.created||0)); }
      const snap=await fb.getDocs(fb.collection(db,"public_teams"));
      return snap.docs.map(d=>d.data()).sort((a,b)=>(b.created||0)-(a.created||0));
    };
    Store.removePublicTeam = async function(id){
      if(Store.mode==="local"){ const d=LS.read(); if(d.pub)delete d.pub[id]; LS.write(d); return; }
      await fb.deleteDoc(fb.doc(db,"public_teams",id));
    };
  
    /* ===== ID counter ===== */
    Store.nextId = async function(name, prefix, pad){
      if(Store.mode==="local"){
        const d=LS.read(); d.ctr=d.ctr||{}; d.ctr[name]=(d.ctr[name]||0)+1; LS.write(d);
        return prefix+String(d.ctr[name]).padStart(pad,"0");
      }
      // transactional counter
      const ref=fb.doc(db,"counters",name);
      let n=1;
      await fb.runTransaction(db, async tx=>{
        const s=await tx.get(ref); n=(s.exists()? s.data().n:0)+1; tx.set(ref,{n});
      });
      return prefix+String(n).padStart(pad,"0");
    };
  
    /* ===== AUTH (admin) ===== */
    Store.onAuth = function(cb){ (Store._authCbs=Store._authCbs||[]).push(cb); if(Store.user!==undefined) cb(Store.user); };
    Store.adminLogin = async function(email,pass){
      if(Store.mode==="local"){
        // local demo: any email + the local demo password
        if(pass==="excap2026"){ Store.user={email:email||"admin@local"}; Store._authCb&&Store._authCb(Store.user); return true; }
        throw new Error("Invalid demo password (use excap2026)");
      }
      await fb.signInWithEmailAndPassword(auth,email,pass); return true;
    };
    Store.adminLogout = async function(){
      if(Store.mode==="local"){ Store.user=null; Store._profile=null; Store._authCb&&Store._authCb(null); return; }
      await fb.signOut(auth);
    };
  
    /* ===== ADMIN PROFILE (admins/{uid}) ===== */
    Store.adminInfo = function(){
      const u=Store.user||{}; const p=Store._profile||{};
      return { uid:u.uid||"local", email:u.email||"admin@local",
        name: p.name || u.displayName || (u.email||"Admin").split("@")[0] };
    };
    Store.getProfile = async function(){
      if(Store.mode==="local"){
        const p=JSON.parse(localStorage.getItem("excap_admin_profile")||"null");
        Store._profile = p || {name:"Demo Admin",role:"Organizer",email:"admin@local"};
        return Store._profile;
      }
      const uid=Store.user.uid; const snap=await fb.getDoc(fb.doc(db,"admins",uid));
      Store._profile = snap.exists()? snap.data()
        : {name:(Store.user.displayName||(Store.user.email||"").split("@")[0]),role:"Organizer",email:Store.user.email,uid};
      return Store._profile;
    };
    Store.saveProfile = async function(p){
      if(Store.mode==="local"){ localStorage.setItem("excap_admin_profile",JSON.stringify(p)); Store._profile=p; return; }
      await fb.setDoc(fb.doc(db,"admins",Store.user.uid), {...p,email:Store.user.email,uid:Store.user.uid}, {merge:true});
      Store._profile=p;
      try{ await fb.updateProfile(Store.user,{displayName:p.name||null, photoURL:(p.photo&&p.photo.length<800?p.photo:null)}); }catch(e){}
    };
    Store.changePassword = async function(current,next){
      if(Store.mode==="local") throw new Error("Password change needs Firebase (live mode). It works once Firebase Auth is connected.");
      const cred=fb.EmailAuthProvider.credential(Store.user.email,current);
      await fb.reauthenticateWithCredential(Store.user,cred); // confirms current password
      await fb.updatePassword(Store.user,next);
    };
  
    /* ===== AUDIT LOG (audit_logs/{id}) ===== */
    Store.logAction = async function(action,detail){
      const who=Store.adminInfo();
      const entry={ id:"log_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),
        action, detail:detail||"", by:who.name, email:who.email, uid:who.uid, ts:Date.now() };
      try{
        if(Store.mode==="local"){ const d=LS.read(); d.logs=d.logs||[]; d.logs.unshift(entry); d.logs=d.logs.slice(0,500); LS.write(d); return; }
        await fb.setDoc(fb.doc(db,"audit_logs",entry.id), entry);
      }catch(e){ /* logging must never break an action */ }
    };
    Store.listLogs = async function(n=200){
      if(Store.mode==="local"){ return (LS.read().logs||[]).slice(0,n); }
      const q=fb.query(fb.collection(db,"audit_logs"), fb.orderBy("ts","desc"), fb.limit(n));
      const snap=await fb.getDocs(q); return snap.docs.map(d=>d.data());
    };
  
    /* ===== MATCHES / SCOREBOARD ===== */
    Store.listMatches = async function(){
      if(Store.mode==="local"){ return (LS.read().matches||[]).sort((a,b)=>(a.no||0)-(b.no||0)); }
      const q=fb.query(fb.collection(db,"matches"), fb.orderBy("no","asc"));
      const snap=await fb.getDocs(q); return snap.docs.map(d=>d.data());
    };
    Store.saveMatch = async function(m){
      if(Store.mode==="local"){ const d=LS.read(); d.matches=d.matches||[]; const i=d.matches.findIndex(x=>x.id===m.id); if(i>=0)d.matches[i]=m; else d.matches.push(m); LS.write(d); window.dispatchEvent(new Event("excap-live")); return; }
      await fb.setDoc(fb.doc(db,"matches",m.id), m, {merge:true});
    };
    Store.deleteMatch = async function(id){
      if(Store.mode==="local"){ const d=LS.read(); d.matches=(d.matches||[]).filter(x=>x.id!==id); LS.write(d); window.dispatchEvent(new Event("excap-live")); return; }
      await fb.deleteDoc(fb.doc(db,"matches",id));
    };
    /* Live subscription — real-time across devices on Firebase, cross-tab on local. */
    Store.subscribeMatches = function(cb){
      if(Store.mode==="local"){
        const fire=async()=>cb(await Store.listMatches());
        const onStorage=e=>{ if(!e||e.key===LS.key) fire(); };
        window.addEventListener("storage",onStorage); window.addEventListener("excap-live",fire);
        fire();
        return ()=>{ window.removeEventListener("storage",onStorage); window.removeEventListener("excap-live",fire); };
      }
      const q=fb.query(fb.collection(db,"matches"), fb.orderBy("no","asc"));
      return fb.onSnapshot(q, snap=>cb(snap.docs.map(d=>d.data())));
    };
  
    /* ===== RESULTS (config/results) ===== */
    Store.getResults = async function(){
      if(Store.mode==="local"){ return LS.read().results||{}; }
      const snap=await fb.getDoc(fb.doc(db,"config","results"));
      return snap.exists()?snap.data():{};
    };
    Store.saveResults = async function(r){
      if(Store.mode==="local"){ const d=LS.read(); d.results=r; LS.write(d); window.dispatchEvent(new Event("excap-live")); return; }
      await fb.setDoc(fb.doc(db,"config","results"), r, {merge:true});
    };
    Store.subscribeResults = function(cb){
      if(Store.mode==="local"){
        const fire=async()=>cb(await Store.getResults());
        const onStorage=e=>{ if(!e||e.key===LS.key) fire(); };
        window.addEventListener("storage",onStorage); window.addEventListener("excap-live",fire); fire();
        return ()=>{ window.removeEventListener("storage",onStorage); window.removeEventListener("excap-live",fire); };
      }
      return fb.onSnapshot(fb.doc(db,"config","results"), s=>cb(s.exists()?s.data():{}));
    };
  
    /* ===== SUPPORT TICKETS (contact form → admin inbox) ===== */
    Store.saveTicket = async function(t){
      if(Store.mode==="local"){ const d=LS.read(); d.tickets=d.tickets||[]; d.tickets.unshift(t); LS.write(d); return; }
      await fb.setDoc(fb.doc(db,"tickets",t.id), t);
    };
    Store.listTickets = async function(){
      if(Store.mode==="local"){ return (LS.read().tickets||[]).sort((a,b)=>b.created-a.created); }
      const snap=await fb.getDocs(fb.query(fb.collection(db,"tickets"), fb.orderBy("created","desc")));
      return snap.docs.map(d=>d.data());
    };
    Store.updateTicket = async function(id,patch){
      if(Store.mode==="local"){ const d=LS.read(); const t=(d.tickets||[]).find(x=>x.id===id); if(t)Object.assign(t,patch); LS.write(d); return; }
      await fb.setDoc(fb.doc(db,"tickets",id), patch, {merge:true});
    };
  
    window.Store = Store;
  })();