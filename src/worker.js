/*
 * Quinlan ReisApp — Cloudflare Worker entrypoint
 * ----------------------------------------------
 * One worker does everything:
 *   - /api/*   journey planning, push subscribe, VAPID key (same logic as
 *              the Pages Functions in functions/api/ — imported, not copied)
 *   - assets   everything in public/ via the ASSETS binding (PWA shell)
 *   - cron     weekday-morning push notifications (scheduled handler)
 *
 * Deploy:  npx wrangler deploy
 */

import { onRequestGet as journeys } from "../functions/api/journeys.js";
import { onRequestGet as vapid } from "../functions/api/vapid.js";
import { onRequestPost as subscribe, onRequestOptions as subscribeOptions } from "../functions/api/subscribe.js";
import { sendAll } from "./push.js";

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/journeys" && request.method === "GET") {
      return journeys({ request, env });
    }
    if (path === "/api/vapid" && request.method === "GET") {
      return vapid({ request, env });
    }
    if (path === "/api/subscribe") {
      if (request.method === "POST") return subscribe({ request, env });
      if (request.method === "OPTIONS") return subscribeOptions();
    }
    if (path.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: true, message: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // Everything else: the 8-bit PWA from public/
    return env.ASSETS.fetch(request);
  },

  // The daily morning wake-up (see wrangler.toml [triggers])
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendAll(env));
  },
};
