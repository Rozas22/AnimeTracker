import { createClient } from '@supabase/supabase-js';

/**
 * /api/close-month
 * Manual trigger to close the current/previous month.
 * Same logic as the cron — useful for testing or recovering missed runs.
 * Protected by CRON_SECRET.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase   = createClient(supabaseUrl, supabaseKey);

    try {
        // Determine month/year to close: default = previous month
        const now        = new Date();
        const closing    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
        const prevMonth  = closing.getUTCMonth() + 1;
        const prevYear   = closing.getUTCFullYear();

        // Check: do not double-close same month
        const { data: existing } = await supabase
            .from('monthly_winners')
            .select('id')
            .eq('month', prevMonth)
            .eq('year', prevYear)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(409).json({
                error: `El mes ${prevMonth}/${prevYear} ya fue cerrado anteriormente.`
            });
        }

        // Get top scorer
        const { data: topUsers, error: topError } = await supabase
            .from('users')
            .select('anilist_id, username, monthly_quiz_points')
            .gt('monthly_quiz_points', 0)
            .order('monthly_quiz_points', { ascending: false })
            .limit(1);

        if (topError) throw new Error(topError.message);

        let winnerInfo = null;

        if (topUsers && topUsers.length > 0) {
            const winner = topUsers[0];
            winnerInfo = { anilist_id: winner.anilist_id, username: winner.username, score: winner.monthly_quiz_points };

            await supabase.from('user_achievements').insert([{
                anilist_id:       winner.anilist_id,
                achievement_type: 'monthly_winner'
            }]);

            let { error: winError } = await supabase.from('monthly_winners').insert([{
                anilist_id:  winner.anilist_id,
                username:    winner.username   || null,
                avatar_url:  null,
                month:       prevMonth,
                year:        prevYear,
                score:       winner.monthly_quiz_points
            }]);

            if (winError && winError.message && winError.message.includes('column')) {
                const fallback = await supabase
                    .from('monthly_winners')
                    .insert([{
                        anilist_id: winner.anilist_id,
                        month:      prevMonth,
                        year:       prevYear,
                        score:      winner.monthly_quiz_points
                    }]);
                winError = fallback.error;
            }
            if (winError) console.error('monthly_winners insert error:', winError.message);
        }

        // Reset monthly points
        await supabase.from('users')
            .update({ monthly_quiz_points: 0 })
            .neq('anilist_id', 0);

        await supabase.from('cron_logs').insert([{ job_name: 'close_month_manual', status: 'success' }]);

        return res.status(200).json({
            success:  true,
            message:  `Mes ${prevMonth}/${prevYear} cerrado manualmente.`,
            winner:   winnerInfo
        });

    } catch (err) {
        console.error('Error in close-month:', err.message || err);
        return res.status(500).json({ error: 'Fallo al cerrar el mes', details: err.message });
    }
}
