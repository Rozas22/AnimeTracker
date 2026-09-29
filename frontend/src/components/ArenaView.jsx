import React, { useState, useEffect } from 'react';
import { Trophy, Swords, Shield, Star, Crown, Tv, Target, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { trackEvent } from '../AnalyticsTracker';

const ArenaView = ({ user, anilistFriends, setQuizPoints }) => {
  const friendList = anilistFriends || [];
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeLeague, setActiveLeague] = useState('monthly');
  const [arenaScope, setArenaScope] = useState(() => localStorage.getItem('arenaScope') || 'friends');
  const [achievementsMap, setAchievementsMap] = useState({});
  const [timeLeft, setTimeLeft] = useState('23:59:59');
  
  // Quiz State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizStatus, setQuizStatus] = useState('idle'); // idle | loading | playing | finished
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [userDbStats, setUserDbStats] = useState({ quiz: 0, monthly: 0, streak: 0 });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [lastMonthWinner, setLastMonthWinner] = useState(null);
  const [monthWinnersHistory, setMonthWinnersHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

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
        const validFriends = friendList.filter(f => f.name && f.id);

        try {
            const { data, error } = await supabase
              .from('users')
              .select('*');
              
            if (!error && data) {
                let dbIds = new Set(data.map(r => r.anilist_id));
                data.forEach(row => {
                    if (row.anilist_id === user.id) {
                        setUserDbStats({
                          quiz: row.quiz_points || 0,
                          anime: row.anime_points || 0,
                          monthly: row.monthly_quiz_points || 0,
                          streak: row.current_streak || 0,
                          isPrivate: row.profile_visibility === 'private'
                        });
                    }

                    const isMe = row.anilist_id === user.id;
                    const friendMatch = validFriends.find(f => f.id === row.anilist_id);
                    const isFriend = !!friendMatch;

                    let avatar = isMe ? (user.avatar?.large || user.avatar) : (friendMatch?.avatar?.large || 'https://anilist.co/img/icons/icon.svg');
                    let isPrivate = row.profile_visibility === 'private';

                    const rowAnimePoints = row.anime_points || 0;
                    let computedLevel = 1;
                    let computedEps = Math.floor(rowAnimePoints / 10);
                    while (computedEps >= computedLevel * 10) {
                        computedEps -= computedLevel * 10;
                        computedLevel++;
                    }

                    players.push({
                        id: row.anilist_id,
                        name: row.username,
                        avatar: avatar,
                        isMe: isMe,
                        isFriend: isFriend,
                        isPrivate: isPrivate,
                        level: computedLevel,
                        animePoints: rowAnimePoints,
                        pl: rowAnimePoints + (row.quiz_points || 0),
                        monthlyPl: row.monthly_quiz_points || 0,
                        streak: row.current_streak || 0
                    });
                });

                // Add validFriends that are not in DB yet
                validFriends.forEach(friend => {
                    if (!dbIds.has(friend.id)) {
                        const statsStr = localStorage.getItem(`friend_stats_${friend.name}`);
                        let stats = { computedLevel: 1, totalEps: 0, isPrivate: false };
                        if (statsStr) stats = JSON.parse(statsStr);
                        const friendAnimePoints = stats.totalEps * 10;
                        players.push({
                            id: friend.id,
                            name: friend.name,
                            avatar: friend.avatar?.large,
                            isMe: false,
                            isFriend: true,
                            isPrivate: stats.isPrivate,
                            level: stats.computedLevel,
                            animePoints: friendAnimePoints,
                            pl: friendAnimePoints,
                            monthlyPl: 0,
                            streak: 0
                        });
                    }
                });

                if (!dbIds.has(user.id)) {
                    players.push({
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar?.large || user.avatar,
                        isMe: true,
                        isFriend: false,
                        isPrivate: false,
                        level: 1,
                        animePoints: 0,
                        pl: 0,
                        monthlyPl: 0,
                        streak: 0
                    });
                }
            } else {
                console.error("Supabase fetch failed in Arena:", error);
            }

            // Fetch achievements
            const { data: achData, error: achError } = await supabase
              .from('user_achievements')
              .select('*');
            
            if (!achError && achData) {
                let achMap = {};
                achData.forEach(ach => {
                    if (ach.achievement_type === 'monthly_winner') {
                        achMap[ach.anilist_id] = (achMap[ach.anilist_id] || 0) + 1;
                    }
                });
                setAchievementsMap(achMap);
            }

            // Fetch monthly winners history
            const { data: winnersData } = await supabase
                .from('monthly_winners')
                .select('*')
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (winnersData && winnersData.length > 0) {
                const enriched = winnersData.map(w => {
                    const match = players.find(p => String(p.id) === String(w.anilist_id));
                    return {
                        ...w,
                        username: w.username || match?.name || `Usuario #${w.anilist_id}`,
                        avatar_url: w.avatar_url || match?.avatar || null
                    };
                });
                setLastMonthWinner(enriched[0]);
                setMonthWinnersHistory(enriched);
            }
        } catch (err) {
            console.error("Error fetching arena stats:", err);
        }

        // We sort dynamically in the render depending on activeLeague
        setLeaderboard(players);
    };

    buildLeaderboard();
  }, [user, friendList, supabase]);

  const handleStartQuiz = async () => {
    const lastQuizStr = localStorage.getItem('lastQuizDate');
    const d = new Date();
    const todayLocal = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
    
    if (lastQuizStr === todayLocal) {
        alert('Ya has jugado el Quiz Diario de hoy. ¡Vuelve mañana a las 00:00 (hora local) para ganar más PL!');
        return;
    }

    setShowQuizModal(true);
    setQuizStatus('loading');
    
    try {
        const userIdParam = user ? `userId=${user.id}` : '';
        const dateParam = `localDate=${todayLocal}`;
        const queryParams = [userIdParam, dateParam].filter(Boolean).join('&');
        const res = await fetch(`/api/generate-quiz?${queryParams}`);
        const data = await res.json();
        if (data.error) {
            alert(data.error);
            setShowQuizModal(false);
            return;
        }
        setQuizQuestions(data);
        setCurrentQuestionIndex(0);
        setQuizScore(0);
        setStreakCount(0);
        setBonusPoints(0);
        setQuizStatus('playing');
        trackEvent('quiz_start', { userId: user?.id });
    } catch (err) {
        console.error(err);
        alert('Hubo un error al preparar el quiz. Inténtalo de nuevo.');
        setShowQuizModal(false);
        setQuizStatus('idle');
    }
  };

  const handleAnswer = async (answer) => {
      if (isAnswering) return;
      setIsAnswering(true);
      setSelectedAnswer(answer);

      const currentQ = quizQuestions[currentQuestionIndex];
      
      let isCorrect = (answer === currentQ.correct_answer);
      let newScore = quizScore;
      
      let currentStats = { ...userDbStats };
      let newStreak = streakCount;

      if (isCorrect) {
          newScore += 60;
          currentStats.quiz += 60;
          currentStats.monthly += 60;
          currentStats.sessionCorrect = (currentStats.sessionCorrect || 0) + 1;
          newStreak += 1;
      } else {
          currentStats.sessionFailed = true;
          newStreak = 0;
      }

      let appliedBonus = 0;
      if (currentQuestionIndex + 1 === quizQuestions.length && newStreak === 5) {
          appliedBonus = 500;
          newScore += appliedBonus;
          currentStats.quiz += appliedBonus;
          currentStats.monthly += appliedBonus;
      }

      setBonusPoints(appliedBonus);
      setStreakCount(newStreak);

      // Wait 1.5s to show color feedback
      await new Promise(r => setTimeout(r, 1500));

      setQuizScore(newScore);
      setUserDbStats(currentStats);
      setSelectedAnswer(null);
      setIsAnswering(false);

      if (currentQuestionIndex + 1 < quizQuestions.length) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
          setQuizStatus('finished');
          trackEvent('quiz_finish', { score: newScore, userId: user?.id });
          const dFinish = new Date();
          const todayLocalFinish = dFinish.getFullYear() + '-' + (dFinish.getMonth() + 1).toString().padStart(2, '0') + '-' + dFinish.getDate().toString().padStart(2, '0');
          localStorage.setItem('lastQuizDate', todayLocalFinish);
          
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
    <div className="tab-content fade-in arena-container">
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '2rem 0 1rem 0', width: '100%', boxSizing: 'border-box' }}>
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
            ⏱️ Liga Mensual
          </button>
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
            onClick={() => setActiveLeague('legends')}
            style={{ 
                padding: '0.6rem 1.5rem', 
                borderRadius: '20px', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: 'bold',
                background: activeLeague === 'legends' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                color: 'white',
                transition: '0.3s'
            }}>
            👑 Leyendas del Mes
          </button>
        </div>
      </div>

      {/* ─── CAMPEON DEL MES ANTERIOR ─────────────────────────────── */}
      {lastMonthWinner && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(255,152,0,0.08))',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🏆</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(245,158,11,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              Campeon de {['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][lastMonthWinner.month]} {lastMonthWinner.year}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {lastMonthWinner.avatar_url && (
                <img
                  src={lastMonthWinner.avatar_url}
                  alt={lastMonthWinner.username}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #f59e0b', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b' }}>
                  {lastMonthWinner.username || `Usuario #${lastMonthWinner.anilist_id}`}
                  {user && lastMonthWinner.anilist_id === user.id && (
                    <span style={{ marginLeft: 8, fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b', borderRadius: 8, padding: '2px 8px' }}>Eres tu!</span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  {lastMonthWinner.score?.toLocaleString()} PL en ese mes
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(v => !v)}
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 10, padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}
          >
            {showHistory ? 'Ocultar historial' : 'Ver historial'}
          </button>
        </div>
      )}

      {/* ─── HISTORIAL DE CAMPEONES ───────────────────────────────── */}
      {showHistory && monthWinnersHistory.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Historial de Campeones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {monthWinnersHistory.map((w, i) => {
              const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', minWidth: 110 }}>{monthNames[w.month]} {w.year}</span>
                  {w.avatar_url && (
                    <img src={w.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.username || `#${w.anilist_id}`}
                    {user && w.anilist_id === user.id && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#f59e0b' }}>Tu</span>}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>{w.score?.toLocaleString()} PL</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicador del mes en curso cuando se ve el ranking mensual */}
      {activeLeague === 'monthly' && (
        <div style={{ textAlign: 'center', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Ranking de {['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][new Date().getMonth() + 1]} {new Date().getFullYear()} — se reinicia el 1 del proximo mes
        </div>
      )}

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <span>Pregunta {currentQuestionIndex + 1} de {quizQuestions.length}</span>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  {streakCount > 0 && (
                                    <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }} className="pulse-anim">
                                      🔥 Racha x{streakCount}
                                    </span>
                                  )}
                                  <span style={{ color: 'var(--color-accent-gold)', fontWeight: 'bold' }}>{quizQuestions[currentQuestionIndex].difficulty.toUpperCase()}</span>
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <span style={{ 
                                    display: 'inline-block',
                                    background: 'rgba(61, 180, 242, 0.15)',
                                    color: 'var(--color-anilist-blue)',
                                    border: '1px solid var(--color-anilist-blue)',
                                    padding: '4px 12px',
                                    borderRadius: '16px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    marginBottom: '1rem',
                                    maxWidth: '100%',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {quizQuestions[currentQuestionIndex].anime_title}
                                </span>
                                <h3 style={{ fontSize: '1.3rem', margin: 0, lineHeight: '1.5' }}>
                                    {quizQuestions[currentQuestionIndex].question}
                                </h3>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {quizQuestions[currentQuestionIndex].options.map((opt, i) => {
                                    let bg = 'rgba(255,255,255,0.05)';
                                    if (isAnswering) {
                                        if (opt === quizQuestions[currentQuestionIndex].correct_answer) {
                                            bg = '#22c55e'; // Green
                                        } else if (opt === selectedAnswer) {
                                            bg = '#ef4444'; // Red
                                        }
                                    }
                                    return (
                                      <button 
                                          key={i} 
                                          className="btn-secondary"
                                          style={{ 
                                            padding: '1.2rem 1rem', 
                                            fontSize: '1.05rem', 
                                            textAlign: 'left', 
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word', 
                                            height: 'auto', 
                                            background: bg,
                                            transition: 'background-color 0.3s ease',
                                            cursor: isAnswering ? 'default' : 'pointer'
                                          }}
                                          onClick={() => handleAnswer(opt)}
                                          disabled={isAnswering}
                                      >
                                          {opt}
                                      </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {quizStatus === 'finished' && (
                        <div style={{ padding: '2rem 1rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--color-accent-gold)' }}>¡Quiz Completado!</h2>
                            
                            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                              Puntuación Base: <strong style={{ color: 'var(--accent)' }}>+{quizScore - bonusPoints} PL</strong>
                            </p>
                            
                            {bonusPoints > 0 && (
                              <motion.p 
                                initial={{ scale: 0.8, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                transition={{ delay: 0.3 }}
                                style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: '#f59e0b', fontWeight: 'bold' }}
                              >
                                🔥 Bonus de Perfección: +{bonusPoints} PL
                              </motion.p>
                            )}
                            
                            {bonusPoints === 0 && (
                              <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Has ganado <strong style={{ color: 'var(--accent)' }}>+{quizScore} PL</strong> para tu liga.</p>
                            )}

                            <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowQuizModal(false)}>
                                Volver a la Arena
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      {/* Scope Toggle (Mis Amigos vs Liga Global) */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
          <button
            onClick={() => { setArenaScope('friends'); localStorage.setItem('arenaScope', 'friends'); }}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              background: arenaScope === 'friends' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: arenaScope === 'friends' ? '#fff' : 'var(--color-text-secondary)',
              transition: '0.2s'
            }}
          >
            👥 Mis Amigos
          </button>
          <button
            onClick={() => { setArenaScope('global'); localStorage.setItem('arenaScope', 'global'); }}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              background: arenaScope === 'global' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: arenaScope === 'global' ? '#fff' : 'var(--color-text-secondary)',
              transition: '0.2s'
            }}
          >
            🌍 Toda la Arena
          </button>
        </div>
      </div>
      
      {arenaScope === 'global' && userDbStats?.isPrivate && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={16} /> Tu perfil está en modo privado. Solo tus amigos pueden verte en sus rankings.
        </div>
      )}
      <div className="ranking-list">
        {[...leaderboard]
          .filter(player => {
             if (arenaScope === 'global') {
                if (player.isPrivate && !player.isMe) return false;
                return true;
             }
             return player.isMe || player.isFriend;
          })
          .filter(player => activeLeague !== 'legends' || (achievementsMap[player.id] && achievementsMap[player.id] > 0))
          .sort((a, b) => {
             if (activeLeague === 'legends') return (achievementsMap[b.id] || 0) - (achievementsMap[a.id] || 0);
             return activeLeague === 'global' ? b.pl - a.pl : b.monthlyPl - a.monthlyPl;
          })
          .map((player, index) => {
            const league = activeLeague === 'global' || activeLeague === 'legends' ? getLeagueInfo(player.pl) : getLeagueInfo(player.monthlyPl);
            const scoreToDisplay = activeLeague === 'global' || activeLeague === 'legends' ? player.pl : player.monthlyPl;
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
                            <span className="truncate-text">{player.name}</span>
                            {arenaScope === 'global' && player.isFriend && !player.isMe && (
                                <span style={{ marginLeft: '6px', color: '#10b981' }} title="Es tu amigo">👥</span>
                            )}
                            {achievementsMap[player.id] > 0 && (
                                <span style={{ marginLeft: '4px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center' }} title={`Ganador Mensual x${achievementsMap[player.id]}`}>👑<span style={{fontSize: '0.7rem', marginLeft: '2px'}}>x{achievementsMap[player.id]}</span></span>
                            )}
                            {player.isMe && <span className="badge-me">TÚ</span>}
                            {activeLeague === 'monthly' && player.streak > 0 && (
                                <span className="badge-streak">🔥 Racha: {player.streak}</span>
                            )}
                            {player.isPrivate ? (
                                <span className="league-badge badge-private">🔒 Privado</span>
                            ) : (
                                <span className={`league-badge ${league.class}`}>{league.icon} {league.name}</span>
                            )}
                        </div>
                    </div>

                    <div className="ranking-score-container">
                        {activeLeague === 'legends' ? (
                            <div className="ranking-score" style={{color: '#f59e0b'}}>👑 {achievementsMap[player.id]} Victorias</div>
                        ) : (
                            <div className="ranking-score">{scoreToDisplay.toLocaleString()} PL</div>
                        )}
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