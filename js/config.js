/* ============================================================
   EX-CAP Sports — config.js
   ============================================================ */
   window.EXCAP = {

    /* ---- Firebase ---- */
    firebase: {
      apiKey:            "AIzaSyBQpI5AJ3ui_mX_T1yCwoi56K1Pma3wtOc",
      authDomain:        "excap-sports-ec02f.firebaseapp.com",
      projectId:         "excap-sports-ec02f",
      storageBucket:     "excap-sports-ec02f.firebasestorage.app",
      messagingSenderId: "912242911188",
      appId:             "1:912242911188:web:e37ff2337296b7d600d841"
    },
  
    /* ---- EmailJS — ONE template handles every email type ---- */
    emailjs: {
      publicKey:   "OJzrr-eGrHVoPCXbo",
      serviceId:   "service_0lg8xhu",
      templateAll: "template_w4c24cd"
    },
  
    apiBase: "",
  
    bkash: { enabled: false, sandbox: true },
  
    settings: {
      tournamentName: "EX-CAP Football Tournament",
      edition: "2026",
      venue: "SCPSC Field",
      emailLogoUrl: "",
      regOpen:  "2026-06-15T09:00",
      regDeadline: "2026-07-15T23:59",
      tournamentDate: "2026-08-21T09:00",
      maxTeams: 24,
      playersPerTeam: 7,
      guestsPerTeam: 5,
      teamFee: "2500",
      paymentNumbers: [
        { method:"bKash", number:"01XXX-XXXXXX", type:"Personal" },
        { method:"Nagad", number:"01XXX-XXXXXX", type:"Personal" }
      ],
      annc: {
        text:"Registration is now open — secure your team slot before 15 July.",
        link:"#register-team", linkLabel:"Register", active:true, urgent:false
      },
      volunteerRoles: ["Registration Desk","Field Marshal","Logistics","Media & Photography","First Aid","Hospitality","Crowd & Security","Refreshments","Scoreboard","Anchor / MC"],
      volunteerZones: ["Main Gate","Field A","Field B","Registration Tent","Media Booth","Refreshment Area","Parking","First-Aid Point"]
    },
  
    brand: { purple:"#7c3aed", magenta:"#db2777" },
  
    contact: {
      email:"support@excapscpsc.com",
      phone:"+880 1XXX-XXXXXX",
      emergency:"+880 1XXX-XXXXXX",
      address:"SCPSC Premises, Bangladesh"
    },
    socials: {
      facebook:"https://facebook.com/",
      instagram:"https://instagram.com/",
      youtube:"https://youtube.com/",
      whatsapp:"https://wa.me/8801XXXXXXXXX",
      linkedin:"https://linkedin.com/"
    },
  
    developer: {
      name:"Talha Jubair",
      role:"Full-Stack Developer & Platform Architect",
      socials:{
        portfolio:"https://",
        github:"https://github.com/",
        linkedin:"https://linkedin.com/in/",
        email:"mailto:hello@example.com"
      }
    }
  };