import sys

with open('api/generate-quiz.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = """    try {
        // 1. PRIORIDAD ABSOLUTA: Intentar obtener quizzes de la base de datos
        const { data, error } = await supabase.from('quizzes').select('*');"""

replacement = """    try {
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

        // 1. PRIORIDAD ABSOLUTA: Intentar obtener quizzes de la base de datos
        let { data, error } = await supabase.from('quizzes').select('*');
        
        // Filtrar preguntas ya respondidas
        if (data && historyIds.length > 0) {
            data = data.filter(q => !historyIds.includes(q.id));
        }"""
        
code = code.replace(target, replacement)

with open('api/generate-quiz.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied to generate-quiz.js")