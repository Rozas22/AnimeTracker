import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase (usa las variables de entorno de Vercel)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let cachedQuizzes = [];

    try {
        // 1. Intentar obtener quizzes de la base de datos
        const { data, error: cacheError } = await supabase
            .from('quizzes')
            .select('*')
            .limit(50); // Get up to 50

        if (!cacheError && data) {
            cachedQuizzes = data;
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // Modo Offline: Si no hay llave de Gemini, servimos desde la BD local.
        if (!apiKey) {
            if (cachedQuizzes.length > 0) {
                const shuffled = [...cachedQuizzes].sort(() => 0.5 - Math.random());
                return res.status(200).json(shuffled.slice(0, 5));
            } else {
                console.error('Error detallado en API: GEMINI_API_KEY is missing and DB is empty');
                return res.status(200).json({ error: 'Aún no hay quizzes disponibles. ¡Prueba más tarde!' });
            }
        }

        // Si hay suficientes en caché, devolver 5 aleatorios (con 1 en 5 chances de generar nuevos)
        if (cachedQuizzes.length >= 5) {
            const shuffled = [...cachedQuizzes].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 5);
            if (Math.random() > 0.2) {
                return res.status(200).json(selected);
            }
        }

        // 2. Generar nuevos con Gemini (si tocó probabilidad o si no hay suficientes)
        const anilistQuery = `
            query {
                Page(page: ${Math.floor(Math.random() * 10) + 1}, perPage: 10) {
                    media(type: ANIME, sort: POPULARITY_DESC) {
                        title { romaji english }
                    }
                }
            }
        `;
        
        const anilistRes = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: anilistQuery })
        });
        
        const anilistData = await anilistRes.json();
        const animeTitles = anilistData.data?.Page?.media?.map(m => m.title.english || m.title.romaji) || ["Naruto", "One Piece", "Bleach"];
        const selectedAnime = animeTitles[Math.floor(Math.random() * animeTitles.length)];

        const prompt = `Genera exactamente 5 preguntas trivia de dificultad media o dificil sobre el anime "${selectedAnime}" o animes populares en general. 
Devuelve estrictamente un array JSON válido sin texto adicional. 
Formato de cada objeto en el array:
{
  "anime_title": "Nombre del anime",
  "question": "Pregunta detallada",
  "options": ["Opcion A", "Opcion B", "Opcion C", "Opcion D"],
  "correct_answer": "Respuesta correcta (debe ser exacta a una de las opciones)",
  "difficulty": "medium" o "hard"
}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const geminiData = await geminiRes.json();
        
        if (!geminiData.candidates || geminiData.candidates.length === 0) {
             throw new Error('Gemini API returned empty response');
        }

        const generatedText = geminiData.candidates[0].content.parts[0].text;
        const generatedQuizzes = JSON.parse(generatedText);

        // 3. Guardar en Supabase para el futuro
        const { error: insertError } = await supabase
            .from('quizzes')
            .insert(generatedQuizzes);

        if (insertError) {
            console.error('Error guardando quizzes en Supabase:', insertError);
        }

        return res.status(200).json(generatedQuizzes);

    } catch (err) {
        console.error('Error detallado en API:', err.message || err);
        
        // A prueba de fallos: Si Gemini falla por cuota o timeout, salvamos la situación con la BD
        if (cachedQuizzes && cachedQuizzes.length > 0) {
            const shuffled = [...cachedQuizzes].sort(() => 0.5 - Math.random());
            return res.status(200).json(shuffled.slice(0, 5));
        }
        
        return res.status(200).json({ error: 'Aún no hay quizzes disponibles. ¡Prueba más tarde!' });
    }
}