import { describe, it, expect } from 'vitest'
import { PLANS, PLAN_MAP, getPlanLimits, generateSlug, FOUNDER_WORKSPACE_IDS } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'

describe('PLANS', () => {
  it('contiene 5 planes', () => {
    expect(PLANS).toHaveLength(5)
  })

  it('tiene todos los IDs esperados', () => {
    const ids = PLANS.map(p => p.id)
    expect(ids).toContain('free')
    expect(ids).toContain('pro')
    expect(ids).toContain('agency')
    expect(ids).toContain('scale')
    expect(ids).toContain('starter')
  })

  it('free tiene precio 0', () => {
    expect(PLAN_MAP.free.price).toBe(0)
  })

  it('pro tiene precio 29', () => {
    expect(PLAN_MAP.pro.price).toBe(29)
  })

  it('scale tiene usuarios ilimitados', () => {
    expect(PLAN_MAP.scale.maxUsers).toBe(Infinity)
  })

  it('scale tiene clientes ilimitados', () => {
    expect(PLAN_MAP.scale.maxClients).toBe(Infinity)
  })
})

describe('PLAN_MAP', () => {
  it('tiene entrada para cada plan', () => {
    const planIds: PlanId[] = ['free', 'starter', 'pro', 'agency', 'scale']
    for (const id of planIds) {
      expect(PLAN_MAP[id]).toBeDefined()
      expect(PLAN_MAP[id].id).toBe(id)
    }
  })
})

describe('getPlanLimits', () => {
  it('devuelve limites del plan solicitado', () => {
    const limits = getPlanLimits('pro')
    expect(limits.maxUsers).toBe(4)
    expect(limits.maxClients).toBe(8)
  })

  it('devuelve free como fallback para plan inexistente', () => {
    const limits = getPlanLimits('nonexistent' as PlanId)
    expect(limits.id).toBe('free')
  })

  it('free permite max 3 clientes', () => {
    const limits = getPlanLimits('free')
    expect(limits.maxClients).toBe(3)
  })

  it('agency permite max 20 clientes', () => {
    const limits = getPlanLimits('agency')
    expect(limits.maxClients).toBe(20)
  })
})

describe('generateSlug', () => {
  it('convierte a minusculas y reemplaza espacios', () => {
    expect(generateSlug('Mi Agencia')).toBe('mi-agencia')
  })

  it('elimina acentos', () => {
    expect(generateSlug('Logística')).toBe('logistica')
  })

  it('elimina caracteres especiales', () => {
    expect(generateSlug('Test@#$%Name')).toBe('test-name')
  })

  it('limita a 50 caracteres', () => {
    const longName = 'a'.repeat(100)
    expect(generateSlug(longName).length).toBeLessThanOrEqual(50)
  })

  it('elimina guiones al inicio y final', () => {
    expect(generateSlug('-test-')).toBe('test')
  })
})

describe('FOUNDER_WORKSPACE_IDS', () => {
  it('es un Set', () => {
    expect(FOUNDER_WORKSPACE_IDS).toBeInstanceOf(Set)
  })

  it('contiene al menos un workspace', () => {
    expect(FOUNDER_WORKSPACE_IDS.size).toBeGreaterThan(0)
  })
})
