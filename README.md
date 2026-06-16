# EX-CAP Football Tournament Platform

Registration + live operations platform for the EX-CAP (Alumni Association of SCPSC) football tournament.

Public: animated home with countdowns + live strip + champions banner; team/guest/visitor/student/volunteer registration; LIVE scoreboard (real-time); fixtures; champions & awards; teams; help; real scannable QR passes.
Admin: dashboard; SCOREBOARD control (schedule, live scores, scorers, half/full-time); RESULTS & awards (publish champions); QR CHECK-IN (camera scan team/players/guests); teams; registrations; volunteers (assign role/zone/shift, monitor duty); payments + manual/cash; broadcast center (bulk email+SMS); branding/logos; announcement; settings; profiles + password; append-only activity log.

Stack: StackBlitz -> GitHub -> Vercel (host + serverless) + Firebase (Firestore + Auth + realtime) + EmailJS + SMSQ. bKash built in (switch on when ready). QR via qrcode-generator + html5-qrcode.

Runs out of the box in demo mode (open index.html, admin password `excap2026`).
To go live, follow SETUP-GUIDE.md from Phase 1.

Developed by Talha Jubair.
