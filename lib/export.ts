/**
 * Generate a CSV string from an array of objects.
 * Uses the keys of the first object as headers.
 */
export function toCSV(data: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (data.length === 0) return ''

  const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }))
  const headers = cols.map(c => `"${c.label}"`).join(',')

  const rows = data.map(row =>
    cols.map(c => {
      const val = row[c.key]
      if (val === null || val === undefined) return ''
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
      return String(val)
    }).join(',')
  )

  return [headers, ...rows].join('\n')
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string, columns?: { key: string; label: string }[]) {
  const csv = toCSV(data, columns)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
