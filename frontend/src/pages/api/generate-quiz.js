import { createClient } from '@supabase/supabase-js';

// Helper de timeout
const fetchWithTimeout = async (promise, ms) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('TIMEOUT'));
        }, ms);
    });
    try {
        return await Promise.race([
            Promise.resolve(promise),
            timeoutPromise
        ]);
    } finally {
        clearTimeout(timeoutId);
    }
};

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Faltan variables de entorno de Supabase en Vercel.");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const userId = req.query?.userId || req.body?.userId;
        
        let historyIds = [];
        if (userId) {
            try {
                // Timeout de 3s para el historial para asegurar rapidez
                const historyPromise = supabase
                    .from('quiz_history')
                    .select('question_id')
                    .eq('user_id', String(userId));
                    
                const { data: historyData } = await fetchWithTimeout(historyPromise, 3000);
                if (historyData) {
                    historyIds = historyData.map(h => h.question_id);
                }
            } catch (err) {
                if (err.message === 'TIMEOUT') {
                    console.warn("Timeout obteniendo historial. Se ignorará el historial.");
                } else {
                    throw err;
                }
            }
        }

        // Obtener las preguntas más recientes (Timeout global de 5s para la DB principal)
        const quizPromise = supabase
            .from('quizzes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        let data, error;
        try {
            const result = await fetchWithTimeout(quizPromise, 5000);
            data = result.data;
            error = result.error;
        } catch (err) {
            if (err.message === 'TIMEOUT') {
                return res.status(504).json({ error: 'Tiempo de espera agotado al contactar con la base de datos (5s).' });
            }
            throw err;
        }

        if (error) {
            throw new Error(error.message);
        }

        // Filtrar preguntas ya respondidas
        if (data && historyIds.length > 0) {
            data = data.filter(q => !historyIds.includes(q.id));
        }

        // Si tenemos al menos 5 preguntas no jugadas
        if (data && data.length >= 5) {
            // Generar una semilla basada en el día local del usuario
            // para que las preguntas roten diariamente en su medianoche exacta.
            const seedDate = req.query?.localDate || new Date().toISOString().split('T')[0];
            let seed = 0;
            for(let i=0; i<seedDate.length; i++) {
                seed += seedDate.charCodeAt(i);
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

        // Si el usuario ya ha jugado todas las preguntas en la BD
        return res.status(200).json({ error: 'Has completado todas las preguntas disponibles. ¡Vuelve mañana para más!' });

    } catch (err) {
        console.error('Error detallado en API /generate-quiz:', err.message || err);
        return res.status(500).json({ error: 'Error interno en la API de quizzes: ' + err.message });
    }
}
