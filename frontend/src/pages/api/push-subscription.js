import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuración de Supabase incompleta.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { action, anilist_id, endpoint, p256dh, auth, user_agent, animes } = req.body || {};

  if (!anilist_id) {
    return res.status(400).json({ error: 'Falta anilist_id' });
  }

  try {
    // ─── 1. Guardar o actualizar suscripción Web Push ─────────────
    if (action === 'subscribe') {
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: 'Faltan datos de la suscripción (endpoint, p256dh, auth)' });
      }

      // Upsert por endpoint
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert([{
          anilist_id: parseInt(anilist_id),
          endpoint,
          p256dh,
          auth,
          user_agent: user_agent || null,
          updated_at: new Date().toISOString()
        }], { onConflict: 'endpoint' });

      if (error) {
        console.warn('Advertencia en upsert push_subscriptions:', error.message);
      }

      return res.status(200).json({ success: true, message: 'Suscripción guardada correctamente' });
    }

    // ─── 2. Eliminar suscripción ──────────────────────────────────
    if (action === 'unsubscribe') {
      const query = supabase.from('push_subscriptions').delete().eq('anilist_id', parseInt(anilist_id));
      if (endpoint) {
        query.eq('endpoint', endpoint);
      }
      await query;
      return res.status(200).json({ success: true, message: 'Suscripción eliminada' });
    }

    // ─── 3. Sincronizar lista de "Planeado ver" ────────────────────
    if (action === 'sync_planning') {
      if (!Array.isArray(animes) || animes.length === 0) {
        return res.status(200).json({ success: true, count: 0 });
      }

      // Limitar a máximo 200 items por usuario para rendimiento
      const itemsToInsert = animes.slice(0, 200).map((a) => ({
        anilist_id: parseInt(anilist_id),
        anime_id: parseInt(a.anime_id),
        anime_title: a.anime_title || 'Anime',
        anime_cover: a.anime_cover || null,
        notified: false,
        updated_at: new Date().toISOString()
      }));

      const { error: syncError } = await supabase
        .from('user_planning_animes')
        .upsert(itemsToInsert, { onConflict: 'anilist_id,anime_id' });

      if (syncError) {
        console.warn('Advertencia al sincronizar user_planning_animes:', syncError.message);
      }

      return res.status(200).json({ success: true, count: itemsToInsert.length });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  } catch (err) {
    console.error('Error en /api/push-subscription:', err);
    return res.status(500).json({ error: 'Error del servidor', details: err.message });
  }
}
