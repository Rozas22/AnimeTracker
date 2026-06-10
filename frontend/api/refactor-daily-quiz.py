import sys

with open('generate-quiz.js', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """        // Bloqueo estricto
        if (data && data.length > 0) {
            // Se envuelve data[0] en un array porque el frontend espera un array para quizQuestions.length
            return res.status(200).json([data[0]]); 
        }"""

replacement1 = """        // Lógica de Daily Challenge (Seed diario)
        if (data && data.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            let seed = 0;
            for(let i=0; i<today.length; i++) {
                seed += today.charCodeAt(i);
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
            
            // Devuelve 3 preguntas usando la semilla de hoy
            return res.status(200).json(shuffled.slice(0, 3)); 
        }"""
code = code.replace(target1, replacement1)

target2 = """const prompt = `Genera exactamente 5 preguntas trivia de dificultad media o dificil sobre el anime "${selectedAnime}" o animes populares en general. """

replacement2 = """const prompt = `Genera exactamente 3 preguntas trivia (1 fcil, 1 media, 1 difcil) sobre el anime "${selectedAnime}" o animes populares en general. """
code = code.replace(target2, replacement2)

with open('generate-quiz.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Quiz generation logic updated for Daily Challenge!")