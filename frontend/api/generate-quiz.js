import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase (usa las variables de entorno de Vercel)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase Env Variables Debug:");
console.log("URL exists:", !!supabaseUrl);
console.log("Key exists:", !!supabaseKey);
console.log("Key starts with:", supabaseKey ? supabaseKey.substring(0, 5) + "..." : "null");

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. PRIORIDAD ABSOLUTA: Intentar obtener quizzes de la base de datos
        const { data, error } = await supabase.from('quizzes').select('*');
        console.log("Supabase fetch attempt:", { dataLength: data ? data.length : 0, error });

        // Bloqueo estricto
        if (data && data.length > 0) {
            // Se envuelve data[0] en un array porque el frontend espera un array para quizQuestions.length
            return res.status(200).json([data[0]]); 
        }

        // 2. FALLBACK A IA: Solo llegamos aquí si data.length es 0
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(404).json({ error: 'No IA key' });
        }

        // Obtener un anime aleatorio para el contexto (opcional)
        let selectedAnime = "One Piece";
        try {
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
            const animeTitles = anilistData.data?.Page?.media?.map(m => m.title.english || m.title.romaji);
            if (animeTitles && animeTitles.length > 0) {
                selectedAnime = animeTitles[Math.floor(Math.random() * animeTitles.length)];
            }
        } catch (e) {
            console.error('Fallo al obtener animes populares, usando default');
        }

        const prompt = `Genera exactamente 5 preguntas trivia de dificultad media o dificil sobre el anime "${selectedAnime}" o animes populares en general. 
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

        let generatedText = geminiData.candidates[0].content.parts[0].text;
        // Limpieza anti-markdown
        generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

        const generatedQuizzes = JSON.parse(generatedText);

        // 3. Guardar en Supabase para el futuro (la próxima vez entrará por la regla 1)
        const { error: insertError } = await supabase
            .from('quizzes')
            .insert(generatedQuizzes);

        if (insertError) {
            console.error('Error guardando quizzes en Supabase:', insertError);
        }

        return res.status(200).json(generatedQuizzes);

    } catch (err) {
        console.error('Error detallado en API:', err.message || err);
        return res.status(200).json({ error: 'No hay quizzes disponibles' });
    }
}