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
        // Reset all users' monthly_quiz_points to 0
        const { error } = await supabase
            .from('users')
            .update({ monthly_quiz_points: 0 })
            .neq('anilist_id', 0); // Hack for "update all rows" since Supabase JS requires a filter for updates

        if (error) {
            console.error('Error resetting monthly points:', error);
            throw new Error(error.message);
        }

        return res.status(200).json({ success: true, message: "Ligas Mensuales reiniciadas exitosamente." });

    } catch (err) {
        console.error('Critical Error in Monthly Reset Cron:', err.message || err);
        return res.status(500).json({ error: 'Fallo al ejecutar el reinicio mensual', details: err.message });
    }
}