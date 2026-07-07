/**
 * Sanitize error messages for API responses.
 * Logs the real error server-side but returns a generic message to clients.
 */
export function sanitizeError(err: unknown, context?: string): string {
  const message = err instanceof Error ? err.message : String(err)
  if (context) {
    console.error(`[${context}]`, message)
  }
  return 'Error interno del servidor'
}
