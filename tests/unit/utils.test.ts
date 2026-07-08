import { describe, it, expect } from 'vitest'
import {
  cn,
  formatDate,
  formatDateTime,
  timeAgo,
  isOverdue,
  getInitials,
  getPriorityColor,
  getStatusColor,
  calculateWorkload,
  deadlineCountdown,
} from '@/lib/utils'

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resuelve conflictos de tailwind', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('filtra valores falsy', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })
})

describe('formatDate', () => {
  it('formatea Date como dd/MM/yyyy', () => {
    const result = formatDate(new Date('2025-03-15'))
    expect(result).toMatch(/15\/03\/2025/)
  })

  it('formatea string ISO como dd/MM/yyyy', () => {
    const result = formatDate('2025-12-01T00:00:00Z')
    expect(result).toMatch(/\d{2}\/12\/2025/)
  })
})

describe('formatDateTime', () => {
  it('incluye hora y minutos', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z')
    expect(result).toMatch(/\d{2}\/06\/2025/)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })
})

describe('timeAgo', () => {
  it('devuelve string con sufijo "hace"', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString() // 1 hora atras
    const result = timeAgo(pastDate)
    expect(result).toContain('hace')
  })
})

describe('isOverdue', () => {
  it('devuelve false para null', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('devuelve true para fecha pasada', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('devuelve false para fecha futura', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})

describe('deadlineCountdown', () => {
  it('devuelve "Sin deadline" para null', () => {
    expect(deadlineCountdown(null)).toBe('Sin deadline')
  })

  it('muestra "Vencio hace" para fechas pasadas', () => {
    const result = deadlineCountdown('2020-01-01')
    expect(result).toMatch(/Venció hace/)
  })

  it('muestra "en" para fechas futuras', () => {
    const result = deadlineCountdown('2099-12-31')
    expect(result).toMatch(/^en /)
  })
})

describe('getInitials', () => {
  it('devuelve iniciales de nombre completo', () => {
    expect(getInitials('Juan Perez')).toBe('JP')
  })

  it('limita a 2 caracteres', () => {
    expect(getInitials('Ana Maria Garcia Lopez')).toBe('AM')
  })

  it('maneja nombre simple', () => {
    expect(getInitials('Admin')).toBe('A')
  })
})

describe('getPriorityColor', () => {
  it('devuelve color para critical', () => {
    expect(getPriorityColor('critical')).toContain('red')
  })

  it('devuelve color para high', () => {
    expect(getPriorityColor('high')).toContain('orange')
  })

  it('devuelve color medium por defecto', () => {
    expect(getPriorityColor('unknown')).toContain('yellow')
  })
})

describe('getStatusColor', () => {
  it('devuelve color para completed', () => {
    expect(getStatusColor('completed')).toContain('green')
  })

  it('devuelve color para in_progress', () => {
    expect(getStatusColor('in_progress')).toContain('blue')
  })

  it('devuelve color pending por defecto', () => {
    expect(getStatusColor('unknown')).toContain('zinc')
  })
})

describe('calculateWorkload', () => {
  it('devuelve 0% para 0 tareas', () => {
    const result = calculateWorkload(0)
    expect(result.percentage).toBe(0)
    expect(result.status).toBe('on_track')
  })

  it('devuelve on_track para pocas tareas', () => {
    const result = calculateWorkload(5)
    expect(result.percentage).toBe(50)
    expect(result.status).toBe('on_track')
  })

  it('devuelve monitor para 9 tareas', () => {
    const result = calculateWorkload(9)
    expect(result.percentage).toBe(90)
    expect(result.status).toBe('monitor')
  })

  it('devuelve overloaded y cap 100% para muchas tareas', () => {
    const result = calculateWorkload(15)
    expect(result.percentage).toBe(100)
    expect(result.status).toBe('overloaded')
  })
})
