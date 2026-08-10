/*
 * Generates a VAPID key pair for Web Push — no external dependencies.
 * Run:  node tools/gen-vapid.mjs
 *
 * Output:
 *   VAPID_PUBLIC_KEY  -> set in the Pages project (browser subscribes with it)
 *   VAPID_PRIVATE_JWK -> set as a SECRET on the daily-push worker
 */
import { webcrypto as crypto } from "node:crypto";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

// Uncompressed public point (65 bytes: 0x04 || X || Y) as base64url — this is
// exactly what PushManager.subscribe() expects as applicationServerKey.
const rawPub = await crypto.subtle.exportKey("raw", publicKey);
const privJwk = await crypto.subtle.exportKey("jwk", privateKey);

console.log("VAPID_PUBLIC_KEY  =", b64url(rawPub));
console.log("VAPID_PRIVATE_JWK =", JSON.stringify(privJwk));
console.log("\nNext steps:");
console.log("  1) Pages env var:   VAPID_PUBLIC_KEY = <public key above>");
console.log("  2) Worker secret:   npx wrangler secret put VAPID_PRIVATE_JWK   (paste the JWK)");
console.log("  3) Worker var:      VAPID_SUBJECT = mailto:jij@example.com");
