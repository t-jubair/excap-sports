// api/send-sms.js
// Sends an SMS through SMSQ (api.smsq.global). Keeps your ApiKey server-side.
//
// SMSQ credentials (from your panel → API):
//   ApiKey, ClientId, SenderId
// These come from Vercel environment variables — never hard-code them here:
//   SMSQ_API_URL    (e.g. https://api.smsq.global/api/v2/SendSMS — CONFIRM the exact
//                    path + method on your Swagger page: https://api.smsq.global/swagger)
//   SMSQ_API_KEY    = J48H9vk7sNbSPatTzPOI0LLS+WmFb0XdQZ9EBqIRGZs=
//   SMSQ_CLIENT_ID  = e002d550-849c-447c-a306-ee838f53a949
//   SMSQ_SENDER_ID  = 8809617632318

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: "to and message required" });

    const URL = process.env.SMSQ_API_URL || "https://api.smsq.global/api/v2/SendSMS";
    const ApiKey   = process.env.SMSQ_API_KEY;
    const ClientId = process.env.SMSQ_CLIENT_ID;
    const SenderId = process.env.SMSQ_SENDER_ID;
    if (!ApiKey || !ClientId || !SenderId)
      return res.status(200).json({ ok: false, skipped: true, reason: "SMSQ env vars not set" });

    // Accept a single number, a comma string, or an array. Normalise each to 8801XXXXXXXXX.
    const norm = (x) => {
      let m = String(x).replace(/\D/g, "");
      if (m.startsWith("0")) m = "88" + m;
      else if (!m.startsWith("880")) m = "880" + m.replace(/^88/, "");
      return m;
    };
    const numbers = (Array.isArray(to) ? to : String(to).split(","))
      .map((n) => n.trim()).filter(Boolean).map(norm);
    const MobileNumbers = numbers.join(","); // SMSQ accepts comma-separated recipients

    // SMSQ (this Swagger style) expects PascalCase fields. If your Swagger shows
    // different names (e.g. "Numbers" instead of "MobileNumbers"), change them here.
    const payload = {
      ApiKey,
      ClientId,
      SenderId,
      Message: message,
      MobileNumbers,
      Is_Unicode: false,
      Is_Flash: false,
    };

    const r = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    // Log to Vercel function logs so you can verify the exact response from SMSQ.
    console.log("SMSQ response", r.status, text.slice(0, 500));
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, data });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
