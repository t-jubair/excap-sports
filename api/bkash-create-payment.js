// api/bkash-create-payment.js
// Creates a tokenized-checkout payment and returns the bKash redirect URL.
const { BASE, grantToken, authHeaders } = require("./_bkash");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { amount, payerReference, merchantInvoiceNumber } = req.body || {};
    if (!amount) return res.status(400).json({ error: "amount required" });

    const token = await grantToken();
    // callbackURL must point back to your deployed site (set SITE_URL in env)
    const callbackURL = (process.env.SITE_URL || "") + "/";

    const r = await fetch(`${BASE}/create`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        mode: "0011",
        payerReference: payerReference || "EXCAP",
        callbackURL,
        amount: String(amount),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: merchantInvoiceNumber || ("EXCAP" + Date.now()),
      }),
    });
    const data = await r.json();
    if (!data.bkashURL) return res.status(502).json({ error: data.statusMessage || "create failed", data });
    return res.status(200).json({ paymentID: data.paymentID, bkashURL: data.bkashURL });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
