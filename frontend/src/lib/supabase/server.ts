import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Crea un cliente de Supabase tipado para Server Components, Server Actions y Route Handlers.
 * Gestiona automáticamente la lectura y escritura de cookies de sesión.
 */
export function createClient(): SupabaseClient<Database> {
  const cookieStore = cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://oiovhnsxtpltftsvunsc.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // El método `setAll` fue invocado desde un Server Component puro.
          // Se puede ignorar de forma segura si un Middleware refresca las sesiones.
        }
      },
    },
  });
}

/**
 * Cliente Administrativo exclusivo de Servidor (Server Actions críticas / Cron Jobs).
 * Utiliza `SUPABASE_SERVICE_ROLE_KEY`. NUNCA importar en componentes de cliente.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://oiovhnsxtpltftsvunsc.supabase.co';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return createServiceClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
