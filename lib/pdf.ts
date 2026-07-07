import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFOptions {
  title: string
  subtitle?: string
  filename: string
  columns: { key: string; label: string }[]
  data: Record<string, unknown>[]
  orientation?: 'portrait' | 'landscape'
}

/**
 * Genera y descarga un PDF con tabla de datos.
 */
export function downloadPDF({ title, subtitle, filename, columns, data, orientation = 'portrait' }: PDFOptions) {
  const doc = new jsPDF({ orientation })

  // Header
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text(title, 14, 22)

  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(subtitle, 14, 30)
  }

  // Fecha de generacion
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, subtitle ? 36 : 30)

  const startY = subtitle ? 42 : 36

  // Tabla
  const headers = columns.map(c => c.label)
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key]
      if (val === null || val === undefined) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
    })
  )

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Genera un PDF de factura con detalle de items.
 */
export function downloadInvoicePDF(invoice: {
  number: string
  client_name: string
  date: string
  due_date: string
  status: string
  items: { description: string; quantity: number; unit_price: number; total: number }[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  notes?: string
}) {
  const doc = new jsPDF()
  const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency

  // Header
  doc.setFontSize(24)
  doc.setTextColor(30, 41, 59)
  doc.text('FACTURA', 14, 25)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`N: ${invoice.number}`, 14, 33)
  doc.text(`Fecha: ${invoice.date}`, 14, 39)
  doc.text(`Vencimiento: ${invoice.due_date}`, 14, 45)
  doc.text(`Estado: ${invoice.status}`, 14, 51)

  // Client
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text('Cliente:', 130, 33)
  doc.setTextColor(100, 116, 139)
  doc.text(invoice.client_name, 130, 39)

  // Items table
  const headers = ['Descripcion', 'Cant.', 'Precio Unit.', 'Total']
  const rows = invoice.items.map(item => [
    item.description,
    String(item.quantity),
    `${currencySymbol}${item.unit_price.toFixed(2)}`,
    `${currencySymbol}${item.total.toFixed(2)}`,
  ])

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 60,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  })

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`Subtotal: ${currencySymbol}${invoice.subtotal.toFixed(2)}`, 140, finalY, { align: 'left' })
  doc.text(`Impuesto (${invoice.tax_rate}%): ${currencySymbol}${invoice.tax_amount.toFixed(2)}`, 140, finalY + 7, { align: 'left' })
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text(`Total: ${currencySymbol}${invoice.total.toFixed(2)}`, 140, finalY + 16, { align: 'left' })

  if (invoice.notes) {
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Notas: ${invoice.notes}`, 14, finalY + 30)
  }

  doc.save(`factura-${invoice.number}.pdf`)
}

/**
 * Genera un PDF de reporte.
 */
export function downloadReportPDF(report: {
  title: string
  client_name?: string
  type: string
  period?: string
  content: string
  created_at: string
}) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.setTextColor(30, 41, 59)
  doc.text(report.title, 14, 25)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  let y = 33
  if (report.client_name) { doc.text(`Cliente: ${report.client_name}`, 14, y); y += 6 }
  doc.text(`Tipo: ${report.type}`, 14, y); y += 6
  if (report.period) { doc.text(`Periodo: ${report.period}`, 14, y); y += 6 }
  doc.text(`Fecha: ${report.created_at}`, 14, y); y += 10

  // Content - split into lines
  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)
  const lines = doc.splitTextToSize(report.content, 180)
  doc.text(lines, 14, y)

  doc.save(`reporte-${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
