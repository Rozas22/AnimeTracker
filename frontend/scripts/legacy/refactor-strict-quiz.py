import sys

with open('generate-quiz.js', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """        // 1. PRIORIDAD ABSOLUTA: Intentar obtener quizzes de la base de datos
        const { data: cachedQuizzes, error: cacheError } = await supabase
            .from('quizzes')
            .select('*');

        // Si hay preguntas en Supabase (incluso si es solo 1), las usamos INMEDIATAMENTE
        if (!cacheError && cachedQuizzes && cachedQuizzes.length > 0) {
            // Mezclar y devolver (si hay menos de 5, devolverá las que haya)
            const shuffled = [...cachedQuizzes].sort(() => 0.5 - Math.random());
            return res.status(200).json(shuffled.slice(0, 5));
        }

        // 2. FALLBACK A IA: Solo llegamos aquí si la tabla quizzes está COMPLETAMENTE VACÍA
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('Error: GEMINI_API_KEY no configurada y la tabla quizzes está vacía.');
            return res.status(200).json({ error: 'No hay quizzes disponibles' });
        }"""

replacement1 = """        // 1. PRIORIDAD ABSOLUTA: Intentar obtener quizzes de la base de datos
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
        }"""

code = code.replace(target1, replacement1)

with open('generate-quiz.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Quiz strict logic updated!")