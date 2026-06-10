import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Verificación de Seguridad (Cron Secret)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
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
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                geminiData = await geminiRes.json();

                if (!geminiData.candidates || geminiData.candidates.length === 0) {
                     throw new Error('Gemini API devolvió una respuesta vacía');
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

        return res.status(200).json({ success: true, count: generatedQuizzes.length, animes: selectedAnimes });

    } catch (err) {
        console.error('Error Crítico en Cron Job:', err.message || err);
        return res.status(500).json({ error: 'Fallo al ejecutar el cron job', details: err.message });
    }
}