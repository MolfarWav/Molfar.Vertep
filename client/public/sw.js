/* Molfar Vertep's service worker. It exists so browsers offer to install the
 * shell as an app, and it does one thing: when the engine cannot be reached,
 * a top-level page load shows a small offline page instead of the browser's
 * error. Nothing else is cached or answered here. The API, app frames, the
 * shell's own files and every update keep going straight to the engine, so
 * an engine update reaches an installed app exactly as it reaches a tab.
 *
 * The engine serves this file at /sw.js (scope "/") with its version filled
 * in below, so every engine release is a new worker and refreshes the
 * offline page's copy. */
const VERSION = "__ENGINE_VERSION__"
const CACHE = `vertep-offline-${VERSION}`
const OFFLINE_FILES = ["/client/offline.html", "/client/offline.js", "/client/vertep-logo.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(OFFLINE_FILES.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("vertep-offline-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  // Only the offline page's own files, and only from this worker's cache.
  if (req.method === "GET" && OFFLINE_FILES.includes(new URL(req.url).pathname)) {
    event.respondWith(caches.match(req.url, { cacheName: CACHE }).then((hit) => hit || fetch(req)))
    return
  }
  // Top-level page loads only: app frames and the agent page (iframes),
  // requests, streams and sockets are left to the browser untouched.
  if (req.mode !== "navigate" || req.destination !== "document") return
  event.respondWith(
    fetch(req).catch(() =>
      caches.match("/client/offline.html", { cacheName: CACHE }).then((hit) => hit || Response.error()),
    ),
  )
})
