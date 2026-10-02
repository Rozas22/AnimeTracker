import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BHjVEryVua0lJzNu7ZHPFzvjDdcXX8bDv_cN2wl-yRszJlnjpmHYom99AV4890V4sdtaiA-1s9oiFUhhJMwiNSc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'uegIuSvTLL786-5ukxzzPeRtjVAnDp_nnR7n-2lNbrg';

try {
  webpush.setVapidDetails(
    'mailto:contacto@kuramatracker.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn('VAPID setVapidDetails error:', e);
}

export default async function handler(req, res) {
  // Verificación de autorización por CRON_SECRET (igual que los otros crons)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuración de Supabase incompleta.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Obtener animes en planning que aún NO han sido notificados
    const { data: planningList, error: pError } = await supabase
      .from('user_planning_animes')
      .select('*')
      .eq('notified', false)
      .limit(150);

    if (pError) {
      console.warn('user_planning_animes no disponible o vacía:', pError.message);
      return res.status(200).json({ success: true, message: 'Tabla vacía o sin registros pendientes', notifiedCount: 0 });
    }

    if (!planningList || planningList.length === 0) {
      return res.status(200).json({ success: true, message: 'No hay animes pendientes de notificar', notifiedCount: 0 });
    }

    // 2. Extraer IDs únicos de anime
    const uniqueAnimeIds = [...new Set(planningList.map((item) => item.anime_id))];

    // 3. Consultar AniList GraphQL para verificar cuáles han pasado a "RELEASING"
    const aniListQuery = `
      query ($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(id_in: $ids, status: RELEASING, type: ANIME) {
            id
            status
            title {
              userPreferred
              romaji
              english
            }
            coverImage {
              large
            }
          }
        }
      }
    `;

    const aniListRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: aniListQuery,
        variables: { ids: uniqueAnimeIds.slice(0, 50) }
      })
    });

    const aniListData = await aniListRes.json();
    const releasingMedia = aniListData?.data?.Page?.media || [];

    if (releasingMedia.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Ningún anime de la lista ha pasado a emisión todavía.',
        checkedCount: uniqueAnimeIds.length,
        releasingCount: 0
      });
    }

    const releasingMap = new Map();
    releasingMedia.forEach((m) => releasingMap.set(m.id, m));

    // 4. Identificar qué usuarios tienen alguno de los animes en emisión
    const itemsToNotify = planningList.filter((item) => releasingMap.has(item.anime_id));

    let notificationsSent = 0;

    // 5. Para cada anime en emisión, buscar las suscripciones Push del usuario
    for (const item of itemsToNotify) {
      const media = releasingMap.get(item.anime_id);
      const title = media?.title?.userPreferred || media?.title?.romaji || item.anime_title || 'Anime';
      const cover = media?.coverImage?.large || item.anime_cover || '/icon-192.png';

      // Buscar suscripciones push del usuario
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('anilist_id', item.anilist_id);

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: `🟢 ¡En emisión: ${title}!`,
          body: `El anime de tu lista "Planeado ver" ya ha comenzado a emitirse. ¡Míralo ahora!`,
          icon: '/icon-192.png',
          image: cover,
          animeId: item.anime_id,
          url: `https://anime-tracker-wine.vercel.app/#mylist`
        });

        for (const sub of subscriptions) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          try {
            await webpush.sendNotification(pushSubscription, payload);
            notificationsSent++;
          } catch (pushErr) {
            console.warn(`Error enviando push al endpoint (${sub.id}):`, pushErr.statusCode || pushErr.message);
            // Si el endpoint ya no es válido (404 o 410 Gone), eliminarlo
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }
      }

      // 6. Marcar como notificado en la BD para evitar alertas repetidas
      await supabase
        .from('user_planning_animes')
        .update({ notified: true, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }

    // Registrar en cron_logs
    await supabase.from('cron_logs').insert([{
      job_name: 'check_planning_airing',
      status: 'success',
      error_message: `Enviadas ${notificationsSent} notificaciones push.`
    }]);

    return res.status(200).json({
      success: true,
      message: `Comprobación completada. ${notificationsSent} notificaciones enviadas.`,
      checkedAnimeCount: uniqueAnimeIds.length,
      releasingCount: releasingMedia.length,
      notificationsSent
    });
  } catch (err) {
    console.error('Error en cron-check-planning-airing:', err);
    await supabase.from('cron_logs').insert([{
      job_name: 'check_planning_airing',
      status: 'error',
      error_message: err.message || String(err)
    }]);
    return res.status(500).json({ error: 'Fallo al verificar animes en emisión', details: err.message });
  }
}
