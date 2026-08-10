/*
 * Returns the VAPID public key so the browser can subscribe to push.
 * Configure it in the Cloudflare Pages project settings:
 *   Environment variable  VAPID_PUBLIC_KEY = <your base64url public key>
 * If it isn't set yet, the app falls back to a local demo notification.
 */
export function onRequestGet({ env }) {
  const publicKey = env && env.VAPID_PUBLIC_KEY ? env.VAPID_PUBLIC_KEY : null;
  return new Response(JSON.stringify({ publicKey }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
