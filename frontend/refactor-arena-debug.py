import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """        try {
            const { data, error } = await supabase
              .from('users')
              .select('anilist_id, quiz_points, anime_points, monthly_quiz_points, current_streak')
              .in('anilist_id', ids);
              
            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);"""

replacement = """        try {
            // DEBUG: Consulta sin filtros para verificar datos y tipos
            const { data, error } = await supabase
              .from('users')
              .select('*');
              
            if (!error && data) {
                console.log('Tabla de usuarios completa:', data);
                console.log('IDs que estamos buscando:', ids);"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView modified for debugging Supabase fetch!")