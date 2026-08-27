const CACHE = "speedycheck-shell-v2"
const BASE = new URL(".", self.location.href).pathname.replace(/\/$/, "")

const withBase = (path) => {
  if (path === "/") return BASE ? `${BASE}/` : "/"
  return `${BASE}${path}`
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          withBase("/"),
          withBase("/manifest.webmanifest"),
          withBase("/icons/icon-192.png"),
          withBase("/icons/icon-512.png"),
          withBase("/apple-touch-icon.png"),
        ]),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (BASE && !url.pathname.startsWith(`${BASE}/`) && url.pathname !== BASE) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(withBase("/"), copy)).catch(() => {})
          return response
        })
        .catch(async () => (await caches.match(withBase("/"))) || (await caches.match(request)) || Response.error()),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => cached)

      return cached || network
    }),
  )
})
