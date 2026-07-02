/* ============================================================
   EX-CAP Sports — config.js
   ONE place for every key and tunable. Fill these in.
   Nothing here is secret EXCEPT it is fine to expose Firebase
   web config + EmailJS public key (they are public by design).
   bKash secrets + SMSQ api_key live ONLY on the server (Vercel
   env vars in /api), never here.
   ============================================================ */
   window.EXCAP = {

    /* ---- Firebase (Project settings → Your apps → Web app config) ---- */
    firebase: {
      apiKey:            "AIzaSyBQpI5AJ3ui_mX_T1yCwoi56K1Pma3wtOc",
      authDomain:        "excap-sports-ec02f.firebaseapp.com",
      projectId:         "excap-sports-ec02f",
      storageBucket:     "excap-sports-ec02f.firebasestorage.app",
      messagingSenderId: "912242911188",
      appId:             "1:912242911188:web:e37ff2337296b7d600d841"
    },
  
    /* ---- EmailJS — ONE template handles every email type ----
       Create a single template, paste its ID into templateAll. */
    emailjs: {
      publicKey:   "OJzrr-eGrHVoPCXbo",
      serviceId:   "service_0lg8xhu",
      templateAll: "template_kd2u3aq"
    },
  
    /* ---- API base for serverless functions (bKash + SMS). 
           Leave "" when deployed on Vercel (same origin). ---- */
    apiBase: "",
  
    /* ---- bKash (only the public-facing bits; secrets stay server-side) ---- */
    bkash: {
      enabled: false,            // flip to true once your Vercel env vars are set
      sandbox: true              // false for live credentials
    },
  
    /* ---- Tournament defaults (admin can override these in Firestore) ---- */
    settings: {
      tournamentName: "EX-CAP Football Tournament",
      edition: "2026",
      venue: "SCPSC Field",
      emailLogoUrl: "",                 // hosted HTTPS logo URL shown in emails (admin-editable)
      maintenance: false,                // TRUE = public sees the holding page; admins/preview bypass
      previewKey: "excap-preview",      // secret to unlock a preview via #unlock or ?preview=KEY
      regOpen:  "2026-06-15T09:00",     // registration opens
      regDeadline: "2026-07-15T23:59",  // registration closes
      tournamentDate: "2026-08-21T09:00",
      maxTeams: 24,
      playersPerTeam: 7,
      guestsPerTeam: 5,
      teamFee: "2500",
      paymentMode: "offline",          // "offline" (main) — bKash shows a merchant QR
      bkashQR: "",                     // merchant QR image (base64) — admin uploads in Branding
      bkashNumber: "01XXX-XXXXXX",
      regStatus: { team:"open", guest:"open", volunteer:"open" },   // open | paused | closed (admin-controlled per type)
      paymentNumbers: [
        { method:"bKash", number:"01XXX-XXXXXX", type:"Personal" },
        { method:"Nagad", number:"01XXX-XXXXXX", type:"Personal" }
      ],
      annc: {
        text:"Registration is now open — secure your team slot before 15 July.",
        link:"#register-team", linkLabel:"Register", active:true, urgent:false
      },
      volunteerRoles: ["Registration Desk","Field Marshal","Logistics","Media & Photography","First Aid","Hospitality","Crowd & Security","Refreshments","Scoreboard","Anchor / MC"],
      volunteerZones: ["Main Gate","Field A","Field B","Registration Tent","Media Booth","Refreshment Area","Parking","First-Aid Point"],

      /* affiliated clubs (admin-editable; logos uploaded per key in Branding) */
      clubs: [
        { key:"business", name:"Business & Career Club", role:"Sponsorship & operations" },
        { key:"sports",   name:"Sports Club",            role:"On-field management" }
      ]
    },

    /* ---- Emergency contact — shown at the top of every page ---- */
    emergency: {
      name:  "Talha Jubair",
      role:  "Assistant Secretary, Technology — EX-CAP",
      phone: "01711988862",
      email: "me.talhajubair@gmail.com"
    },
  
    /* ---- Brand colours (admin can change live) ---- */
    brand: { purple:"#7c3aed", magenta:"#db2777" },
  
    /* version / last-updated shown in the footer (bump on each deploy) */
    build: { version:"1.0.0", date:"17 Jun 2026" },
  
    /* ---- Organizer contact + socials (footer) ---- */
    contact: {
      email:"support@excapscpsc.com",
      phone:"+880 1XXX-XXXXXX",
      emergency:"+880 1XXX-XXXXXX",
      address:"SCPSC Premises, Bangladesh"
    },
    socials: {
      facebook:"https://www.facebook.com/excap.scpsc",
      instagram:"https://www.instagram.com/ex_cap_scpsc/",
      linkedin:"https://www.linkedin.com/company/ex-cap/",
      twitter:"https://x.com/ExCapSCPSC",
      threads:"https://www.threads.com/@ex_cap_scpsc",
      website:"https://excap.vercel.app"
    },
  
    /* ---- Developer credit ---- */
    developer: {
      name:"Talha Jubair",
      role:"Developer & Architect",
      org:"Asst. Tech Sec, EX-CAP",
      socials:{
        portfolio:"https://t-jubair.vercel.app/",
        github:"https://github.com/",
        linkedin:"https://www.linkedin.com/in/",
        email:"mailto:me.talhajubair@gmail.com"
      }
    }
  };