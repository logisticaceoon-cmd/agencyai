import { describe, it, expect } from 'vitest'
import {
  normalizeRole,
  canAccessSection,
  getDataScope,
  hasMinRole,
  ROLE_HIERARCHY,
  SECTION_PERMISSIONS,
} from '@/lib/roles'
import type { AppRole } from '@/lib/roles'

describe('normalizeRole', () => {
  it('devuelve viewer para null/undefined', () => {
    expect(normalizeRole(null)).toBe('viewer')
    expect(normalizeRole(undefined)).toBe('viewer')
  })

  it('normaliza owner', () => {
    expect(normalizeRole('owner')).toBe('owner')
  })

  it('normaliza admin y aliases', () => {
    expect(normalizeRole('admin')).toBe('admin')
    expect(normalizeRole('CEO')).toBe('admin')
    expect(normalizeRole('manager')).toBe('admin')
  })

  it('normaliza trafficker y aliases', () => {
    expect(normalizeRole('trafficker')).toBe('trafficker')
    expect(normalizeRole('member')).toBe('trafficker')
    expect(normalizeRole('specialist')).toBe('trafficker')
  })

  it('normaliza viewer y aliases', () => {
    expect(normalizeRole('viewer')).toBe('viewer')
    expect(normalizeRole('client')).toBe('viewer')
  })

  it('devuelve viewer para roles desconocidos', () => {
    expect(normalizeRole('random')).toBe('viewer')
  })

  it('es case-insensitive', () => {
    expect(normalizeRole('OWNER')).toBe('owner')
    expect(normalizeRole('Admin')).toBe('admin')
  })
})

describe('canAccessSection', () => {
  it('owner puede acceder a todas las secciones', () => {
    const sections = Object.keys(SECTION_PERMISSIONS)
    for (const section of sections) {
      expect(canAccessSection('owner', section)).toBe(true)
    }
  })

  it('viewer no puede acceder a finanzas', () => {
    expect(canAccessSection('viewer', '/finances')).toBe(false)
  })

  it('viewer puede acceder a dashboard', () => {
    expect(canAccessSection('viewer', '/dashboard')).toBe(true)
  })

  it('trafficker puede acceder a tareas', () => {
    expect(canAccessSection('trafficker', '/tasks')).toBe(true)
  })

  it('trafficker no puede acceder a settings principal', () => {
    expect(canAccessSection('trafficker', '/settings')).toBe(false)
  })

  it('ruta desconocida: solo owner puede acceder', () => {
    expect(canAccessSection('owner', '/unknown-route')).toBe(true)
    expect(canAccessSection('admin', '/unknown-route')).toBe(false)
  })
})

describe('getDataScope', () => {
  it('owner ve todas las tareas', () => {
    expect(getDataScope('tasks', 'owner')).toBe('all')
  })

  it('trafficker solo ve tareas asignadas', () => {
    expect(getDataScope('tasks', 'trafficker')).toBe('assigned')
  })

  it('admin ve todos los clientes', () => {
    expect(getDataScope('clients', 'admin')).toBe('all')
  })

  it('recurso desconocido devuelve assigned por defecto', () => {
    expect(getDataScope('unknown', 'owner')).toBe('assigned')
  })
})

describe('hasMinRole', () => {
  it('owner tiene nivel minimo de todos los roles', () => {
    const roles: AppRole[] = ['owner', 'admin', 'trafficker', 'viewer']
    for (const role of roles) {
      expect(hasMinRole('owner', role)).toBe(true)
    }
  })

  it('viewer no tiene nivel minimo de admin', () => {
    expect(hasMinRole('viewer', 'admin')).toBe(false)
  })

  it('admin tiene nivel minimo de trafficker', () => {
    expect(hasMinRole('admin', 'trafficker')).toBe(true)
  })

  it('trafficker no tiene nivel minimo de admin', () => {
    expect(hasMinRole('trafficker', 'admin')).toBe(false)
  })
})

describe('ROLE_HIERARCHY', () => {
  it('owner tiene el nivel mas alto', () => {
    expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin)
    expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.trafficker)
    expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.viewer)
  })

  it('viewer tiene el nivel mas bajo', () => {
    expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.trafficker)
  })
})
