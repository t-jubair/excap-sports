/* ============================================================
   EX-CAP Sports — notify.js
   ONE dynamic EmailJS template for every email type. Branding
   (logo, colours, org name, contact, socials) is pulled LIVE from
   the admin settings on each send, so changing anything in the
   admin panel updates every future email automatically — the
   EmailJS template itself never changes.
   SMS via SMSQ (serverless /api/send-sms, key stays on server).
   ============================================================ */
   (function(){
    const cfg = window.EXCAP;
    const Notify = {};
    const e = s => (s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const nl2br = s => e(s).replace(/\n/g,"<br>");
  
    let emailReady=false;
    Notify.initEmail = function(){
      if(emailReady) return true;
      if(!window.emailjs || cfg.emailjs.publicKey.startsWith("PASTE_")) return false;
      emailjs.init({ publicKey: cfg.emailjs.publicKey });
      emailReady=true; return true;
    };
  
    /* the single template id — point all uses at one template */
    function templateId(){
      const t=cfg.emailjs;
      return (t.templateAll && !t.templateAll.startsWith("PASTE_")) ? t.templateAll
           : (t.templateApproval && !t.templateApproval.startsWith("PASTE_")) ? t.templateApproval
           : t.templateAll || t.templateApproval;
    }
  
    /* live branding parameters (read from admin settings at send time) */
    function brand(){
      const A = (typeof App!=="undefined" && App.settings) ? App : {settings:cfg.settings, logos:{}};
      const s = A.settings || cfg.settings;
      const br = (s.brand) || cfg.brand;
      const soc = cfg.socials || {};
      const logoUrl = s.emailLogoUrl || "";   // hosted HTTPS URL (email clients block base64)
      const logo_block = logoUrl
        ? `<img src="${e(logoUrl)}" alt="${e(s.tournamentName||"EX-CAP")}" width="64" height="64" style="display:block;margin:0 auto 10px;border:0;border-radius:12px;background:#ffffff;">`
        : "";
      const link=(url,label)=> (url && !/\/\/$/.test(url) && url!=="https://")
        ? `<a href="${e(url)}" style="color:#ffffff;text-decoration:none;font-size:13px;margin:0 7px;">${label}</a>` : "";
      const social_block=[link(soc.facebook,"Facebook"),link(soc.instagram,"Instagram"),link(soc.youtube,"YouTube"),link(soc.whatsapp,"WhatsApp"),link(soc.linkedin,"LinkedIn")].filter(Boolean).join("&nbsp;·&nbsp;") || "&nbsp;";
      const c = cfg.contact || {};
      return {
        org_name: s.tournamentName || "EX-CAP Football Tournament",
        org_tagline: "Alumni Association of SCPSC",
        brand: br.purple || "#7c3aed",
        brand2: br.magenta || "#db2777",
        logo_block, social_block,
        contact_email: c.email||"", contact_phone: c.phone||"", contact_address: c.address||"",
        venue: s.venue||"", year: new Date().getFullYear(),
        developer: (cfg.developer&&cfg.developer.name)||"Talha Jubair"
      };
    }
  
    /* low-level: send one email through the single template */
    async function sendEmail({toEmail,toName,subject,content,replyTo}){
      if(!Notify.initEmail()) return {ok:false,skipped:true,reason:"EmailJS not configured"};
      const params = Object.assign({
        to_email: toEmail, to_name: toName||"there",
        subject: subject||"EX-CAP Football Tournament",
        content,                       // raw HTML -> template uses {{{content}}}
        reply_to: replyTo||""
      }, brand());
      try{ await emailjs.send(cfg.emailjs.serviceId, templateId(), params); return {ok:true}; }
      catch(err){ return {ok:false,error:String(err&&err.text||err)}; }
    }
  
    /* small content helpers */
    function detailsTable(rows){
      const body=rows.filter(r=>r[1]).map(([k,v])=>
        `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px;">${e(k)}</td>
         <td style="padding:7px 0;text-align:right;color:#111827;font-size:13px;font-weight:bold;">${e(v)}</td></tr>`).join("");
      return body?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:4px 16px;margin:6px 0 18px;">${body}</table>`:"";
    }
    function chip(text,bg,fg){ return `<div style="text-align:center;margin:0 0 18px;"><span style="display:inline-block;background:${bg};color:${fg};font-size:13px;font-weight:bold;padding:7px 16px;border-radius:999px;">${e(text)}</span></div>`; }
  
    /* ---- PUBLIC SENDERS (same signatures the app already calls) ---- */
  
    Notify.sendApprovalEmail = function({toEmail, toName, regId, regType, venue, eventDate, message, subject, rec}){
      const em = (App.settings && App.settings.emergency) || cfg.emergency || {};
      const status = (rec && rec.status) || "approved";
      const passUrl = "https://sports.excapscpsc.com/#confirm-" + encodeURIComponent(regId||"");
      const rulesUrl = "https://sports.excapscpsc.com/#tournament";
      const details = detailsTable([
        ["Registration ID", regId],
        ["Type", regType],
        ["Name", toName],
        ["Status", status.toUpperCase()],
        ["Venue", venue],
        ["Event date", eventDate]
      ]);
      const buttons =
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px"><tr>
          <td width="50%" style="padding-right:6px"><a href="${e(passUrl)}" style="display:block;background:linear-gradient(120deg,#7c3aed,#db2777);color:#fff;text-decoration:none;padding:13px 8px;border-radius:11px;text-align:center;font-weight:bold;font-size:13px">⤓ Download Pass (PDF)</a></td>
          <td width="50%" style="padding-left:6px"><a href="${e(rulesUrl)}" style="display:block;background:#ffffff;color:#7c3aed;border:2px solid #7c3aed;text-decoration:none;padding:11px 8px;border-radius:11px;text-align:center;font-weight:bold;font-size:13px">📖 Tournament Rules</a></td>
        </tr></table>`;
      const emergency = em.name
        ? `<div style="background:#fff8e1;border:1px solid #ffe0a3;border-radius:12px;padding:16px;margin-top:18px"><b style="color:#0f1424">🆘 Questions or need help?</b><p style="margin:6px 0 0;font-size:13px;color:#5b6275">Reach <b>${e(em.name)}</b>${em.role?" ("+e(em.role)+")":""} — <a href="tel:${e(em.phone||"")}" style="color:#7c3aed;text-decoration:none;font-weight:bold">📞 ${e(em.phone||"")}</a> · <a href="mailto:${e(em.email||"")}" style="color:#7c3aed;text-decoration:none;font-weight:bold">✉ ${e(em.email||"")}</a></p></div>`
        : "";
      const content =
        chip(status.toUpperCase(), status==="approved"?"#16a34a":"#7c3aed", "#ffffff") +
        `<p style="margin:0 0 14px;font-size:16px"><b>Hi ${e(toName||"there")},</b></p>` +
        `<p style="margin:0 0 18px;color:#334155;line-height:1.7">${nl2br(message||"Your registration status has been updated.")}</p>` +
        details + buttons + emergency;
      return sendEmail({ toEmail, toName, subject: subject || "EX-CAP Registration Update", content, replyTo: em.email });
    };
    

  
    Notify.sendContact = function({name,email,message}){
      const content =
        `<p style="margin:0 0 14px;"><strong>New message from the website contact form.</strong></p>`+
        detailsTable([["Name",name],["Email",email]])+
        `<div style="background:#f8fafc;border-radius:10px;padding:16px;color:#111827;line-height:1.6;">${nl2br(message)}</div>`;
      return sendEmail({ toEmail: cfg.contact.email, toName:"Organizer",
        subject:"New contact message from "+(name||"website"), content, replyTo: email });
    };
  
    Notify.sendBroadcastEmail = function({toEmail,toName,subject,message}){
      const content =
        (subject?`<h2 style="margin:0 0 14px;font-size:20px;color:#111827;">${e(subject)}</h2>`:"")+
        `<p style="margin:0 0 14px;">Hi <strong>${e(toName||"there")}</strong>,</p>
         <div style="color:#111827;line-height:1.7;">${nl2br(message)}</div>`;
      return sendEmail({toEmail,toName,subject:subject||"EX-CAP Football Tournament",content});
    };
  
    /* SMS via serverless function. `to` may be a number, comma string, or array. */
    Notify.sendSMS = async function({to,message}){
      try{
        const res = await fetch((cfg.apiBase||"")+"/api/send-sms", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({to,message})
        });
        const data = await res.json().catch(()=>({}));
        return res.ok ? {ok:true,data} : {ok:false,error:data.error||("HTTP "+res.status)};
      }catch(err){ return {ok:false,error:String(err)}; }
    };
  
    /* Approval fires email + SMS (best-effort, never throws). */
    Notify.onApproved = async function(rec, settings){
      const name = rec.data.teamName || rec.data.name || "Participant";
      const eventDate = new Date(settings.tournamentDate).toLocaleDateString();
      const results={};
      if(rec.data.email || rec.captainEmail){
        results.email = await Notify.sendApprovalEmail({
          toEmail: rec.data.email || rec.captainEmail, toName: name,
          regId: rec.id, regType: rec.type, venue: settings.venue, eventDate,
          subject: `EX-CAP: Your ${rec.type} registration is APPROVED`,
          message: `Great news — your ${rec.type} registration (${rec.id}) has been approved by the organizers. Show your QR pass at the gate on match day.`,
          rec: rec
        });
      }
      if(rec.contact){
        results.sms = await Notify.sendSMS({
          to: rec.contact,
          message: `EX-CAP: ${name}, your ${rec.type} registration ${rec.id} is APPROVED. Show your QR pass at ${settings.venue} on ${eventDate}.`
        });
      }
      return results;
    };
  
    window.Notify = Notify;
  })();