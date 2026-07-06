import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Obtener al top usuario del mes con puntos > 0
        const { data: topUsers, error: topError } = await supabase
            .from('users')
            .select('anilist_id, monthly_quiz_points')
            .gt('monthly_quiz_points', 0)
            .order('monthly_quiz_points', { ascending: false })
            .limit(1);

        if (topError) {
            console.error('Error fetching top users:', topError);
            throw new Error(topError.message);
        }

        // 2. Si hay un ganador, registrar su victoria
        if (topUsers && topUsers.length > 0) {
            const winner = topUsers[0];
            
            // Logro genérico
            const { error: achieveError } = await supabase
                .from('user_achievements')
                .insert([{
                    anilist_id: winner.anilist_id,
                    achievement_type: 'monthly_winner'
                }]);
                
            if (achieveError) {
                console.error('Error inserting achievement:', achieveError);
            }

            // Registro en la tabla mensual
            const date = new Date();
            date.setUTCDate(0); // Último día del mes anterior
            const prevMonth = date.getUTCMonth() + 1;
            const prevYear = date.getUTCFullYear();

            const { error: winError } = await supabase
                .from('monthly_winners')
                .insert([{
                    anilist_id: winner.anilist_id,
                    month: prevMonth,
                    year: prevYear,
                    score: winner.monthly_quiz_points
                }]);

            if (winError) {
                console.error('Error inserting into monthly_winners:', winError);
            }
        }

        // 3. Reset all users' monthly_quiz_points to 0
        const { error } = await supabase
            .from('users')
            .update({ monthly_quiz_points: 0 })
            .neq('anilist_id', 0); // Hack for "update all rows" since Supabase JS requires a filter for updates

        if (error) {
            console.error('Error resetting monthly points:', error);
            throw new Error(error.message);
        }

        // 4. Registrar éxito en cron_logs
        await supabase.from('cron_logs').insert([{
            job_name: 'reset_monthly',
            status: 'success'
        }]);

        return res.status(200).json({ success: true, message: "Ligas Mensuales reiniciadas exitosamente." });

    } catch (err) {
        console.error('Critical Error in Monthly Reset Cron:', err.message || err);
        
        // Registrar error en cron_logs
        await supabase.from('cron_logs').insert([{
            job_name: 'reset_monthly',
            status: 'error',
            error_message: err.message || String(err)
        }]);

        return res.status(500).json({ error: 'Fallo al ejecutar el reinicio mensual', details: err.message });
    }
}