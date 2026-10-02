// ─── GESTOR DE NOTIFICACIONES WEB PUSH (KuramaTracker) ───────────────────────

export const VAPID_PUBLIC_KEY = 'BHjVEryVua0lJzNu7ZHPFzvjDdcXX8bDv_cN2wl-yRszJlnjpmHYom99AV4890V4sdtaiA-1s9oiFUhhJMwiNSc';

// Conversor de clave Base64 URL-safe a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Comprueba si el dispositivo y navegador soportan Web Push
export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Obtener el estado actual del permiso
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Solicitar permiso y registrar suscripción Push en el navegador
export async function subscribeUserToPush(userId) {
  if (!isPushNotificationSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Pedir permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'permission_denied' };
    }

    // 2. Esperar a que el Service Worker esté activo
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      return { success: false, reason: 'no_service_worker' };
    }

    // 3. Obtener o crear suscripción
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    const subJson = subscription.toJSON();

    // 4. Enviar suscripción al backend
    if (userId && subJson.keys) {
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          anilist_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          user_agent: navigator.userAgent
        })
      });
    }

    localStorage.setItem('kurama_push_enabled', 'true');
    return { success: true, subscription };
  } catch (err) {
    console.error('Error registrando suscripción Web Push:', err);
    return { success: false, reason: err.message };
  }
}

// Desactivar notificaciones Push
export async function unsubscribeUserFromPush(userId) {
  if (!isPushNotificationSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    if (userId) {
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          anilist_id: userId
        })
      });
    }

    localStorage.setItem('kurama_push_enabled', 'false');
    return { success: true };
  } catch (err) {
    console.error('Error cancelando suscripción Push:', err);
    return { success: false, error: err.message };
  }
}

// Sincronizar la lista de "Planeado ver" del usuario con el servidor para que el cron los monitorice
export async function syncPlanningAnimesWithServer(userId, planningEntries) {
  if (!userId || !Array.isArray(planningEntries) || planningEntries.length === 0) return;

  try {
    const payload = planningEntries.map((e) => ({
      anime_id: e.media?.id,
      anime_title: e.media?.title?.userPreferred || e.media?.title?.romaji || e.media?.title?.english || 'Anime',
      anime_cover: e.media?.coverImage?.large || e.media?.coverImage?.medium || null,
      status: e.media?.status // NOT_YET_RELEASED, RELEASING, etc.
    })).filter((item) => item.anime_id);

    await fetch('/api/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_planning',
        anilist_id: userId,
        animes: payload
      })
    });
  } catch (err) {
    console.warn('Error sincronizando lista de planeados con el servidor:', err);
  }
}
