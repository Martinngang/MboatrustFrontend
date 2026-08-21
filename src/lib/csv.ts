/** Client-side CSV export — a gap the reference admin panel this dashboard
 * was inspired by doesn't have. `columns` doubles as both header row and
 * per-row cell extraction, so a table's column config can drive its export
 * without a second definition of "what a row looks like". */
export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number
}

function escapeCsvCell(v: string | number): string {
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(','))
  return [header, ...body].join('\r\n')
}

/** Triggers a browser download of the given rows as a CSV file — no
 * network round-trip, everything already loaded client-side gets exported
 * as-is (matching whatever filters/search are currently applied). */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csv = toCsv(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
