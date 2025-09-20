const CACHE_NAME = "base64-app-v1.0.0"
const DEPLOYMENT_VERSION = "1.0.0"

// Files to cache for offline use
const STATIC_CACHE_URLS = ["/", "/manifest.json", "/_next/static/css/app/layout.css", "/_next/static/css/app/page.css"]

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing version:", DEPLOYMENT_VERSION)

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static resources")
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating version:", DEPLOYMENT_VERSION)

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        console.log("[SW] Serving from cache:", event.request.url)
        return cachedResponse
      }

      // Otherwise fetch from network and cache the response
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response before caching
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // If network fails and we don't have cache, return offline page
          if (event.request.destination === "document") {
            return caches.match("/")
          }
        })
    }),
  )
})

// Message event - handle version updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
