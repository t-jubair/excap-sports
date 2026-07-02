module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const debug = { step: "start" };
  try {
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: "to and message required" });

    const URL = process.env.SMSQ_API_URL || "https://api.smsq.global/api/v3/SendSMS";
    const ApiKey   = process.env.SMSQ_API_KEY;
    const ClientId = process.env.SMSQ_CLIENT_ID;
    const SenderId = process.env.SMSQ_SENDER_ID;

    debug.step = "env-check";
    debug.hasApiKey = !!ApiKey;
    debug.hasClientId = !!ClientId;
    debug.hasSenderId = !!SenderId;
    debug.url = URL;

    if (!ApiKey || !ClientId || !SenderId)
      return res.status(200).json({ ok: false, skipped: true, reason: "SMSQ env vars not set", debug });

    const norm = (x) => {
      let m = String(x).replace(/\D/g, "");
      if (m.startsWith("0")) m = "88" + m;
      else if (!m.startsWith("880")) m = "880" + m.replace(/^88/, "");
      return m;
    };
    const numbers = (Array.isArray(to) ? to : String(to).split(","))
      .map((n) => n.trim()).filter(Boolean).map(norm);
    const MobileNumbers = numbers.join(",");

    debug.step = "payload-built";
    debug.recipients = numbers.length;

    const payload = {
      ApiKey, ClientId, SenderId,
      Message: message,
      MobileNumbers,
      Is_Unicode: false,
      Is_Flash: false,
    };

    debug.step = "calling-smsq";
    const r = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    debug.step = "smsq-responded";
    debug.smsqStatus = r.status;

    const text = await r.text();
    debug.smsqBody = text.slice(0, 500);

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      return res.status(200).json({ ok: false, error: `SMSQ ${r.status}`, debug, data });
    }
    return res.status(200).json({ ok: true, data, debug });

  } catch (e) {
    debug.step = "exception";
    debug.error = e.message;
    return res.status(200).json({ ok: false, error: e.message, debug });
  }
};