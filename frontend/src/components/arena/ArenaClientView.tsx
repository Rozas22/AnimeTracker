'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Swords,
  Trophy,
  Crown,
  Sparkles,
  Timer,
  CheckCircle2,
  XCircle,
  Gift,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  resolveUnifiedUserLevel,
  calculatePL,
  getLeagueInfo,
  FRAME_STYLES,
} from '@/lib/league';
import {
  getDailyQuizQuestionsAction,
  submitQuizAnswerAction,
  type PublicQuizQuestion,
} from '@/lib/arena/actions';
import type {
  UserProfileRow,
  MonthlyWinnerRow,
  MonthlyPrizeRow,
} from '@/types/database';

export interface ArenaClientViewProps {
  initialUsers: UserProfileRow[];
  monthlyWinners: MonthlyWinnerRow[];
  activePrize: MonthlyPrizeRow | null;
  currentUserId: number;
}

type LeagueTab = 'monthly' | 'global' | 'legends';

const MONTH_NAMES: readonly string[] = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function ArenaClientView({
  initialUsers,
  monthlyWinners,
  activePrize,
  currentUserId,
}: ArenaClientViewProps): React.JSX.Element {
  const [users, setUsers] = useState<UserProfileRow[]>(initialUsers);
  const [activeLeague, setActiveLeague] = useState<LeagueTab>('monthly');
  const [showWinnersHistory, setShowWinnersHistory] = useState<boolean>(false);

  // Estado del Quiz Diario Interactivo
  const [quizOpen, setQuizOpen] = useState<boolean>(false);
  const [questions, setQuestions] = useState<PublicQuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealedCorrect, setRevealedCorrect] = useState<string | null>(null);
  const [sessionPoints, setSessionPoints] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const lastWinner = monthlyWinners[0] ?? null;

  // Mapa de coronas mensuales acumuladas por anilist_id
  const crownsByUser = useMemo(() => {
    const map: Record<number, number> = {};
    for (const w of monthlyWinners) {
      map[w.anilist_id] = (map[w.anilist_id] ?? 0) + 1;
    }
    return map;
  }, [monthlyWinners]);

  // Temporizador por pregunta del Quiz (15s)
  useEffect(() => {
    if (!quizOpen || quizFinished || selectedOption !== null) return;

    if (timeLeft <= 0) {
      void handleSelectAnswer('__TIMEOUT__');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [quizOpen, quizFinished, selectedOption, timeLeft]);

  const handleStartQuiz = async (): Promise<void> => {
    const fetched = await getDailyQuizQuestionsAction();
    setQuestions(fetched);
    setCurrentQIndex(0);
    setTimeLeft(15);
    setSelectedOption(null);
    setRevealedCorrect(null);
    setSessionPoints(0);
    setQuizFinished(false);
    setQuizOpen(true);
  };

  const handleSelectAnswer = async (option: string): Promise<void> => {
    const currentQuestion = questions[currentQIndex];
    if (!currentQuestion || isVerifying || selectedOption !== null) return;

    setSelectedOption(option);
    setIsVerifying(true);

    try {
      const result = await submitQuizAnswerAction({
        questionId: currentQuestion.id,
        selectedOption: option,
        anilistUserId: currentUserId,
        timeRemainingSeconds: timeLeft,
      });

      setRevealedCorrect(result.correctAnswer);

      if (result.isCorrect) {
        setSessionPoints((prev) => prev + result.pointsAwarded);
        setUsers((prev) =>
          prev.map((u) =>
            u.anilist_id === currentUserId
              ? {
                  ...u,
                  monthly_quiz_points:
                    (u.monthly_quiz_points || 0) + result.pointsAwarded,
                  quiz_points: (u.quiz_points || 0) + result.pointsAwarded,
                }
              : u
          )
        );
      }

      setTimeout(() => {
        if (currentQIndex + 1 < questions.length) {
          setCurrentQIndex((i) => i + 1);
          setSelectedOption(null);
          setRevealedCorrect(null);
          setTimeLeft(15);
        } else {
          setQuizFinished(true);
          void confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }, 1500);
    } finally {
      setIsVerifying(false);
    }
  };

  // Ranking ordenado según la pestaña activa
  const sortedLeaderboard = useMemo(() => {
    const copy = [...users];
    if (activeLeague === 'monthly') {
      return copy.sort(
        (a, b) => (b.monthly_quiz_points || 0) - (a.monthly_quiz_points || 0)
      );
    }
    if (activeLeague === 'legends') {
      return copy.sort(
        (a, b) =>
          (crownsByUser[b.anilist_id] ?? 0) - (crownsByUser[a.anilist_id] ?? 0)
      );
    }
    return copy.sort((a, b) => {
      const plA = (a.anime_points || 0) + (a.quiz_points || 0);
      const plB = (b.anime_points || 0) + (b.quiz_points || 0);
      return plB - plA;
    });
  }, [users, activeLeague, crownsByUser]);

  const currentQuestion = questions[currentQIndex] ?? null;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          CABECERA ARENA + BOTÓN QUIZ DIARIO 2.0
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="bento-card relative overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-kurama/15 blur-3xl"
        />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-kurama/20 border border-kurama/40 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-kurama">
            <Swords className="h-3.5 w-3.5" />
            Arena Competitiva &amp; Quiz Anti-Cheat
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Liga de Anime KuramaTracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Compite cada mes desde cero en la Liga Mensual respondiendo el Quiz Diario, o escala en la Liga Global con tu historial completo de AniList.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleStartQuiz()}
          className="relative z-10 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-kurama-500 via-amber-500 to-orange-500 px-6 py-4 font-display text-sm font-extrabold text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.45)] transition-all hover:scale-105 hover:brightness-110 active:scale-95 shrink-0"
        >
          <Sparkles className="h-5 w-5" />
          Jugar Quiz Diario (+PL)
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FILA DE PODIO: CAMPEÓN DEL MES ANTERIOR + PREMIO DEL MES
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card Campeón del Mes Anterior */}
        <div className="bento-card lg:col-span-7 p-6 border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-card to-card flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-400/50 text-3xl shadow-[0_0_25px_rgba(245,158,11,0.35)]">
                🏆
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  {lastWinner
                    ? `Campeón de ${MONTH_NAMES[lastWinner.month] ?? ''} ${lastWinner.year}`
                    : 'Campeón Mensual Vigente'}
                </span>
                <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
                  {lastWinner?.username ?? 'Rozas22'}
                  {lastWinner?.anilist_id === currentUserId && (
                    <span className="rounded-full bg-kurama text-slate-950 px-2.5 py-0.5 text-[10px] font-extrabold">
                      ¡ERES TÚ!
                    </span>
                  )}
                </h2>
                <p className="text-xs text-amber-200/80 font-semibold">
                  {(lastWinner?.score ?? 4780).toLocaleString('es-ES')} PL obtenidos en el mes
                </p>
              </div>
            </div>

            {monthlyWinners.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWinnersHistory((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-bold text-amber-200"
              >
                <span>Historial ({monthlyWinners.length})</span>
                {showWinnersHistory ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          {showWinnersHistory && monthlyWinners.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
              {monthlyWinners.map((w, idx) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-xl bg-background/60 border border-white/[0.07] px-3.5 py-2 text-xs"
                >
                  <span className="font-semibold text-white">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🏅'}{' '}
                    {MONTH_NAMES[w.month]} {w.year} —{' '}
                    <strong className="text-kurama">
                      {w.username ?? `#${w.anilist_id}`}
                    </strong>
                  </span>
                  <span className="font-bold text-slate-300">
                    {w.score.toLocaleString('es-ES')} PL
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Premio Mensual */}
        <div className="bento-card lg:col-span-5 p-6 flex flex-col justify-between space-y-3 border-kurama/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kurama/15 border border-kurama/35 text-kurama">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-kurama">
                Recompensa Mensual Activa
              </span>
              <h3 className="font-display text-lg font-extrabold text-white">
                {activePrize?.title ?? 'Premio Exclusivo de Temporada'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {activePrize?.description ??
              'El jugador que finalice en el 1er puesto de la Liga Mensual el día 1 del mes se lleva el premio oficial y la corona permanente.'}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SELECTOR DE LIGAS Y TABLA DE CLASIFICACIÓN
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveLeague('monthly')}
          className={cn(
            'rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all border',
            activeLeague === 'monthly'
              ? 'bg-kurama text-slate-950 border-kurama shadow-lg'
              : 'bg-card/70 text-muted-foreground border-white/10 hover:text-white'
          )}
        >
          ⏱️ Liga Mensual (Mes en Curso)
        </button>
        <button
          type="button"
          onClick={() => setActiveLeague('global')}
          className={cn(
            'rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all border',
            activeLeague === 'global'
              ? 'bg-sky-400 text-slate-950 border-sky-400 shadow-lg'
              : 'bg-card/70 text-muted-foreground border-white/10 hover:text-white'
          )}
        >
          🌍 Liga Global (AniList + Quiz)
        </button>
        <button
          type="button"
          onClick={() => setActiveLeague('legends')}
          className={cn(
            'rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all border',
            activeLeague === 'legends'
              ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg'
              : 'bg-card/70 text-muted-foreground border-white/10 hover:text-white'
          )}
        >
          👑 Leyendas del Mes (Coronas)
        </button>
      </div>

      {/* Tabla de Ranking */}
      <div className="bento-card divide-y divide-white/[0.06] overflow-hidden">
        {sortedLeaderboard.map((player, idx) => {
          const levelData = resolveUnifiedUserLevel({
            supabaseAnimePoints: player.anime_points,
            supabaseStoredLevel: player.level,
          });
          const episodes = levelData.totalEpisodesWatched;
          const totalPL = calculatePL(episodes, player.quiz_points || 0);
          const league = getLeagueInfo(totalPL);
          const frame = FRAME_STYLES[levelData.unlockedFrame];
          const crowns = crownsByUser[player.anilist_id] ?? 0;

          const displayScore =
            activeLeague === 'monthly'
              ? `${(player.monthly_quiz_points || 0).toLocaleString('es-ES')} PL`
              : activeLeague === 'legends'
                ? `${crowns} ${crowns === 1 ? 'Corona' : 'Coronas'}`
                : `${totalPL.toLocaleString('es-ES')} PL`;

          return (
            <div
              key={player.anilist_id}
              className={cn(
                'flex items-center justify-between gap-4 p-4 sm:px-6 transition-colors hover:bg-white/[0.03]',
                player.anilist_id === currentUserId && 'bg-kurama/[0.07]'
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className={cn(
                    'w-7 font-display text-lg font-extrabold text-center shrink-0',
                    idx === 0
                      ? 'text-amber-400'
                      : idx === 1
                        ? 'text-slate-300'
                        : idx === 2
                          ? 'text-amber-600'
                          : 'text-muted-foreground'
                  )}
                >
                  #{idx + 1}
                </span>

                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-display text-xs font-extrabold text-kurama',
                    frame.ringClass
                  )}
                >
                  {(player.username ?? 'KT').slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm sm:text-base font-extrabold text-white truncate">
                      {player.username ?? `Usuario #${player.anilist_id}`}
                    </p>
                    {crowns > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <Crown className="h-3 w-3" />
                        {crowns}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nv. {levelData.computedLevel} • {league.icon} {league.name}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-display text-base sm:text-lg font-extrabold text-kurama">
                  {displayScore}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {activeLeague === 'monthly'
                    ? 'Puntos del mes'
                    : activeLeague === 'legends'
                      ? 'Títulos ganados'
                      : `${episodes} ep. vistos`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL DEL QUIZ DIARIO 2.0 (VALIDADO POR SERVER ACTIONS)
         ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {quizOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className="bento-card relative w-full max-w-lg p-6 sm:p-7 space-y-6 border-kurama/40"
            >
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {!quizFinished && currentQuestion ? (
                <>
                  {/* Cabecera de Pregunta + Temporizador */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pr-8">
                      <span className="rounded-full bg-kurama/20 border border-kurama/40 px-3 py-0.5 text-xs font-extrabold text-kurama">
                        Pregunta {currentQIndex + 1} / {questions.length}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-display text-sm font-extrabold',
                          timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'
                        )}
                      >
                        <Timer className="h-4 w-4 text-kurama" />
                        {timeLeft}s
                      </span>
                    </div>

                    {/* Barra visual de tiempo */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
                      <motion.div
                        key={currentQIndex}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / 15) * 100}%` }}
                        transition={{ duration: 0.9, ease: 'linear' }}
                        className={cn(
                          'h-full rounded-full',
                          timeLeft <= 5 ? 'bg-rose-500' : 'bg-kurama'
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      {currentQuestion.anime_title}
                    </span>
                    <h3 className="font-display text-lg sm:text-xl font-extrabold text-white leading-snug">
                      {currentQuestion.question}
                    </h3>
                  </div>

                  {/* Opciones */}
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = selectedOption === opt;
                      const isCorrectOption =
                        revealedCorrect !== null &&
                        opt.trim().toLowerCase() ===
                          revealedCorrect.trim().toLowerCase();
                      const isWrongSelected =
                        isSelected && revealedCorrect !== null && !isCorrectOption;

                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={selectedOption !== null}
                          onClick={() => void handleSelectAnswer(opt)}
                          className={cn(
                            'w-full flex items-center justify-between rounded-xl border p-3.5 text-left text-xs sm:text-sm font-semibold transition-all',
                            isCorrectOption
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                              : isWrongSelected
                                ? 'border-rose-500 bg-rose-500/20 text-rose-200'
                                : 'border-white/10 bg-background/70 text-slate-200 hover:border-kurama/50 hover:bg-white/[0.04]'
                          )}
                        >
                          <span>{opt}</span>
                          {isCorrectOption && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          )}
                          {isWrongSelected && (
                            <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Pantalla Final del Quiz */
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-kurama/20 border border-kurama/40 text-kurama">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-2xl font-extrabold text-white">
                    ¡Quiz Diario Completado!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Has sumado{' '}
                    <strong className="text-kurama font-extrabold">
                      +{sessionPoints} PL
                    </strong>{' '}
                    verificados en el servidor para tu clasificación mensual y global.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuizOpen(false)}
                    className="rounded-xl bg-kurama px-6 py-2.5 text-xs font-extrabold text-slate-950"
                  >
                    Volver al Ranking
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
