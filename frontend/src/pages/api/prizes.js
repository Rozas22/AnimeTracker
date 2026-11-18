import { createClient } from '@supabase/supabase-js';

const ADMIN_ID = '7952169';

export default async function handler(req, res) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Configuración de Supabase incompleta.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── GET: Obtener el premio mensual activo ──────────────────────
    if (req.method === 'GET') {
        try {
            const now = new Date();
            const currentMonth = parseInt(req.query.month) || (now.getMonth() + 1);
            const currentYear = parseInt(req.query.year) || now.getFullYear();

            // Buscar premio del mes actual activo
            const { data, error } = await supabase
                .from('monthly_prizes')
                .select('*')
                .eq('month', currentMonth)
                .eq('year', currentYear)
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) {
                // Si la tabla no existe aún, devolvemos null sin romper
                console.warn('Advertencia al consultar monthly_prizes:', error.message);
                return res.status(200).json({ success: true, prize: null, tableExists: false });
            }

            if (data && data.length > 0) {
                return res.status(200).json({ success: true, prize: data[0], tableExists: true });
            }

            // Si no hay premio para este mes, buscar el último premio activo registrado
            const { data: latestData } = await supabase
                .from('monthly_prizes')
                .select('*')
                .eq('is_active', true)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .limit(1);

            return res.status(200).json({ 
                success: true, 
                prize: latestData && latestData.length > 0 ? latestData[0] : null,
                tableExists: true
            });
        } catch (err) {
            console.error('Error al obtener premio mensual:', err);
            return res.status(200).json({ success: true, prize: null, error: err.message });
        }
    }

    // ─── POST: Guardar o actualizar premio mensual (Solo Admin) ─────
    if (req.method === 'POST') {
        const { adminId, month, year, title, description, images, is_active } = req.body || {};

        // Verificación estricta de administrador
        if (!adminId || adminId.toString() !== ADMIN_ID) {
            return res.status(403).json({ error: 'Acceso no autorizado. Se requieren permisos de administrador.' });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'El título del premio es obligatorio.' });
        }

        try {
            const now = new Date();
            const targetMonth = parseInt(month) || (now.getMonth() + 1);
            const targetYear = parseInt(year) || now.getFullYear();
            const cleanImages = Array.isArray(images) ? images : [];

            // Comprobar si ya existe un registro para este mes/año
            const { data: existing } = await supabase
                .from('monthly_prizes')
                .select('id')
                .eq('month', targetMonth)
                .eq('year', targetYear)
                .limit(1);

            let savedPrize = null;

            if (existing && existing.length > 0) {
                const { data: updated, error: updateError } = await supabase
                    .from('monthly_prizes')
                    .update({
                        title: title.trim(),
                        description: description ? description.trim() : '',
                        images: cleanImages,
                        is_active: is_active !== undefined ? is_active : true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing[0].id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                savedPrize = updated;
            } else {
                const { data: inserted, error: insertError } = await supabase
                    .from('monthly_prizes')
                    .insert([{
                        month: targetMonth,
                        year: targetYear,
                        title: title.trim(),
                        description: description ? description.trim() : '',
                        images: cleanImages,
                        is_active: is_active !== undefined ? is_active : true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (insertError) throw insertError;
                savedPrize = inserted;
            }

            return res.status(200).json({
                success: true,
                message: 'Premio mensual guardado correctamente.',
                prize: savedPrize
            });
        } catch (err) {
            console.error('Error al guardar premio mensual en Supabase:', err);
            return res.status(500).json({
                error: 'Error al persistir en base de datos. Asegúrate de haber ejecutado la migración SQL.',
                details: err.message
            });
        }
    }

    return res.status(405).json({ error: 'Método no permitido.' });
}
