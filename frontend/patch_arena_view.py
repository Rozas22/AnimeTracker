import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = "const res = await fetch('/api/generate-quiz');"
replacement1 = "const res = await fetch('/api/generate-quiz' + (user ? '?userId=' + user.id : ''));"
code = code.replace(target1, replacement1)

target2 = """              try {
                  await supabase.from('users').update({ 
                      quiz_points: currentStats.quiz,
                      monthly_quiz_points: currentStats.monthly,
                      current_streak: currentStats.streak
                  }).eq('anilist_id', user.id);"""

replacement2 = """              try {
                  // Guardar historial del quiz
                  if (quizQuestions && quizQuestions.length > 0) {
                      const historyInserts = quizQuestions.map(q => ({
                          user_id: String(user.id),
                          question_id: q.id
                      }));
                      await supabase.from('quiz_history').insert(historyInserts);
                      
                      // Limpieza (mantener mǭximo 30)
                      const { data: userHistory } = await supabase
                          .from('quiz_history')
                          .select('id')
                          .eq('user_id', String(user.id))
                          .order('created_at', { ascending: false });
                          
                      if (userHistory && userHistory.length > 30) {
                          const idsToDelete = userHistory.slice(30).map(h => h.id);
                          await supabase.from('quiz_history').delete().in('id', idsToDelete);
                      }
                  }

                  await supabase.from('users').update({ 
                      quiz_points: currentStats.quiz,
                      monthly_quiz_points: currentStats.monthly,
                      current_streak: currentStats.streak
                  }).eq('anilist_id', user.id);"""

code = code.replace(target2, replacement2)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied to ArenaView.jsx")