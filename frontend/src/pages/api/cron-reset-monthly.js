import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMonthlyReset(res) {
    // 1. Determine which month we are closing
    const now = new Date();
    // We are closing the month that just ended
    const closing = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of prev month
    const prevMonth = closing.getUTCMonth() + 1; // 1-12
    const prevYear  = closing.getUTCFullYear();

    // 2. Get the top scorer with points > 0
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

        // 2a. Grant achievement badge
        const { error: achieveError } = await supabase
            .from('user_achievements')
            .insert([{ anilist_id: winner.anilist_id, achievement_type: 'monthly_winner' }]);
        if (achieveError) console.error('Achievement insert error:', achieveError.message);

        // 2b. Record in monthly_winners with fallback if columns don't exist yet
        let { error: winError } = await supabase
            .from('monthly_winners')
            .insert([{
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

    // 3. Reset monthly_quiz_points for ALL users
    const { error: resetError } = await supabase
        .from('users')
        .update({ monthly_quiz_points: 0 })
        .neq('anilist_id', 0);
    if (resetError) throw new Error(resetError.message);

    // 4. Log success
    await supabase.from('cron_logs').insert([{
        job_name: 'reset_monthly',
        status:   'success'
    }]);

    return res.status(200).json({
        success:   true,
        message:   `Mes ${prevMonth}/${prevYear} cerrado exitosamente.`,
        winner:    winnerInfo
    });
}

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        return await runMonthlyReset(res);
    } catch (err) {
        console.error('Critical Error in Monthly Reset Cron:', err.message || err);
        await supabase.from('cron_logs').insert([{
            job_name:      'reset_monthly',
            status:        'error',
            error_message: err.message || String(err)
        }]);
        return res.status(500).json({ error: 'Fallo al ejecutar el reinicio mensual', details: err.message });
    }
}