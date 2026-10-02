// ─── VERSIÓN DEL CACHÉ ───────────────────────────────────────────────────────
// Incrementa este número en cada despliegue para forzar limpieza completa.
const CACHE_VERSION = "v9"; 
const CACHE_NAME    = `kuramatracker-${CACHE_VERSION}`;

// Shell mínimo de la SPA
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Rutas de marca que NUNCA deben quedar obsoletas en caché
const NEVER_CACHE = [
  "/sw.js",
  "/logo.png",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png"
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log(`[SW] Instalando ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn("[SW] Precaching opcional fallo (normal en desarrollo):", err);
      })
    )
  );
  // Permitir activación inmediata
  self.skipWaiting();
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activando ${CACHE_NAME} y limpiando versiones obsoletas`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log(`[SW] Eliminando caché antiguo: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── MESSAGE ─────────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] SKIP_WAITING recibido del cliente");
    self.skipWaiting();
  }
});

// ─── FETCH (Estrategia Network-First con fallback resiliente) ─────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Ignorar: peticiones no-GET, APIs externas, GraphQL, hot-updates, extensiones
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

  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // 1. Assets de marca y sw.js → Red siempre, no almacenar
  if (NEVER_CACHE.some((p) => pathname === p)) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() => caches.match(request))
    );
    return;
  }

  // 2. Navegación HTML (páginas y raíz) → Network-First para siempre recibir los hashes JS más recientes
  if (request.mode === "navigate" || pathname === "/" || pathname === "/index.html") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 3. Assets estáticos con hash de Vite (/assets/*) → Cache-First con actualización de fondo
  if (pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Resto de peticiones → Network con fallback a caché
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && (response.type === "basic" || response.type === "cors")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── WEB PUSH NOTIFICATIONS ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  console.log("[SW] Evento push recibido:", event);
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "KuramaTracker", body: event.data.text() };
    }
  }

  const title = data.title || "🟢 ¡Anime en emisión!";
  const options = {
    body: data.body || "Un anime de tu lista de 'Planeado ver' ha comenzado a emitirse.",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    image: data.image || undefined,
    data: {
      url: data.url || "/",
      animeId: data.animeId
    },
    vibrate: [100, 50, 100],
    tag: data.tag || `airing_${data.animeId || Date.now()}`,
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── CLICK EN NOTIFICACIÓN PUSH ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Si la ventana ya está abierta, enfocarla
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrirla
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
