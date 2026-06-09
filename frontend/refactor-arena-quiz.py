import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imports
imports = """import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
"""
code = code.replace("import React, { useState, useEffect } from 'react';\nimport { motion } from 'framer-motion';", imports)

# Update signature
code = code.replace("const ArenaView = ({ user, anilistFriends }) => {", "const ArenaView = ({ user, anilistFriends, quizPoints, setQuizPoints }) => {")

# Add Quiz States
states_target = "const [timeLeft, setTimeLeft] = useState('');"
states_new = """const [timeLeft, setTimeLeft] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStatus, setQuizStatus] = useState('idle'); // idle, loading, playing, finished
"""
code = code.replace(states_target, states_new)

# Add Quiz Logic functions
logic = """
  const handleStartQuiz = async () => {
      const lastQuizStr = localStorage.getItem('lastQuizDate');
      const today = new Date().toDateString();
      if (lastQuizStr === today) {
          alert('Ya has jugado el Quiz Diario de hoy. ¡Vuelve mañana para ganar más PL!');
          return;
      }

      setQuizStatus('loading');
      setShowQuizModal(true);

      try {
          const res = await fetch('/api/generate-quiz');
          if (!res.ok) throw new Error('Error al generar quiz');
          const data = await res.json();
          setQuizQuestions(data);
          setCurrentQuestionIndex(0);
          setQuizScore(0);
          setQuizStatus('playing');
      } catch (err) {
          console.error(err);
          alert('Hubo un error al preparar el quiz. Inténtalo de nuevo.');
          setShowQuizModal(false);
          setQuizStatus('idle');
      }
  };

  const handleAnswer = async (answer) => {
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
  };
"""
code = code.replace("  // Temporizador semanal (Termina el domingo a medianoche)", logic + "\n  // Temporizador semanal (Termina el domingo a medianoche)")

# Add Play Quiz button in UI
target_button = """        <div className="arena-countdown">
           ⏳ {timeLeft}
        </div>
      </div>"""
new_button = """        <div className="arena-countdown">
           ⏳ {timeLeft}
        </div>
        
        <button 
           className="btn-primary" 
           style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #FF9800, #F44336)', border: 'none', borderRadius: '30px', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)' }}
           onClick={handleStartQuiz}
        >
           ✨ Jugar Quiz Diario (+PL)
        </button>
      </div>"""
code = code.replace(target_button, new_button)

# Add Quiz Modal JSX
target_modal = """      <div className="ranking-list">"""
modal_jsx = """
      <AnimatePresence>
        {showQuizModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                style={{ zIndex: 1000 }}
            >
                <div className="modal-content" style={{ maxWidth: '500px', width: '90%', textAlign: 'center' }}>
                    {quizStatus === 'loading' && (
                        <div style={{ padding: '3rem 1rem' }}>
                            <div className="loader" style={{ margin: '0 auto 1.5rem' }}></div>
                            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>Invocando al Oráculo...</h3>
                            <p style={{ color: 'var(--color-text-secondary)' }}>La IA está generando preguntas únicas para ti. Puede tardar un poco la primera vez.</p>
                        </div>
                    )}

                    {quizStatus === 'playing' && quizQuestions[currentQuestionIndex] && (
                        <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                <span>Pregunta {currentQuestionIndex + 1} de {quizQuestions.length}</span>
                                <span style={{ color: 'var(--color-accent-gold)', fontWeight: 'bold' }}>{quizQuestions[currentQuestionIndex].difficulty.toUpperCase()}</span>
                            </div>
                            
                            <h3 style={{ fontSize: '1.3rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                                {quizQuestions[currentQuestionIndex].question}
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {quizQuestions[currentQuestionIndex].options.map((opt, i) => (
                                    <button 
                                        key={i} 
                                        className="btn-secondary"
                                        style={{ padding: '1rem', fontSize: '1rem', textAlign: 'left', whiteSpace: 'normal', height: 'auto', background: 'rgba(255,255,255,0.05)' }}
                                        onClick={() => handleAnswer(opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {quizStatus === 'finished' && (
                        <div style={{ padding: '2rem 1rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--color-accent-gold)' }}>¡Quiz Completado!</h2>
                            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Has ganado <strong style={{ color: 'var(--accent)' }}>+{quizScore} PL</strong> para tu liga.</p>
                            <button className="btn-primary" onClick={() => setShowQuizModal(false)}>
                                Volver a la Arena
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      <div className="ranking-list">
"""
code = code.replace(target_modal, modal_jsx)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView Quiz Logic added!")