import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """  const handleAnswer = async (answer) => {
      const currentQ = quizQuestions[currentQuestionIndex];
      
      let isCorrect = (answer === currentQ.correct_answer);
      let newScore = quizScore;
      
      // Update in-memory DB stats for this question
      let currentStats = { ...userDbStats };
      if (isCorrect) {
          newScore += 100;
          setQuizScore(newScore);
          currentStats.quiz += 100;
          currentStats.monthly += 100;
          currentStats.streak += 1;
      } else {
          currentStats.streak = 0; // Reset racha on fail
      }
      setUserDbStats(currentStats); // Guardamos la racha y los puntos paso a paso en memoria

      if (currentQuestionIndex + 1 < quizQuestions.length) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
          setQuizStatus('finished');
          localStorage.setItem('lastQuizDate', new Date().toDateString());
          
          if (user) {
              if (setQuizPoints) setQuizPoints(currentStats.quiz);
              try {
                  // Guardamos todos los resultados finales (incluyendo racha final) de una sola vez
                  await supabase.from('users').update({ 
                      quiz_points: currentStats.quiz,
                      monthly_quiz_points: currentStats.monthly,
                      current_streak: currentStats.streak
                  }).eq('anilist_id', user.id);"""

replacement = """  const handleAnswer = async (answer) => {
      const currentQ = quizQuestions[currentQuestionIndex];
      
      let isCorrect = (answer === currentQ.correct_answer);
      let newScore = quizScore;
      
      let currentStats = { ...userDbStats };
      if (isCorrect) {
          newScore += 100;
          setQuizScore(newScore);
          currentStats.quiz += 100;
          currentStats.monthly += 100;
          currentStats.sessionCorrect = (currentStats.sessionCorrect || 0) + 1;
      } else {
          currentStats.sessionFailed = true;
      }
      setUserDbStats(currentStats);

      if (currentQuestionIndex + 1 < quizQuestions.length) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
          setQuizStatus('finished');
          localStorage.setItem('lastQuizDate', new Date().toDateString());
          
          if (user) {
              if (currentStats.sessionCorrect === quizQuestions.length && !currentStats.sessionFailed) {
                  // Acierto perfecto de las 3 preguntas
                  currentStats.streak = (currentStats.streak || 0) + 1;
              } else {
                  // Si falló alguna, racha vuelve a 0
                  currentStats.streak = 0;
              }

              if (setQuizPoints) setQuizPoints(currentStats.quiz);
              try {
                  await supabase.from('users').update({ 
                      quiz_points: currentStats.quiz,
                      monthly_quiz_points: currentStats.monthly,
                      current_streak: currentStats.streak
                  }).eq('anilist_id', user.id);"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView streak logic updated!")