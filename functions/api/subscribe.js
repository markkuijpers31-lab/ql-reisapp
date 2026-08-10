/*
 * Stores a browser's push subscription so the daily cron worker can wake
 * the colleague every morning.
 *
 * Requires a KV namespace bound as  SUBSCRIPTIONS  in the Pages project.
 * Without it, the endpoint still accepts the request (so the UI works) but
 * reports that persistence is not yet configured.
 */
export async function onRequestPost({ request, env }) {
  let sub;
  try {
    sub = await request.json();
  } catch (_) {
    return json({ ok: false, message: "invalid JSON" }, 400);
  }
  if (!sub || !sub.endpoint) {
    return json({ ok: false, message: "missing subscription endpoint" }, 400);
  }

  if (!env || !env.SUBSCRIPTIONS) {
    return json({ ok: true, stored: false, message: "KV not configured yet (see README)" });
  }

  // Key by a hash of the endpoint so re-subscribing is idempotent.
  const key = "sub:" + (await sha256(sub.endpoint));
  await env.SUBSCRIPTIONS.put(key, JSON.stringify({ ...sub, savedAt: Date.now() }));
  return json({ ok: true, stored: true });
}

// CORS preflight (harmless, same-origin in practice)
export function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
