/*
 * Quinlan ReisApp — daily morning push logic
 * ------------------------------------------
 * Called by the worker's scheduled handler (see src/worker.js and the
 * [triggers] crons in wrangler.toml). Every weekday morning this pings every
 * saved subscription so the colleague gets a notification reminding them
 * there's really no excuse.
 *
 * We send a "no payload" push (only VAPID auth headers). That triggers the
 * service worker's `push` event, which shows a default message — no need for
 * the more complex AES-GCM payload encryption. Simple and reliable.
 *
 * Bindings (see wrangler.toml):
 *   SUBSCRIPTIONS      KV namespace with the stored push subscriptions
 *   VAPID_PRIVATE_JWK  secret: the EC P-256 private key as a JWK string
 *   VAPID_PUBLIC_KEY   var: base64url public key
 *   VAPID_SUBJECT      var: e.g. "mailto:jij@example.com"
 */

export async function sendAll(env) {
  if (!env.SUBSCRIPTIONS || !env.VAPID_PRIVATE_JWK) return 0;

  const list = await env.SUBSCRIPTIONS.list({ prefix: "sub:" });
  let sent = 0;

  for (const key of list.keys) {
    const raw = await env.SUBSCRIPTIONS.get(key.name);
    if (!raw) continue;
    const sub = JSON.parse(raw);
    try {
      const ok = await pushTo(sub, env);
      if (ok) sent++;
      // Clean up subscriptions the browser has dropped.
      else await env.SUBSCRIPTIONS.delete(key.name);
    } catch (_) { /* keep going */ }
  }
  return sent;
}

async function pushTo(sub, env) {
  const endpoint = new URL(sub.endpoint);
  const aud = `${endpoint.protocol}//${endpoint.host}`;
  const jwt = await vapidJWT(aud, env.VAPID_SUBJECT || "mailto:admin@example.com", env.VAPID_PRIVATE_JWK);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "3600",
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      // No Content-Encoding / body: this is a "tickle" push (data === null in SW).
    },
  });
  return res.status === 201 || res.status === 200;
}

// --- VAPID JWT (ES256) ----------------------------------------------------

async function vapidJWT(aud, sub, jwkStr) {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub,
  };
  const enc = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkStr),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${b64urlBytes(new Uint8Array(sig))}`;
}

function b64url(bytes) {
  return b64urlBytes(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}
function b64urlBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
