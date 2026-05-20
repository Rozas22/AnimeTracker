const CACHE_NAME = "anilist-hub-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("Pre-caching assets failed (this is normal in dev mode):", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

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
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (
          response && 
          response.status === 200 && 
          response.type === "basic" &&
          !event.request.url.includes("chrome-extension")
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Return cached index.html as a fallback
        return caches.match("/index.html");
      });
    })
  );
});
