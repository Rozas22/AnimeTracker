import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Trophy, Clock, TrendingUp, TrendingDown, Swords } from 'lucide-react';
import { calculatePL, getLeagueInfo, calculateLevel } from '../leagueUtils';
import { supabase } from '../supabase';

const ArenaView = ({ user, anilistFriends, quizPoints, setQuizPoints }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Arena montada');
  }, []);
  const [timeLeft, setTimeLeft] = useState('');
  const [activeLeague, setActiveLeague] = useState('global'); // 'global' or 'monthly'
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [userDbStats, setUserDbStats] = useState({ quiz: 0, monthly: 0, streak: 0 });
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStatus, setQuizStatus] = useState('idle'); // idle, loading, playing, finished



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
  };

  // Temporizador semanal (Termina el domingo a medianoche)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(23, 59, 59, 999);
      if (now.getDay() === 0 && now.getHours() > 0) {
          nextSunday.setDate(now.getDate() + 7);
      }
      
      const difference = nextSunday.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft('Calculando nueva liga...');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // 1. Fetch Quiz Points for all friends + current user
        // Extract IDs
        const ids = [user.id, ...(anilistFriends || []).map(f => f.id)];
        
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
            } else if (error) {
                console.log('Supabase query error:', error);
            }
        } catch(e) {
            console.error("Error fetching from supabase", e);
        }

        // 2. Build array
        let players = [];
        
        // Add current user
        const userEps = user?.statistics?.anime?.episodesWatched || 0;
        const userPoints = quizPointsMap[user.id] || { quiz: 0, anime: 0 };
        // Fallback to realEps * 10 if anime_points is 0 (just in case they haven't synced yet)
        const userAnimePoints = userPoints.anime > 0 ? userPoints.anime : (userEps * 10);
        
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

        // Add friends using points from Supabase as Source of Truth
        anilistFriends?.forEach(friend => {
            const realEps = friend.statistics?.anime?.episodesWatched || 0;
            const friendPoints = quizPointsMap[friend.id] || { quiz: 0, anime: 0 };
            const friendAnimePoints = friendPoints.anime > 0 ? friendPoints.anime : (realEps * 10);
            
            // Supabase is the source of truth for episodes (anime_points / 10)
            const friendEpisodes = friendPoints.anime > 0 ? Math.floor(friendPoints.anime / 10) : (friend.statistics?.anime?.episodesWatched);
            
            const stats = calculateLevel(friendEpisodes);

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: stats.computedLevel,
                isPrivate: stats.isPrivate,
                pl: friendAnimePoints + friendPoints.quiz
            });
        });

        // We sort dynamically in the render depending on activeLeague
        setLeaderboard(players);

      } catch (error) {
        console.error("Error building leaderboard", error);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [user, anilistFriends]);

  if (loading) {
      return (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="loader"></div>
              <p>Cargando Arena...</p>
          </div>
      );
  }

  return (
    <div className="arena-view" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', width: '100%', position: 'relative', zIndex: 100 }}>
      <div className="arena-header">
        <Swords size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
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
                            {player.isPrivate ? (
                                <span className="league-badge" style={{ background: 'transparent', color: '#888', border: '1px solid #444' }}>🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div className="ranking-score">{player.pl.toLocaleString()} PL</div>
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
