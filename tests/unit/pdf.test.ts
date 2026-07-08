import { describe, it, expect, vi } from 'vitest'

// Mock jsPDF antes de importar el modulo
vi.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['line1']),
  }
  return {
    default: vi.fn().mockImplementation(() => mockDoc),
  }
})

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

import { downloadPDF, downloadInvoicePDF, downloadReportPDF } from '@/lib/pdf'

describe('downloadPDF', () => {
  it('no lanza error con input valido', () => {
    expect(() => {
      downloadPDF({
        title: 'Test Report',
        filename: 'test',
        columns: [
          { key: 'name', label: 'Nombre' },
          { key: 'value', label: 'Valor' },
        ],
        data: [{ name: 'Item 1', value: 100 }],
      })
    }).not.toThrow()
  })

  it('no lanza error con subtitle', () => {
    expect(() => {
      downloadPDF({
        title: 'Test Report',
        subtitle: 'Subtitle here',
        filename: 'test-subtitle',
        columns: [{ key: 'name', label: 'Nombre' }],
        data: [{ name: 'Item' }],
      })
    }).not.toThrow()
  })

  it('no lanza error con datos vacios', () => {
    expect(() => {
      downloadPDF({
        title: 'Empty',
        filename: 'empty',
        columns: [{ key: 'name', label: 'Nombre' }],
        data: [],
      })
    }).not.toThrow()
  })

  it('no lanza error con orientacion landscape', () => {
    expect(() => {
      downloadPDF({
        title: 'Landscape',
        filename: 'landscape',
        columns: [{ key: 'a', label: 'A' }],
        data: [{ a: 1 }],
        orientation: 'landscape',
      })
    }).not.toThrow()
  })
})

describe('downloadInvoicePDF', () => {
  it('no lanza error con factura valida', () => {
    expect(() => {
      downloadInvoicePDF({
        number: 'INV-001',
        client_name: 'Acme Corp',
        date: '2025-01-15',
        due_date: '2025-02-15',
        status: 'sent',
        items: [
          { description: 'Servicio web', quantity: 1, unit_price: 500, total: 500 },
        ],
        subtotal: 500,
        tax_rate: 16,
        tax_amount: 80,
        total: 580,
        currency: 'USD',
        notes: 'Gracias por su preferencia',
      })
    }).not.toThrow()
  })

  it('no lanza error sin notas', () => {
    expect(() => {
      downloadInvoicePDF({
        number: 'INV-002',
        client_name: 'Beta Inc',
        date: '2025-03-01',
        due_date: '2025-04-01',
        status: 'draft',
        items: [
          { description: 'Consultoria', quantity: 10, unit_price: 100, total: 1000 },
        ],
        subtotal: 1000,
        tax_rate: 0,
        tax_amount: 0,
        total: 1000,
        currency: 'MXN',
      })
    }).not.toThrow()
  })
})

describe('downloadReportPDF', () => {
  it('no lanza error con reporte valido', () => {
    expect(() => {
      downloadReportPDF({
        title: 'Reporte Mensual',
        client_name: 'Acme',
        type: 'monthly',
        period: 'Enero 2025',
        content: 'Contenido del reporte aqui.',
        created_at: '2025-01-31',
      })
    }).not.toThrow()
  })

  it('no lanza error sin campos opcionales', () => {
    expect(() => {
      downloadReportPDF({
        title: 'Reporte Simple',
        type: 'custom',
        content: 'Solo contenido basico.',
        created_at: '2025-06-01',
      })
    }).not.toThrow()
  })
})
