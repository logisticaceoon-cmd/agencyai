import { describe, it, expect } from 'vitest'
import { toCSV } from '@/lib/export'

describe('toCSV', () => {
  it('devuelve string vacio con array vacio', () => {
    expect(toCSV([])).toBe('')
  })

  it('genera CSV con una sola fila', () => {
    const data = [{ name: 'Acme', value: 100 }]
    const result = toCSV(data)
    expect(result).toContain('"name"')
    expect(result).toContain('"value"')
    expect(result).toContain('"Acme"')
    expect(result).toContain('100')
  })

  it('genera CSV con multiples filas', () => {
    const data = [
      { name: 'Acme', value: 100 },
      { name: 'Beta', value: 200 },
    ]
    const result = toCSV(data)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
  })

  it('maneja caracteres especiales (comillas)', () => {
    const data = [{ name: 'Empresa "ABC"', value: 50 }]
    const result = toCSV(data)
    // Las comillas dobles se escapan como ""
    expect(result).toContain('""ABC""')
  })

  it('maneja valores null y undefined', () => {
    const data = [{ name: null, value: undefined, other: 'ok' }]
    const result = toCSV(data)
    const lines = result.split('\n')
    const dataRow = lines[1]
    // null y undefined se convierten a string vacio
    expect(dataRow).toContain(',,')
  })

  it('usa columnas personalizadas cuando se proporcionan', () => {
    const data = [{ name: 'Test', value: 42, extra: 'ignored' }]
    const columns = [
      { key: 'name', label: 'Nombre' },
      { key: 'value', label: 'Valor' },
    ]
    const result = toCSV(data, columns)
    expect(result).toContain('"Nombre"')
    expect(result).toContain('"Valor"')
    expect(result).not.toContain('"extra"')
  })

  it('maneja valores tipo objeto', () => {
    const data = [{ name: 'Test', meta: { foo: 'bar' } }]
    const result = toCSV(data)
    // Los objetos se serializan con JSON.stringify
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })
})
