// ─── VERSIÓN DEL CACHÉ ───────────────────────────────────────────────────────
// Incrementa este número en cada despliegue para forzar limpieza completa.
const CACHE_VERSION = "v8"; 
const CACHE_NAME    = `kuramatracker-${CACHE_VERSION}`;

// Solo cacheamos el shell de la SPA — NO las imágenes de marca
// para que logo.png / iconos siempre se descarguen frescos.
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Rutas que NUNCA deben guardarse en caché (siempre red)
const NEVER_CACHE = [
  "/logo.png",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png"
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log(`[SW] Installing ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn("[SW] Pre-caching failed (normal in dev):", err);
      })
    )
  );
  // Activar inmediatamente sin esperar a que se cierren tabs actuales.
  self.skipWaiting();
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activating ${CACHE_NAME}`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      )
    )
  );
  // Tomar control de todas las pestañas abiertas de inmediato.
  self.clients.claim();
});

// ─── MESSAGE ─────────────────────────────────────────────────────────────────
// El cliente también puede pedirle al SW que se active vía postMessage.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] SKIP_WAITING received");
    self.skipWaiting();
  }
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Ignorar: no-GET, APIs externas, HMR de Vite, extensiones de Chrome
  if (
    request.method !== "GET" ||
    url.includes("graphql.anilist.co") ||
    url.includes("/api/") ||
    url.includes("hot-update") ||
    url.includes("@vite") ||
    url.includes("@id") ||
    url.includes("socket") ||
    url.includes("chrome-extension")
  ) {
    return;
  }

  // Imágenes de marca → siempre Red, nunca caché
  const pathname = new URL(url).pathname;
  if (NEVER_CACHE.some((p) => pathname === p)) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        // Si falla la red, intentar caché como último recurso
        caches.match(request)
      )
    );
    return;
  }

  // Resto → Red primero, caché como fallback offline (Network-First)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (response.type === "basic" || response.type === "cors")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) => cached || caches.match("/index.html")
        )
      )
  );
});
