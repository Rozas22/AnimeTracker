// ═══════════════════════════════════════════════════════════════════════════
// TIPADO ESTRICTO DE SUPABASE POSTGRESQL (`Database`) — CERO `any`
// Generado a partir del esquema real de KuramaTracker en producción
// ═══════════════════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileVisibility = 'public' | 'friends' | 'private';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type CronJobStatus = 'success' | 'error';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          anilist_id: number;
          username: string | null;
          quiz_points: number;
          monthly_quiz_points: number;
          anime_points: number;
          level: number;
          current_streak: number;
          profile_visibility: ProfileVisibility | string | null;
          last_updated_at: string | null;
          /** Marco elegido (null = automático). Requiere supabase_migration_selected_frame.sql */
          selected_frame?: string | null;
        };
        Insert: {
          anilist_id: number;
          username?: string | null;
          quiz_points?: number;
          monthly_quiz_points?: number;
          anime_points?: number;
          level?: number;
          current_streak?: number;
          profile_visibility?: ProfileVisibility | string | null;
          last_updated_at?: string | null;
          selected_frame?: string | null;
        };
        Update: {
          anilist_id?: number;
          username?: string | null;
          quiz_points?: number;
          monthly_quiz_points?: number;
          anime_points?: number;
          level?: number;
          current_streak?: number;
          profile_visibility?: ProfileVisibility | string | null;
          last_updated_at?: string | null;
          selected_frame?: string | null;
        };
        Relationships: [];
      };

      monthly_winners: {
        Row: {
          id: string;
          anilist_id: number;
          username: string | null;
          avatar_url: string | null;
          month: number;
          year: number;
          score: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          anilist_id: number;
          username?: string | null;
          avatar_url?: string | null;
          month: number;
          year: number;
          score: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          anilist_id?: number;
          username?: string | null;
          avatar_url?: string | null;
          month?: number;
          year?: number;
          score?: number;
          created_at?: string | null;
        };
        Relationships: [];
      };

      monthly_prizes: {
        Row: {
          id: string;
          month: number;
          year: number;
          title: string;
          description: string | null;
          images: string[];
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          month: number;
          year: number;
          title: string;
          description?: string | null;
          images?: string[];
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          month?: number;
          year?: number;
          title?: string;
          description?: string | null;
          images?: string[];
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      quizzes: {
        Row: {
          id: string;
          anime_title: string;
          question: string;
          options: string[];
          correct_answer: string;
          difficulty: QuizDifficulty | string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          anime_title: string;
          question: string;
          options: string[];
          correct_answer: string;
          difficulty?: QuizDifficulty | string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          anime_title?: string;
          question?: string;
          options?: string[];
          correct_answer?: string;
          difficulty?: QuizDifficulty | string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      user_achievements: {
        Row: {
          id: string;
          anilist_id: number;
          achievement_type: string;
          awarded_at: string | null;
        };
        Insert: {
          id?: string;
          anilist_id: number;
          achievement_type: string;
          awarded_at?: string | null;
        };
        Update: {
          id?: string;
          anilist_id?: number;
          achievement_type?: string;
          awarded_at?: string | null;
        };
        Relationships: [];
      };

      user_planning_animes: {
        Row: {
          id: string;
          anilist_id: number;
          anime_id: number;
          anime_title: string | null;
          anime_cover: string | null;
          notified: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          anilist_id: number;
          anime_id: number;
          anime_title?: string | null;
          anime_cover?: string | null;
          notified?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          anilist_id?: number;
          anime_id?: number;
          anime_title?: string | null;
          anime_cover?: string | null;
          notified?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      push_subscriptions: {
        Row: {
          id: string;
          anilist_id: number;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          anilist_id: number;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          anilist_id?: number;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      analytics_events: {
        Row: {
          id: string;
          visitor_id: string | null;
          user_id: string | null;
          event_type: string;
          event_data: Record<string, Json | undefined> | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          visitor_id?: string | null;
          user_id?: string | null;
          event_type: string;
          event_data?: Record<string, Json | undefined> | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          visitor_id?: string | null;
          user_id?: string | null;
          event_type?: string;
          event_data?: Record<string, Json | undefined> | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      cron_logs: {
        Row: {
          id: string;
          job_name: string;
          status: CronJobStatus | string;
          error_message: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_name: string;
          status: CronJobStatus | string;
          error_message?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_name?: string;
          status?: CronJobStatus | string;
          error_message?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ─── HELPERS DE TIPADO PARA TABLAS ───────────────────────────────────────────

export type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

// Alias semánticos de dominio
export type UserProfileRow = Tables<'users'>;
export type MonthlyWinnerRow = Tables<'monthly_winners'>;
export type MonthlyPrizeRow = Tables<'monthly_prizes'>;
export type QuizRow = Tables<'quizzes'>;
export type UserAchievementRow = Tables<'user_achievements'>;
export type UserPlanningAnimeRow = Tables<'user_planning_animes'>;
export type PushSubscriptionRow = Tables<'push_subscriptions'>;
export type AnalyticsEventRow = Tables<'analytics_events'>;
export type CronLogRow = Tables<'cron_logs'>;
