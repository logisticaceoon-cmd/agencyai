/**
 * Next.js Instrumentation — corre UNA VEZ al iniciar el servidor en Vercel
 * Migraciones 021 ya aplicadas — este archivo es no-op para evitar cold start lento
 */
export async function register() {
  // Migraciones 021 (member_client_assignments, payroll.member_user_id, etc.)
  // ya fueron aplicadas en Supabase. No se requiere acción en startup.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  console.log('[instrumentation] OK — migraciones ya aplicadas.')
}
