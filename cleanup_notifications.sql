-- Limpieza de Notificaciones Duplicadas en Supabase
-- Ejecuta este script en el SQL Editor de Supabase para dejar solo una notificación por usuario y tipo.

DELETE FROM notifications
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY type, sender_id, receiver_id 
      ORDER BY created_at ASC
    ) as row_num
    FROM notifications
  ) t
  WHERE t.row_num > 1
);