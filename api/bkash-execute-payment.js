// api/bkash-execute-payment.js
// Executes (captures) a previously-created payment after the user returns.
const { BASE, grantToken, authHeaders } = require("./_bkash");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { paymentID } = req.body || {};
    if (!paymentID) return res.status(400).json({ error: "paymentID required" });

    const token = await grantToken();
    const r = await fetch(`${BASE}/execute`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ paymentID }),
    });
    const data = await r.json();

    // If execute is not successful, optionally query to confirm final state.
    if (!data.transactionStatus) {
      const q = await fetch(`${BASE}/payment/status`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ paymentID }),
      });
      const qd = await q.json();
      return res.status(200).json(qd);
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
