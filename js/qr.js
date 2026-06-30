/* ============================================================
   EX-CAP Sports — qr.js
   Real scannable QR codes (passes) + camera scanner wrapper.
   ============================================================ */
   (function(){
    const QR={};
  
    /* Generate a REAL, scannable QR as inline SVG that inherits the
       pass styling. Falls back to a decorative block if the library
       fails to load. */
    QR.svg = function(text, opts={}){
      const fg=opts.fg||"#0a0d1c", bg=opts.bg||"#ffffff", pad=opts.pad==null?2:opts.pad;
      try{
        const q=qrcode(0,"M"); q.addData(String(text)); q.make();
        const n=q.getModuleCount(), size=n+pad*2;
        let rects="";
        for(let r=0;r<n;r++) for(let c=0;c<n;c++)
          if(q.isDark(r,c)) rects+=`<rect x="${c+pad}" y="${r+pad}" width="1" height="1"/>`;
        return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
          <rect width="${size}" height="${size}" fill="${bg}"/><g fill="${fg}">${rects}</g></svg>`;
      }catch(e){
        // decorative fallback (non-scannable)
        let h=2166136261; for(const ch of String(text)) h=(h^ch.charCodeAt(0))*16777619>>>0;
        const n=11,cells=[]; for(let i=0;i<n*n;i++){ h=(h*1103515245+12345)>>>0; cells.push((h>>3&1)); }
        let r=`<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="${bg}"/><g fill="${fg}">`;
        for(let y=0;y<n;y++)for(let x=0;x<n;x++) if(cells[y*n+x]) r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;
        return r+"</g></svg>";
      }
    };
  
    /* Camera scanner. mount(elementId, onDecode) → returns a controller
       with stop(). Uses html5-qrcode if present. */
    QR.scanner = function(elId, onDecode){
      if(!window.Html5Qrcode){ return {ok:false, error:"Scanner library not loaded"}; }
      const inst=new Html5Qrcode(elId);
      let running=false, lastText="", lastAt=0;
      const cfg={ fps:10, qrbox:{width:230,height:230}, aspectRatio:1.0 };
      inst.start({facingMode:"environment"}, cfg, (text)=>{
        const now=Date.now();
        if(text===lastText && now-lastAt<2500) return; // debounce repeats
        lastText=text; lastAt=now; onDecode(text);
      }).then(()=>{running=true;}).catch(err=>{ onDecode.__err && onDecode.__err(err); });
      return {
        ok:true,
        stop(){ if(running){ try{ inst.stop().then(()=>inst.clear()).catch(()=>{}); }catch(e){} running=false; } }
      };
    };
  
    window.QR=QR;
  })();