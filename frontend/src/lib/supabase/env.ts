/**
 * Variables de Supabase para el servidor, con los mismos respaldos en toda la app
 * (route handlers, server actions, `pages/api` y crons). Vercel puede tenerlas con
 * prefijo NEXT_PUBLIC_, VITE_ o sin prefijo según cuándo se crearon.
 */
export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://oiovhnsxtpltftsvunsc.supabase.co'
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  );
}

let warned = false;

/**
 * Clave para escribir desde el servidor: la service role. Si no está configurada
 * se usa la anon (solo funciona mientras la base de datos no tenga RLS cerrado)
 * y se avisa en los logs.
 */
export function getSupabaseServerKey(): string {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (service) return service;
  if (!warned && process.env.NODE_ENV === 'production') {
    warned = true;
    console.warn('[supabase] Falta SUPABASE_SERVICE_ROLE_KEY: el servidor escribe con la clave anon.');
  }
  return getSupabaseAnonKey();
}
