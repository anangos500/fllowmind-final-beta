// /public/service-worker.js
// *** BUMP versi setiap update agar cache lama tersapu ***
const VERSION = "flowminda-v5";
const STATIC_CACHE = `static-${VERSION}`;
const STATIC_ASSETS = [
  "/", "/index.html", "/manifest.json",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"
];

const isApiRequest = (url) => {
  const u = new URL(url);
  // Seluruh domain Supabase (REST/Auth/Storage/Realtime bootstrap)
  if (u.hostname.endsWith(".supabase.co")) return true;
  // Netlify Functions (kalau dipakai)
  if (u.pathname.startsWith("/.netlify/functions")) return true;
  return false;
};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 1) Non-GET => selalu network (biar write/auth tidak nyangkut)
  if (req.method !== "GET") {
    e.respondWith(fetch(req));
    return;
  }

  // 2) API/Auth/Realtime/External => network-only (optional fallback ke cache)
  if (isApiRequest(req.url) || url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // 3) Static assets => cache-first
  const isStatic = url.pathname.startsWith("/assets")
    || /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/.test(url.pathname);

  if (isStatic) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res.ok) caches.open(STATIC_CACHE).then(c => c.put(req, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // 4) Navigasi => network-first, fallback index.html (SPA)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          caches.open(STATIC_CACHE).then(c => c.put("/index.html", res.clone()));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 5) Default
  e.respondWith(caches.match(req).then(c => c || fetch(req)));
});
