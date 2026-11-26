import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServerKey } from '../../lib/supabase/env';
import { awardChallengePodium } from '../../lib/reto/league';
import { runRetoMaintenance } from '../../lib/reto/challenge-store';

// Inicializar Supabase
const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseServerKey();
const supabase = createClient(supabaseUrl, supabaseKey);

// Margen para Gemini + reintentos (Vercel corta a los 10 s por defecto)
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Verificación de Seguridad (Cron Secret)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1b. Bonus del podio del Reto diario de ayer (top 3 → PL de liga).
    //     El día 1 lo hace cron-reset-monthly ANTES de cerrar la liga, para que
    //     el último día del mes cuente en su mes.
    let podium = null;
    if (new Date().getUTCDate() !== 1) {
        try {
            podium = await awardChallengePodium();
        } catch (podiumErr) {
            console.error('Podio del reto:', podiumErr.message || podiumErr);
        }
    }

    // 1c. Reto de hoy y de mañana ya generados: si AniList falla, hay un día de margen
    try {
        await runRetoMaintenance();
    } catch (maintenanceErr) {
        console.error('Mantenimiento del reto:', maintenanceErr.message || maintenanceErr);
    }

    try {
        // 2. Selección de 5 Animes populares
        const anilistQuery = `
            query {
                Page(page: ${Math.floor(Math.random() * 5) + 1}, perPage: 25) {
                    media(type: ANIME, sort: POPULARITY_DESC) {
                        title { romaji english }
                    }
                }
            }
        `;
        
        let selectedAnimes = ["Naruto", "One Piece", "Bleach", "Attack on Titan", "Death Note"];
        try {
            const anilistRes = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: anilistQuery })
            });
            const anilistData = await anilistRes.json();
            let animeTitles = anilistData.data?.Page?.media?.map(m => m.title.english || m.title.romaji);
            
            if (animeTitles && animeTitles.length >= 5) {
                // Mezclar la lista y escoger 5
                const shuffled = animeTitles.sort(() => 0.5 - Math.random());
                selectedAnimes = shuffled.slice(0, 5);
            }
        } catch (e) {
            console.error('Error obteniendo animes de AniList para el cron:', e);
        }

        const animesListString = selectedAnimes.join(", ");

        const prompt = `Actúa como un experto en anime. Genera exactamente 5 preguntas de trivia en formato JSON para estos animes: ${animesListString}. 
Responde ÚNICAMENTE con un array de objetos JSON válido, sin texto adicional, explicaciones ni formato Markdown.

Estructura de cada objeto:
{
  "anime_title": "Nombre del anime",
  "question": "Pregunta detallada",
  "options": ["Opcion A", "Opcion B", "Opcion C", "Opcion D"],
  "correct_answer": "Respuesta correcta (debe ser exacta a una de las opciones)",
  "difficulty": "medium" o "hard"
}

Ejemplo de respuesta esperada:
[
  {
    "anime_title": "Naruto",
    "question": "¿Quién fue el Cuarto Hokage?",
    "options": ["Hiruzen Sarutobi", "Minato Namikaze", "Tobirama Senju", "Kakashi Hatake"],
    "correct_answer": "Minato Namikaze",
    "difficulty": "medium"
  }
]`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY no está configurada.");
        }

        // 3. Retry Logic para Gemini
        let geminiData = null;
        let generatedQuizzes = null;
        let maxRetries = 2; // Intento principal + 2 reintentos = 3 intentos totales
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                // gemini-1.5-flash fue retirado por Google (404 → «respuesta vacía»).
                // gemini-2.5-flash responde en ~5 s; GEMINI_MODEL permite cambiarlo sin tocar código.
                const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    signal: AbortSignal.timeout(18000),
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                geminiData = await geminiRes.json();

                if (!geminiData.candidates || geminiData.candidates.length === 0) {
                     throw new Error(`Gemini API sin respuesta: ${geminiData.error?.message || 'vacía'}`);
                }

                let generatedText = geminiData.candidates[0].content.parts[0].text;
                // Limpieza anti-markdown
                generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

                generatedQuizzes = JSON.parse(generatedText);
                
                // Si llegamos aquí, el parseo funcionó
                break;
            } catch (err) {
                console.warn(`Intento ${attempt + 1} fallido:`, err.message);
                attempt++;
                if (attempt > maxRetries) {
                    throw new Error(`Fallo tras ${maxRetries + 1} intentos. Último error: ${err.message}`);
                }
                // Esperar un poco antes de reintentar
                await new Promise(res => setTimeout(res, 2000));
            }
        }

        // Solo preguntas bien formadas: 4 opciones distintas y la correcta entre ellas.
        // Las opciones se barajan para que la correcta no caiga siempre en la misma posición.
        generatedQuizzes = (Array.isArray(generatedQuizzes) ? generatedQuizzes : [])
            .filter((q) => q && typeof q.question === 'string' && Array.isArray(q.options)
                && q.options.length === 4 && new Set(q.options).size === 4
                && q.options.includes(q.correct_answer))
            .map((q) => ({
                anime_title: String(q.anime_title || '').slice(0, 200),
                question: q.question.slice(0, 500),
                options: [...q.options].map(String).sort(() => Math.random() - 0.5),
                correct_answer: String(q.correct_answer),
                difficulty: q.difficulty === 'hard' ? 'hard' : 'medium',
            }));

        if (!generatedQuizzes || generatedQuizzes.length === 0) {
            throw new Error("No se pudo generar quizzes válidos");
        }

        // 4. Inserción Automática en Supabase
        const { error: insertError } = await supabase
            .from('quizzes')
            .insert(generatedQuizzes);

        if (insertError) {
            console.error('Error insertando en Supabase (cron):', insertError);
            throw new Error(insertError.message);
        }

        // 5. Registrar éxito en cron_logs
        await supabase.from('cron_logs').insert([{
            job_name: 'generate_quizzes',
            status: 'success'
        }]);

        // 6. Ejecutar también la comprobación de animes en "Planeado ver"
        try {
            const checkPlanningModule = await import('./cron-check-planning-airing.js');
            if (checkPlanningModule?.default) {
                const fakeRes = { status: () => ({ json: () => {} }) };
                await checkPlanningModule.default({ method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, fakeRes);
            }
        } catch (planningErr) {
            console.warn('Comprobación de planeados en cron falló levemente:', planningErr);
        }

        return res.status(200).json({ success: true, count: generatedQuizzes.length, animes: selectedAnimes, podium });

    } catch (err) {
        console.error('Error Crítico en Cron Job:', err.message || err);
        
        // Registrar error en cron_logs
        await supabase.from('cron_logs').insert([{
            job_name: 'generate_quizzes',
            status: 'error',
            error_message: err.message || String(err)
        }]);

        return res.status(500).json({ error: 'Fallo al ejecutar el cron job', details: err.message });
    }
}