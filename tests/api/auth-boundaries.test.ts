import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

/**
 * Tests conceptuales que verifican que todos los API routes
 * siguen el patron de autenticacion correcto.
 */

const API_DIR = path.resolve(__dirname, '../../app/api')

// Rutas que no requieren auth (publicas o con auth propia)
const EXEMPT_ROUTES = new Set([
  'auth/callback',
  'auth/register',
  'stripe/webhook',
  'cowork/health',
  'cron/daily-digest',
  'cron/monthly-research',
  'portal',
])

function getAllRouteFiles(dir: string, base = ''): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const relativePath = base ? `${base}/${entry}` : entry
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          files.push(...getAllRouteFiles(fullPath, relativePath))
        } else if (entry === 'route.ts') {
          files.push(fullPath)
        }
      } catch {
        // skip inaccessible files
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return files
}

function getRelativeRoute(filePath: string): string {
  const rel = path.relative(API_DIR, path.dirname(filePath))
  return rel
}

function isExempt(route: string): boolean {
  for (const exempt of EXEMPT_ROUTES) {
    if (route.startsWith(exempt)) return true
  }
  // Cowork routes use validateApiKey instead of getAuthContext
  if (route.startsWith('cowork/') && route !== 'cowork/api-keys') return true
  return false
}

describe('Auth boundaries - patron de autenticacion en API routes', () => {
  const routeFiles = getAllRouteFiles(API_DIR)

  it('encuentra al menos 20 route files', () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(20)
  })

  const nonExemptRoutes = routeFiles.filter(f => !isExempt(getRelativeRoute(f)))

  for (const routeFile of nonExemptRoutes) {
    const route = getRelativeRoute(routeFile)

    it(`${route} - importa getAuthContext o validateApiKey`, () => {
      const content = readFileSync(routeFile, 'utf-8')
      const hasGetAuthContext = content.includes('getAuthContext')
      const hasValidateApiKey = content.includes('validateApiKey')
      expect(
        hasGetAuthContext || hasValidateApiKey,
        `${route}/route.ts no importa ningun mecanismo de auth`
      ).toBe(true)
    })

    it(`${route} - llama a la funcion de auth`, () => {
      const content = readFileSync(routeFile, 'utf-8')
      const callsGetAuthContext = content.includes('getAuthContext(')
      const callsValidateApiKey = content.includes('validateApiKey(')
      expect(
        callsGetAuthContext || callsValidateApiKey,
        `${route}/route.ts no llama a la funcion de auth`
      ).toBe(true)
    })

    it(`${route} - verifica errores de auth`, () => {
      const content = readFileSync(routeFile, 'utf-8')
      const checksAuthError = content.includes('isAuthError') || content.includes('isApiAuthError')
      expect(
        checksAuthError,
        `${route}/route.ts no verifica errores de auth con isAuthError/isApiAuthError`
      ).toBe(true)
    })
  }
})
