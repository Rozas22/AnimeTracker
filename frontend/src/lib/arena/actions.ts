'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getVerifiedAniListId } from '@/lib/session-server';
import type { QuizRow } from '@/types/database';

/**
 * Pregunta de Quiz pública enviada al navegador SIN `correct_answer` (Anti-Cheat).
 */
export type PublicQuizQuestion = Omit<QuizRow, 'correct_answer'>;

export interface VerifyAnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  pointsAwarded: number;
  newMonthlyPoints: number;
  newTotalQuizPoints: number;
}

const FALLBACK_QUIZ_POOL: QuizRow[] = [
  {
    id: 'fallback-q-1',
    anime_title: 'Naruto Shippuden',
    question: '¿Cuál es el verdadero nombre del Zorro de las Nueve Colas sellado en Naruto?',
    options: ['Kurama', 'Shukaku', 'Gyuki', 'Matatabi'],
    correct_answer: 'Kurama',
    difficulty: 'easy',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-q-2',
    anime_title: 'Jujutsu Kaisen',
    question: '¿Cómo se llama la Expansión de Dominio de Satoru Gojo?',
    options: [
      'Vacío Inconmensurable',
      'Santuario Malevolente',
      'Jardín de Sombras Quiméricas',
      'Ataúd de la Montaña de Hierro',
    ],
    correct_answer: 'Vacío Inconmensurable',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-q-3',
    anime_title: 'Attack on Titan',
    question: '¿Quién heredó el Titán Colosal tras la batalla de Shiganshina?',
    options: ['Armin Arlert', 'Erwin Smith', 'Jean Kirstein', 'Floch Forster'],
    correct_answer: 'Armin Arlert',
    difficulty: 'easy',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-q-4',
    anime_title: 'One Piece',
    question: '¿Cuál es el nombre de la fruta del diablo verdadera de Monkey D. Luffy revelada en Wano?',
    options: [
      'Hito Hito no Mi, Modelo: Nika',
      'Gomu Gomu no Mi Suprema',
      'Yami Yami no Mi',
      'Mera Mera no Mi',
    ],
    correct_answer: 'Hito Hito no Mi, Modelo: Nika',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-q-5',
    anime_title: 'Death Note',
    question: '¿Cuál es el verdadero nombre del detective conocido como "L"?',
    options: ['L Lawliet', 'Mihael Keehl', 'Nate River', 'Light Yagami'],
    correct_answer: 'L Lawliet',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
  },
];

export interface DailyQuizState {
  questions: PublicQuizQuestion[];
  /** Primera pregunta sin responder hoy (igual a `questions.length` si ya terminó). */
  nextIndex: number;
  /** Aciertos de hoy en las preguntas ya respondidas. */
  correctToday: number;
}

interface QuizAnswerRow {
  question_id: string;
  correct: boolean;
  answered_at: string;
}

const startOfUTCDay = (): string => `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

/**
 * Obtiene las 5 preguntas del Quiz Diario ocultando `correct_answer` al cliente,
 * y por dónde sigue el usuario: lo ya respondido hoy no se vuelve a preguntar.
 */
export async function getDailyQuizQuestionsAction(): Promise<DailyQuizState> {
  const supabase = createAdminClient();
  const day = new Date().toISOString().slice(0, 10); // el quiz cambia a las 00:00 UTC, igual que el cron

  const { data } = await supabase
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const pool = data && data.length >= 5 ? data : FALLBACK_QUIZ_POOL;

  // Si el cron ha generado preguntas hoy, se juegan esas. Si no, se eligen 5 del
  // banco con una semilla del día: todos ven las mismas y cambian cada día.
  const fresh = pool.filter((q) => (q.created_at ?? '').slice(0, 10) === day);
  const picked = fresh.length >= 5 ? fresh.slice(0, 5) : seededShuffle(pool, `dia-${day}`).slice(0, 5);

  const questions = picked.map(({ correct_answer: _hidden, ...publicQuestion }) => ({
    ...publicQuestion,
    // Las opciones se barajan (la correcta solía venir la primera); el orden es
    // estable durante el día para que recargar no lo cambie.
    options: seededShuffle(publicQuestion.options ?? [], `${publicQuestion.id}-${day}`),
  }));

  const anilistUserId = await getVerifiedAniListId();
  if (!anilistUserId) return { questions, nextIndex: 0, correctToday: 0 };

  const { data: rows } = await supabase
    .from('quiz_answers' as never)
    .select('question_id, correct, answered_at')
    .eq('anilist_id' as never, anilistUserId as never)
    .in('question_id' as never, questions.map((q) => q.id) as never)
    .gte('answered_at' as never, startOfUTCDay() as never);

  const answered = new Map(((rows ?? []) as unknown as QuizAnswerRow[]).map((r) => [r.question_id, r.correct]));
  const firstOpen = questions.findIndex((q) => !answered.has(q.id));

  return {
    questions,
    nextIndex: firstOpen === -1 ? questions.length : firstOpen,
    correctToday: Array.from(answered.values()).filter(Boolean).length,
  };
}

/** Barajado determinista (Fisher-Yates con mulberry32 sembrado por texto). */
function seededShuffle<T>(items: readonly T[], seedText: string): T[] {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619);
  const rand = (): number => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Server Action Anti-Trampas: Valida la respuesta en el servidor y suma los PL en `public.users`.
 */
export async function submitQuizAnswerAction(params: {
  questionId: string;
  selectedOption: string;
  anilistUserId: number;
  timeRemainingSeconds: number;
}): Promise<VerifyAnswerResult> {
  const { questionId, selectedOption, timeRemainingSeconds } = params;
  // La identidad sale de la sesión verificada, nunca del navegador
  const anilistUserId = await getVerifiedAniListId();
  const supabase = createAdminClient();

  // 1. Buscar la respuesta correcta en la base de datos o en el pool de respaldo
  let correctAnswer = '';
  const fallbackMatch = FALLBACK_QUIZ_POOL.find((q) => q.id === questionId);

  if (fallbackMatch) {
    correctAnswer = fallbackMatch.correct_answer;
  } else {
    const { data: quizRow } = await supabase
      .from('quizzes')
      .select('correct_answer')
      .eq('id', questionId)
      .maybeSingle();

    correctAnswer = quizRow?.correct_answer ?? '';
  }

  const isCorrect =
    Boolean(correctAnswer) &&
    selectedOption.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  // Base 100 PL + bonus por velocidad (hasta +30 PL). El tiempo lo manda el
  // navegador, así que se acota: como mucho cuenta el máximo de 15 s.
  const safeTime = Math.max(0, Math.min(15, Number(timeRemainingSeconds) || 0));
  const speedBonus = Math.max(0, Math.min(30, Math.floor(safeTime * 2)));
  let pointsAwarded = isCorrect ? 100 + speedBonus : 0;

  // Cada pregunta se responde una sola vez al día, se acierte o se falle: si no,
  // bastaría fallar, ver la solución y volver a empezar.
  // (tabla quiz_answers, ver supabase_migration_seguridad.sql)
  if (anilistUserId) {
    const { data: prevRaw } = await supabase
      .from('quiz_answers' as never)
      .select('question_id, correct, answered_at')
      .eq('anilist_id' as never, anilistUserId as never)
      .eq('question_id' as never, questionId as never)
      .maybeSingle();
    const prev = prevRaw as unknown as QuizAnswerRow | null;

    if (prev && new Date(prev.answered_at).getTime() >= new Date(startOfUTCDay()).getTime()) {
      return {
        isCorrect: prev.correct,
        correctAnswer,
        pointsAwarded: 0,
        newMonthlyPoints: 0,
        newTotalQuizPoints: 0,
      };
    }

    if (prev) {
      // La pregunta vuelve a salir otro día: puntúa solo si nunca se había acertado.
      const { data: claimed } = await supabase
        .from('quiz_answers' as never)
        .update({ correct: prev.correct || isCorrect, answered_at: new Date().toISOString() } as never)
        .eq('anilist_id' as never, anilistUserId as never)
        .eq('question_id' as never, questionId as never)
        .eq('answered_at' as never, prev.answered_at as never)
        .select('question_id');
      if (!claimed?.length || prev.correct) pointsAwarded = 0;
    } else {
      const { error: insertError } = await supabase
        .from('quiz_answers' as never)
        .insert({ anilist_id: anilistUserId, question_id: questionId, correct: isCorrect } as never);
      if (insertError) {
        // 23505 = otra petición la respondió a la vez. Sin registro no hay puntos.
        if (insertError.code !== '23505') console.warn('[quiz] quiz_answers:', insertError.message);
        pointsAwarded = 0;
      }
    }
  }

  // 2. Si acertó, actualizar `quiz_points` y `monthly_quiz_points` en Supabase
  let newMonthlyPoints = 0;
  let newTotalQuizPoints = 0;

  if (anilistUserId) {
    const { data: userRow } = await supabase
      .from('users')
      .select('quiz_points, monthly_quiz_points')
      .eq('anilist_id', anilistUserId)
      .maybeSingle();

    newMonthlyPoints = (userRow?.monthly_quiz_points ?? 0) + pointsAwarded;
    newTotalQuizPoints = (userRow?.quiz_points ?? 0) + pointsAwarded;

    // Sin revalidatePath aquí: refrescar la ruta en mitad de la partida vuelve a
    // montar la Arena y cierra el quiz. El cliente refresca al cerrarlo.
    if (pointsAwarded > 0 && userRow) {
      await supabase
        .from('users')
        .update({
          monthly_quiz_points: newMonthlyPoints,
          quiz_points: newTotalQuizPoints,
          last_updated_at: new Date().toISOString(),
        })
        .eq('anilist_id', anilistUserId);
    }
  }

  return {
    isCorrect,
    correctAnswer,
    pointsAwarded,
    newMonthlyPoints,
    newTotalQuizPoints,
  };
}
