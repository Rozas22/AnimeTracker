import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_state = """  const [showQuizModal, setShowQuizModal] = useState(false);"""
replacement_state = """  const [activeLeague, setActiveLeague] = useState('global'); // 'global' or 'monthly'
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [userDbStats, setUserDbStats] = useState({ quiz: 0, monthly: 0, streak: 0 });"""
code = code.replace(target_state, replacement_state)

target_startquiz = """      try {
          const res = await fetch('/api/generate-quiz');
          if (!res.ok) throw new Error('Error al generar quiz');
          const data = await res.json();
          if (data.error) {
              alert(data.error);
              setShowQuizModal(false);
              return;
          }
          setQuizQuestions(data);
          setCurrentQuestionIndex(0);
          setQuizScore(0);
          setQuizStatus('playing');
      } catch (err) {"""

replacement_startquiz = """      try {
          // Fetch current DB stats before playing
          if (user) {
              const { data: dbData } = await supabase.from('users').select('quiz_points, monthly_quiz_points, current_streak').eq('anilist_id', user.id).single();
              if (dbData) {
                  setUserDbStats({ quiz: dbData.quiz_points || 0, monthly: dbData.monthly_quiz_points || 0, streak: dbData.current_streak || 0 });
              }
          }

          const res = await fetch('/api/generate-quiz');
          if (!res.ok) throw new Error('Error al generar quiz');
          const data = await res.json();
          if (data.error) {
              alert(data.error);
              setShowQuizModal(false);
              return;
          }
          setQuizQuestions(data);
          setCurrentQuestionIndex(0);
          setQuizScore(0);
          setQuizStatus('playing');
      } catch (err) {"""
code = code.replace(target_startquiz, replacement_startquiz)

target_handleanswer = """  const handleAnswer = async (answer) => {
      const currentQ = quizQuestions[currentQuestionIndex];
      let newScore = quizScore;
      if (answer === currentQ.correct_answer) {
          newScore += 100; // 100 PL per correct answer
          setQuizScore(newScore);
      }

      if (currentQuestionIndex + 1 < quizQuestions.length) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
          setQuizStatus('finished');
          // Save quiz result
          localStorage.setItem('lastQuizDate', new Date().toDateString());
          if (newScore > 0 && user && setQuizPoints) {
              const totalPoints = (quizPoints || 0) + newScore;
              setQuizPoints(totalPoints);
              try {
                  await supabase.from('users').update({ quiz_points: totalPoints }).eq('anilist_id', user.id);
                  // Trigger a refresh of the leaderboard locally
                  setLeaderboard(prev => prev.map(p => p.id === user.id ? { ...p, pl: p.pl + newScore } : p).sort((a,b)=>b.pl - a.pl));
              } catch (e) {
                  console.error('Error saving new score to Supabase', e);
              }
          }
      }
  };"""

replacement_handleanswer = """  const handleAnswer = async (answer) => {
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
                  }).eq('anilist_id', user.id);
                  
                  // Refrescar el leaderboard
                  setLeaderboard(prev => prev.map(p => p.id === user.id ? { 
                      ...p, 
                      pl: p.animePoints + currentStats.quiz,
                      monthlyPl: currentStats.monthly,
                      streak: currentStats.streak
                  } : p));
              } catch (e) {
                  console.error('Error saving new score to Supabase', e);
              }
          }
      }
  };"""

code = code.replace(target_handleanswer, replacement_handleanswer)


with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView refactored partly!")