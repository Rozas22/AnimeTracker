import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Inicializar Supabase dentro del try para capturar si faltan variables
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Faltan variables de entorno de Supabase en Vercel (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const userId = req.query?.userId || req.body?.userId;
        
        // Obtener historial del usuario
        let historyIds = [];
        if (userId) {
            const { data: historyData } = await supabase
                .from('quiz_history')
                .select('question_id')
                .eq('user_id', String(userId));
            if (historyData) {
                historyIds = historyData.map(h => h.question_id);
            }
        }

        const todayUTC = new Date().toISOString().split('T')[0];

        // 1. PRIORIDAD ABSOLUTA: Intentar obtener quizzes creados HOY (UTC)
        let { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .gte('created_at', todayUTC);
        
        // Filtrar preguntas ya respondidas
        if (data && historyIds.length > 0) {
            data = data.filter(q => !historyIds.includes(q.id));
        }

        // Lógica de Daily Challenge (Seed diario)
        if (data && data.length >= 5) {
            let seed = 0;
            for(let i=0; i<todayUTC.length; i++) {
                seed += todayUTC.charCodeAt(i);
            }
            
            let shuffled = [...data];
            let m = shuffled.length, t, i;
            while (m) {
                seed = (seed * 9301 + 49297) % 233280;
                i = Math.floor((seed / 233280) * m--);
                t = shuffled[m];
                shuffled[m] = shuffled[i];
                shuffled[i] = t;
            }
            
            // Devuelve 5 preguntas usando la semilla de hoy
            return res.status(200).json(shuffled.slice(0, 5)); 
        }

        // Si no hay suficientes preguntas de hoy (el cron falló o no se ha ejecutado aún)
        return res.status(200).json({ error: 'not_ready' });

    } catch (err) {
        console.error('Error detallado en API /generate-quiz:', err.message || err);
        return res.status(500).json({ error: 'Error interno en la API de quizzes: ' + err.message });
    }
}
