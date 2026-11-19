'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Crown,
  Medal,
  Timer,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimeFrame } from '@/components/frames/AnimeFrame';
import { ArenaStage } from './ArenaStage';
import { RetoEntryCard } from '@/components/reto/RetoEntryCard';
import {
  resolveUnifiedUserLevel,
  calculatePL,
  getLeagueInfo,
  FRAME_STYLES,
  resolveDisplayFrame,
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

/** Color del icono de medalla por división (solo el icono, nunca el texto). */
const TIER_COLOR: Record<string, string> = {
  bronze: '#c08457',
  silver: '#c9cfdb',
  gold: '#e3b341',
  diamond: '#7cc8f0',
};

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

  const monthlySorted = useMemo(
    () =>
      [...users]
        .filter((u) => u.profile_visibility !== 'private')
        .sort((a, b) => (b.monthly_quiz_points || 0) - (a.monthly_quiz_points || 0)),
    [users]
  );

  const currentQuestion = questions[currentQIndex] ?? null;


  return (
    <div className="space-y-8">
      {/* Escenario del torneo: cuentas atrás, rival, podio 3D y premio */}
      <ArenaStage monthly={monthlySorted} currentUserId={currentUserId} activePrize={activePrize} onPlay={() => void handleStartQuiz()} />

      <RetoEntryCard />

      {/* Campeón vigente y premio del mes */}
      <section className="grid grid-cols-1 overflow-hidden rounded-[18px] bg-white/[0.06]" style={{ boxShadow: 'var(--shadow-tile)' }}>
        <div className="min-w-0 bg-card p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[12px] bg-popover text-white">
                <Crown className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {lastWinner ? `Campeón de ${MONTH_NAMES[lastWinner.month] ?? ''} ${lastWinner.year}` : 'Campeón del mes'}
                </p>
                <h2 className="flex items-center gap-2 truncate font-display text-2xl font-bold text-white">
                  {lastWinner?.username ?? 'Aún sin campeón'}
                  {lastWinner?.anilist_id === currentUserId && (
                    <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-ink">Tú</span>
                  )}
                </h2>
                {lastWinner && (
                  <p className="text-sm text-muted-foreground tabular">{lastWinner.score.toLocaleString('es-ES')} PL en el mes</p>
                )}
              </div>
            </div>
            {monthlyWinners.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWinnersHistory((v) => !v)}
                aria-expanded={showWinnersHistory}
                className="inline-flex shrink-0 items-center gap-1 rounded-[10px] bg-popover px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent"
              >
                Historial
                {showWinnersHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>

          {showWinnersHistory && monthlyWinners.length > 0 && (
            <ol className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {monthlyWinners.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {MONTH_NAMES[w.month]} {w.year}
                    <span className="ml-2 font-medium text-white">{w.username ?? `#${w.anilist_id}`}</span>
                  </span>
                  <span className="text-white tabular">{w.score.toLocaleString('es-ES')} PL</span>
                </li>
              ))}
            </ol>
          )}
        </div>

      </section>

      {/* Clasificación */}
      <section aria-labelledby="ranking-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="ranking-title" className="font-display text-xl font-semibold text-white">Clasificación</h2>
          <div role="tablist" aria-label="Tipo de liga" className="inline-flex rounded-[12px] bg-card p-1">
            {([
              ['monthly', 'Liga mensual'],
              ['global', 'Liga global'],
              ['legends', 'Leyendas'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeLeague === key}
                onClick={() => setActiveLeague(key)}
                className={cn(
                  'rounded-[9px] px-3.5 py-2 text-sm font-medium transition-colors sm:px-4',
                  activeLeague === key ? 'bg-popover text-white' : 'text-muted-foreground hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ol className="overflow-hidden rounded-[18px] bg-card" style={{ boxShadow: 'var(--shadow-tile)' }}>
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
            const isMe = player.anilist_id === currentUserId;

            const displayScore =
              activeLeague === 'monthly'
                ? `${(player.monthly_quiz_points || 0).toLocaleString('es-ES')} PL`
                : activeLeague === 'legends'
                  ? `${crowns} ${crowns === 1 ? 'corona' : 'coronas'}`
                  : `${totalPL.toLocaleString('es-ES')} PL`;

            return (
              <li
                key={player.anilist_id}
                className={cn(
                  'flex items-center justify-between gap-4 border-t border-white/[0.05] px-4 py-3.5 first:border-t-0 sm:px-6',
                  isMe ? 'bg-popover' : 'transition-colors hover:bg-white/[0.02]'
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className={cn('w-7 shrink-0 text-center font-display text-lg tabular', idx < 3 ? 'font-bold text-white' : 'text-muted-foreground')}>
                    {idx + 1}
                  </span>
                  <AnimeFrame frame={resolveDisplayFrame(levelData.computedLevel, player.selected_frame)} size={44} label={FRAME_STYLES[resolveDisplayFrame(levelData.computedLevel, player.selected_frame)].label} showcase={{ title: player.username ?? `Usuario #${player.anilist_id}`, subtitle: `Nv. ${levelData.computedLevel}` }}>
                    <span className="grid h-full w-full place-items-center bg-[#252a36] text-xs font-semibold text-white">
                      {(player.username ?? 'KT').slice(0, 2).toUpperCase()}
                    </span>
                  </AnimeFrame>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-white">
                      {player.username ?? `Usuario #${player.anilist_id}`}
                      {isMe && <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink">Tú</span>}
                      {crowns > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular">
                          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                          {crowns}
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular">
                      Nv. {levelData.computedLevel}
                      <span aria-hidden="true">·</span>
                      <Medal className="h-3.5 w-3.5" style={{ color: TIER_COLOR[league.id] }} aria-hidden="true" />
                      {league.name}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-base font-semibold text-white tabular sm:text-lg">{displayScore}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    {activeLeague === 'monthly' ? 'este mes' : activeLeague === 'legends' ? 'títulos' : `${episodes.toLocaleString('es-ES')} ep. vistos`}
                  </p>
                </div>
              </li>
            );
          })}
          {sortedLeaderboard.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">Todavía no hay jugadores en esta liga.</li>
          )}
        </ol>
      </section>

      {/* Quiz diario */}
      <AnimatePresence>
        {quizOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Quiz diario"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16, rotateX: 8 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-lg space-y-6 rounded-[18px] bg-popover p-6 sm:p-7"
              style={{ boxShadow: 'var(--shadow-lift)', transformPerspective: 900 }}
            >
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                aria-label="Cerrar quiz"
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {!quizFinished && currentQuestion ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pr-8 text-sm tabular">
                      <span className="text-muted-foreground">
                        Pregunta {currentQIndex + 1} de {questions.length}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 font-semibold', timeLeft <= 5 ? 'text-[#ff6b81]' : 'text-white')}>
                        <Timer className="h-4 w-4" aria-hidden="true" />
                        {timeLeft} s
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        key={currentQIndex}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / 15) * 100}%` }}
                        transition={{ duration: 0.9, ease: 'linear' }}
                        className={cn('h-full rounded-full', timeLeft <= 5 ? 'bg-[#ff6b81]' : 'bg-kurama')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">{currentQuestion.anime_title}</p>
                    <h3 className="font-display text-lg font-semibold leading-snug text-white sm:text-xl">{currentQuestion.question}</h3>
                  </div>

                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = selectedOption === opt;
                      const isCorrectOption =
                        revealedCorrect !== null && opt.trim().toLowerCase() === revealedCorrect.trim().toLowerCase();
                      const isWrongSelected = isSelected && revealedCorrect !== null && !isCorrectOption;

                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={selectedOption !== null}
                          onClick={() => void handleSelectAnswer(opt)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-[12px] p-4 text-left text-sm font-medium transition-[background-color,transform] duration-150',
                            isCorrectOption
                              ? 'bg-emerald-500/20 text-emerald-100'
                              : isWrongSelected
                                ? 'bg-rose-500/20 text-rose-100'
                                : 'bg-card text-white enabled:hover:bg-accent enabled:active:scale-[0.99]'
                          )}
                        >
                          <span>{opt}</span>
                          {isCorrectOption && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Correcta" />}
                          {isWrongSelected && <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-label="Incorrecta" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-6 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[14px] bg-card text-white">
                    <Trophy className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white">Quiz de hoy completado</h3>
                  <p className="text-sm text-muted-foreground">
                    Has sumado <strong className="font-semibold text-white tabular">+{sessionPoints} PL</strong> a tu liga mensual y global.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuizOpen(false)}
                    className="rounded-[10px] bg-kurama px-6 py-3 text-sm font-semibold text-ink"
                  >
                    Volver a la clasificación
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
