export type ImportRow = Record<string, string | number | null>

export type ParsedImportFile = {
  fileName: string
  fileHash: string
  fileSize: number
  mimeType: string
  sourceType: 'csv' | 'tsv' | 'xlsx'
  headers: string[]
  rows: ImportRow[]
  previewRows: string[]
}

type SpreadsheetCell = string | number | boolean | Date | null | undefined

const textExtensions = new Set(['csv', 'tsv', 'txt'])
const maxImportFileBytes = 10 * 1024 * 1024

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (file.size > maxImportFileBytes) {
    throw new Error(`文件超过 ${Math.round(maxImportFileBytes / 1024 / 1024)}MB，当前浏览器导入只处理小文件。`)
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fileHash = await hashFile(file)

  if (textExtensions.has(extension)) {
    const text = await file.text()
    const delimiter = extension === 'tsv' ? '\t' : guessDelimiter(text)
    const matrix = parseDelimited(text, delimiter)
    return toParsedFile(file, fileHash, delimiter === '\t' ? 'tsv' : 'csv', matrix)
  }

  if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser')
    const matrix = (await readSheet(file)) as SpreadsheetCell[][]
    return toParsedFile(file, fileHash, 'xlsx', matrix)
  }

  throw new Error('仅支持 CSV、TSV、TXT、XLSX 文件。WPS 请导出为 CSV 或 XLSX 后再导入。')
}

export async function encodeImportFile(file: File) {
  return {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    contentBase64: arrayBufferToBase64(await file.arrayBuffer()),
  }
}

function toParsedFile(file: File, fileHash: string, sourceType: ParsedImportFile['sourceType'], matrix: SpreadsheetCell[][]) {
  const firstDataRow = matrix.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (firstDataRow < 0) throw new Error('文件为空，未找到表头。')

  const headers = matrix[firstDataRow].map((cell) => String(cell ?? '').trim())
  const nonEmptyHeaders = headers.filter(Boolean)
  if (nonEmptyHeaders.length === 0) throw new Error('表头为空，无法识别导入字段。')

  const rows = matrix
    .slice(firstDataRow + 1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) =>
      headers.reduce<ImportRow>((record, header, index) => {
        if (!header) return record
        const value = row[index]
        record[header] = normalizeCell(value)
        return record
      }, {}),
    )

  if (rows.length === 0) throw new Error('文件只有表头，没有可导入的数据行。')

  return {
    fileName: file.name,
    fileHash,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    sourceType,
    headers: nonEmptyHeaders,
    rows,
    previewRows: rows.slice(0, 3).map((row) => nonEmptyHeaders.map((header) => String(row[header] ?? '')).join(', ')),
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function normalizeCell(value: SpreadsheetCell) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return value
  const text = String(value ?? '').trim()
  return text === '' ? null : text
}

function guessDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const commaCount = countChars(firstLine, ',')
  const tabCount = countChars(firstLine, '\t')
  return tabCount > commaCount ? '\t' : ','
}

function countChars(text: string, char: string) {
  let count = 0
  for (const current of text) {
    if (current === char) count += 1
  }
  return count
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === delimiter && !quoted) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)
  return rows
}

async function hashFile(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `sha256-${hex}`
}
