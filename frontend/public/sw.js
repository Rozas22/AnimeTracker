const CACHE_NAME = "anilist-hub-v2"; // Increment version to force cache upgrade
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install event: cache initial assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Pre-caching assets failed (this is normal in dev mode):", err);
      });
    })
  );
});

// Activate event: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(`[Service Worker] Deleting old cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Force active service worker to take control of open clients immediately
  self.clients.claim();
});

// Message event: handle SKIP_WAITING from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[Service Worker] Received SKIP_WAITING message, activating...");
    self.skipWaiting();
  }
});

// Fetch event: Network-First strategy with Cache Fallback for offline support
self.addEventListener("fetch", (event) => {
  // Bypass external APIs, oauth endpoints, hot modules and web sockets
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("graphql.anilist.co") || 
    event.request.url.includes("/api/") || 
    event.request.url.includes("hot-update") ||
    event.request.url.includes("@vite") ||
    event.request.url.includes("@id") ||
    event.request.url.includes("socket")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone and save to cache
        if (
          response && 
          response.status === 200 && 
          (response.type === "basic" || response.type === "cors") &&
          !event.request.url.includes("chrome-extension")
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline or fetch failed, serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to index.html for SPA routes offline
          return caches.match("/index.html");
        });
      })
  );
});
