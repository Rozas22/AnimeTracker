import React, { useState, useEffect } from 'react';
import { Trophy, Swords, Shield, Star, Crown, Tv, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ArenaView = ({ user, friendList, token, supabase, setQuizPoints }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeLeague, setActiveLeague] = useState('global');
  const [timeLeft, setTimeLeft] = useState('23:59:59');
  
  // Quiz State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizStatus, setQuizStatus] = useState('idle'); // idle | loading | playing | finished
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [userDbStats, setUserDbStats] = useState({ quiz: 0, monthly: 0, streak: 0 });

  // Calculate league badges
  const getLeagueInfo = (points) => {
    if (points < 100) return { name: 'Hierro', icon: '🛡️', class: 'league-iron' };
    if (points < 500) return { name: 'Bronce', icon: '🥉', class: 'league-bronze' };
    if (points < 1500) return { name: 'Plata', icon: '🥈', class: 'league-silver' };
    if (points < 3000) return { name: 'Oro', icon: '🥇', class: 'league-gold' };
    if (points < 6000) return { name: 'Platino', icon: '💎', class: 'league-platinum' };
    return { name: 'Diamante', icon: '👑', class: 'league-diamond' };
  };

  const calculateLevel = (watchedEps) => {
    let computedLevel = 1;
    let computedEps = watchedEps || 0;
    while (computedEps >= computedLevel * 10) {
        computedEps -= computedLevel * 10;
        computedLevel++;
    }
    return { computedLevel };
  };

  useEffect(() => {
    // Generate mock countdown for "daily reset"
    const interval = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const diff = endOfDay - now;
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const buildLeaderboard = async () => {
        if (!user) return;
        
        let players = [];
        let ids = [user.id];
        
        const validFriends = friendList.filter(f => f.name && f.id);
        validFriends.forEach(f => ids.push(f.id));

        let quizPointsMap = {};
        
        try {
            const { data, error } = await supabase
              .from('users')
              .select('anilist_id, quiz_points, anime_points, monthly_quiz_points, current_streak')
              .in('anilist_id', ids);
              
            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = {
                      quiz: row.quiz_points || 0,
                      anime: row.anime_points || 0,
                      monthly: row.monthly_quiz_points || 0,
                      streak: row.current_streak || 0
                    };
                });
                if (quizPointsMap[user.id]) {
                    setUserDbStats(quizPointsMap[user.id]);
                }
            } else {
                console.error("Supabase fetch failed in Arena:", error);
            }
        } catch (err) {
            console.error("Error fetching arena stats:", err);
        }

        const userPoints = quizPointsMap[user.id] || { quiz: 0, anime: 0, monthly: 0, streak: 0 };
        const userAnimePoints = userPoints.anime;
        const userEps = Math.floor(userAnimePoints / 10);
        
        players.push({
            id: user.id,
            name: user.name,
            avatar: user.avatar?.large || user.avatar,
            isMe: true,
            level: calculateLevel(userEps).computedLevel,
            animePoints: userAnimePoints,
            pl: userAnimePoints + userPoints.quiz,
            monthlyPl: userPoints.monthly,
            streak: userPoints.streak
        });

        validFriends.forEach(friend => {
            const statsStr = localStorage.getItem(`friend_stats_${friend.name}`);
            let stats = { computedLevel: 1, totalEps: 0, isPrivate: false };
            if (statsStr) {
                stats = JSON.parse(statsStr);
            }

            const friendPoints = quizPointsMap[friend.id] || { quiz: 0, anime: 0, monthly: 0, streak: 0 };
            const friendAnimePoints = friendPoints.anime || stats.totalEps * 10;

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                isPrivate: stats.isPrivate,
                level: stats.computedLevel,
                animePoints: friendAnimePoints,
                pl: friendAnimePoints + friendPoints.quiz,
                monthlyPl: friendPoints.monthly,
                streak: friendPoints.streak
            });
        });

        // We sort dynamically in the render depending on activeLeague
        setLeaderboard(players);
    };

    buildLeaderboard();
  }, [user, friendList, supabase]);

  const handleStartQuiz = async () => {
      const lastQuizStr = localStorage.getItem('lastQuizDate');
      const today = new Date().toDateString();
      
      if (lastQuizStr === today) {
          alert('Ya has jugado el Quiz Diario de hoy. ¡Vuelve mañana para ganar más PL!');
          return;
      }

      setShowQuizModal(true);
      setQuizStatus('loading');
      
      try {
          const res = await fetch('/api/generate-quiz');
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
      } catch (err) {
          console.error(err);
          alert('Hubo un error al preparar el quiz. Inténtalo de nuevo.');
          setShowQuizModal(false);
          setQuizStatus('idle');
      }
  };

  const handleAnswer = async (answer) => {
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
                  }).eq('anilist_id', user.id);
                  
                  // Actualizar localmente la tabla para no tener que recargar
                  setLeaderboard(prev => prev.map(p => {
                      if (p.id === user.id) {
                          return { 
                              ...p, 
                              pl: p.animePoints + currentStats.quiz,
                              monthlyPl: currentStats.monthly,
                              streak: currentStats.streak
                          };
                      }
                      return p;
                  }));
              } catch(e) {
                  console.error("Error guardando quiz points:", e);
              }
          }
      }
  };

  return (
    <div className="tab-content fade-in" style={{ padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'var(--font-display)' }}>Liga de Anime</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Compite con tus amigos. Gana Puntos de Liga (PL) viendo anime y completando quizzes.</p>
        
        <div className="arena-countdown">
           ⏳ {timeLeft}
        </div>
        
        <button 
           className="btn-primary" 
           style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #FF9800, #F44336)', border: 'none', borderRadius: '30px', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)' }}
           onClick={handleStartQuiz}
        >
           ✨ Jugar Quiz Diario (+PL)
        </button>
        {user?.name === 'Rozas22' && (
           <button
             onClick={() => {
                localStorage.removeItem('lastQuizDate');
                alert('Modo Dev: Restricción de fecha eliminada. Puedes jugar de nuevo.');
             }}
             style={{ display: 'block', margin: '1rem auto 0 auto', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}
           >
             🛠️ Reset Quiz (Modo Dev)
           </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0 1rem 0' }}>
        <button 
          onClick={() => setActiveLeague('global')}
          style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '20px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 'bold',
              background: activeLeague === 'global' ? 'var(--color-anilist-blue)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              transition: '0.3s'
          }}>
          🌍 Liga Global
        </button>
        <button 
          onClick={() => setActiveLeague('monthly')}
          style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '20px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 'bold',
              background: activeLeague === 'monthly' ? '#FF9800' : 'rgba(255,255,255,0.1)',
              color: 'white',
              transition: '0.3s'
          }}>
          📚 Conocimiento (Mensual)
        </button>
      </div>

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
        {[...leaderboard]
          .sort((a, b) => activeLeague === 'global' ? b.pl - a.pl : b.monthlyPl - a.monthlyPl)
          .map((player, index) => {
            const league = activeLeague === 'global' ? getLeagueInfo(player.pl) : getLeagueInfo(player.monthlyPl);
            const scoreToDisplay = activeLeague === 'global' ? player.pl : player.monthlyPl;
            const rank = index + 1;
            
            // Lógica de zonas (Ascenso Top 3, Descenso Bottom 2)
            let zoneClass = '';
            if (rank <= 3 && leaderboard.length > 3) zoneClass = 'promotion-zone';
            else if (rank > leaderboard.length - 2 && leaderboard.length > 5) zoneClass = 'relegation-zone';

            return (
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={player.id} 
                    className={`ranking-item ${rank <= 3 ? 'top-3' : ''} ${zoneClass}`}
                    style={player.isMe ? { border: '1px solid var(--accent)', background: 'rgba(var(--accent-rgb), 0.05)' } : {}}
                >
                    <div className="ranking-rank">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>
                    
                    <img src={player.avatar} alt={player.name} className="ranking-avatar" />
                    
                    <div className="ranking-info">
                        <div className="ranking-name">
                            {player.name}
                            {player.isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>TÚ</span>}
                            {activeLeague === 'monthly' && player.streak > 0 && (
                                <span style={{ fontSize: '0.8rem', color: '#FF9800', marginLeft: '6px', fontWeight: 'bold' }}>
                                    🔥 Racha: {player.streak}
                                </span>
                            )}
                            {player.isPrivate ? (
                                <span className="league-badge" style={{ background: 'transparent', color: '#888', border: '1px solid #444' }}>🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div className="ranking-score">{scoreToDisplay.toLocaleString()} PL</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {zoneClass === 'promotion-zone' ? <><TrendingUp size={12} color="#4CAF50"/> Ascenso</> : ''}
                            {zoneClass === 'relegation-zone' ? <><TrendingDown size={12} color="#F44336"/> Descenso</> : ''}
                        </div>
                    </div>
                </motion.div>
            )
        })}
      </div>
    </div>
  );
};

export default ArenaView;