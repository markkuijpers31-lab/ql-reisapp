/* Quinlan ReisApp — Service Worker
 * - offline shell caching
 * - push notifications (ready for the daily morning wake-up)
 */

const CACHE = "qlr-v2";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sprites.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API: network-first (fresh reisinfo), fall back to nothing special.
  if (url.pathname.includes("/api/")) {
    event.respondWith(fetch(req).catch(() => new Response(
      JSON.stringify({ error: true, message: "offline" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )));
    return;
  }

  // Static shell: cache-first, then network (and cache it).
  event.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

// --- Push: the morning wake-up ------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { title: "Quinlan ReisApp", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Quinlan ReisApp";
  const options = {
    body: data.body || "🚆 Tijd om te vertrekken — anders is het OV weer je schuld!",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [80, 40, 80],
    data: { url: data.url || "./" },
    actions: [{ action: "open", title: "Bekijk ritten" }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(target); return c.focus(); }
      }
      return clients.openWindow(target);
    })
  );
});
