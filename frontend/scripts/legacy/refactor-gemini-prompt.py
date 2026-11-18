import sys

with open('generate-quiz.js', 'r', encoding='utf-8') as f:
    code = f.read()

target_prompt = """        const prompt = `Genera exactamente 5 preguntas trivia de dificultad media o dificil sobre el anime "${selectedAnime}" o animes populares en general. 
Devuelve estrictamente un array JSON válido sin texto adicional. 
Formato de cada objeto en el array:
{
  "anime_title": "Nombre del anime",
  "question": "Pregunta detallada",
  "options": ["Opcion A", "Opcion B", "Opcion C", "Opcion D"],
  "correct_answer": "Respuesta correcta (debe ser exacta a una de las opciones)",
  "difficulty": "medium" o "hard"
}`;"""

replacement_prompt = """        const prompt = `Genera exactamente 5 preguntas trivia de dificultad media o dificil sobre el anime "${selectedAnime}" o animes populares en general. 
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
]`;"""

code = code.replace(target_prompt, replacement_prompt)

target_parse = """        const generatedText = geminiData.candidates[0].content.parts[0].text;
        const generatedQuizzes = JSON.parse(generatedText);"""

replacement_parse = """        let generatedText = geminiData.candidates[0].content.parts[0].text;
        // Limpieza de formato Markdown
        generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedQuizzes = JSON.parse(generatedText);"""

code = code.replace(target_parse, replacement_parse)

with open('generate-quiz.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Gemini prompt and JSON parsing updated!")