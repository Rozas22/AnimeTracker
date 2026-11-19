// ─── VERSIÓN DEL CACHÉ ───────────────────────────────────────────────────────
// v10: service worker para la app Next.js. Las navegaciones las gestiona el
// navegador (redirecciones de login incluidas); solo se cachean los archivos
// estáticos con hash de /_next/static/, que nunca cambian de contenido.
const CACHE_VERSION = "v10";
const CACHE_NAME    = `kuramatracker-${CACHE_VERSION}`;

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ─── ACTIVATE: borra todas las cachés anteriores (incluida la de la SPA Vite) ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── MESSAGE ─────────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // En desarrollo (next dev) los chunks no llevan hash: nunca cachear en local
  if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") return;

  // Solo archivos estáticos inmutables de Next.js → caché primero
  if (!url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
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
