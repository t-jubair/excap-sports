// api/_bkash.js — shared bKash helpers (server-side only).
// Reads secrets from Vercel environment variables. Never expose these.

const SANDBOX = process.env.BKASH_SANDBOX !== "false"; // default sandbox
const BASE = SANDBOX
  ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout"
  : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout";

const CREDS = {
  username:  process.env.BKASH_USERNAME,
  password:  process.env.BKASH_PASSWORD,
  appKey:    process.env.BKASH_APP_KEY,
  appSecret: process.env.BKASH_APP_SECRET,
};

// simple in-memory token cache (per warm lambda)
let cache = { token: null, exp: 0 };

async function grantToken() {
  if (cache.token && Date.now() < cache.exp) return cache.token;
  const res = await fetch(`${BASE}/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "username": CREDS.username,
      "password": CREDS.password,
    },
    body: JSON.stringify({ app_key: CREDS.appKey, app_secret: CREDS.appSecret }),
  });
  const data = await res.json();
  if (!data.id_token) throw new Error("bKash token failed: " + (data.statusMessage || JSON.stringify(data)));
  cache = { token: data.id_token, exp: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000 };
  return cache.token;
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "authorization": token,
    "x-app-key": CREDS.appKey,
  };
}

module.exports = { BASE, grantToken, authHeaders };
