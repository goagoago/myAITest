import { ref, reactive } from 'vue'
import * as XLSX from 'xlsx'
import { useAccountStore } from '../stores/accountStore'

export function useDataConvert() {
  const loading = ref(false)
  const error = ref('')
  const result = reactive({
    blob: null,
    url: '',
    filename: '',
    targetType: '',
    jsonText: '',
    previewRows: [],
    rowCount: 0,
    colCount: 0,
  })
  const account = useAccountStore()

  const convert = async ({ sourceType, targetType, file, text, options = {} }) => {
    loading.value = true
    error.value = ''
    clearResult()

    try {
      const rows = await parseSource({ sourceType, file, text, options })
      if (!rows.length) {
        throw new Error('未读取到可转换的数据')
      }

      const cleanedRows = cleanRows(rows, options)
      if (!cleanedRows.length) {
        throw new Error('清洗后没有可用数据')
      }

      try {
        await account.consumeFeature('data-convert')
      } catch (e) {
        error.value = e.message || '操作失败，请重试'
        throw e
      }

      const blob = buildOutputBlob(cleanedRows, targetType, options)
      const filename = buildFilename(file?.name || sourceType, targetType)

      result.blob = blob
      result.url = URL.createObjectURL(blob)
      result.filename = filename
      result.targetType = targetType
      result.jsonText = targetType === 'json' ? await blob.text() : ''
      result.previewRows = cleanedRows.slice(0, 20)
      result.rowCount = cleanedRows.length
      result.colCount = cleanedRows.reduce((max, row) => Math.max(max, row.length), 0)

      return result
    } catch (e) {
      error.value = e.message || '转换失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const download = () => {
    if (!result.url || !result.filename) return
    const link = document.createElement('a')
    link.href = result.url
    link.download = result.filename
    link.click()
  }

  const reset = () => {
    loading.value = false
    error.value = ''
    clearResult()
  }

  const clearResult = () => {
    if (result.url) URL.revokeObjectURL(result.url)
    result.blob = null
    result.url = ''
    result.filename = ''
    result.targetType = ''
    result.jsonText = ''
    result.previewRows = []
    result.rowCount = 0
    result.colCount = 0
  }

  return {
    loading,
    error,
    result,
    convert,
    download,
    reset,
  }
}

async function parseSource({ sourceType, file, text, options }) {
  if (sourceType === 'json') {
    if (!text?.trim()) {
      throw new Error('请输入 JSON 内容')
    }
    return jsonToRows(JSON.parse(text), options.firstRowAsHeader)
  }

  if (!file) {
    throw new Error('请先上传文件')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: true,
  })
}

function jsonToRows(data, firstRowAsHeader) {
  if (Array.isArray(data) && data.every(item => Array.isArray(item))) {
    return data.map(row => row.map(cell => normalizeCell(cell, false)))
  }

  if (Array.isArray(data) && data.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    const headers = Array.from(
      data.reduce((set, item) => {
        Object.keys(item).forEach(key => set.add(key))
        return set
      }, new Set())
    )
    const rows = data.map(item => headers.map(key => normalizeCell(item[key], false)))
    return firstRowAsHeader ? [headers, ...rows] : rows
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const headers = Object.keys(data)
    return firstRowAsHeader
      ? [headers, headers.map(key => normalizeCell(data[key], false))]
      : [headers.map(key => normalizeCell(data[key], false))]
  }

  if (Array.isArray(data)) {
    return data.map(value => [normalizeCell(value, false)])
  }

  return [[normalizeCell(data, false)]]
}

function cleanRows(rows, options) {
  const trimmed = rows.map(row => {
    const safeRow = Array.isArray(row) ? row : [row]
    return safeRow.map(cell => normalizeCell(cell, options.trimText))
  })

  let nextRows = options.removeEmptyRows
    ? trimmed.filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
    : trimmed

  if (options.dedupeRows) {
    const seen = new Set()
    nextRows = nextRows.filter(row => {
      const key = JSON.stringify(row)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return nextRows
}

function normalizeCell(value, trimText) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    return trimText ? value.trim() : value
  }
  return value
}

function buildOutputBlob(rows, targetType, options) {
  if (targetType === 'json') {
    const payload = options.firstRowAsHeader ? rowsToObjects(rows) : rows
    return new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
  }

  if (targetType === 'csv') {
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    return new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    })
  }

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function rowsToObjects(rows) {
  const headerRow = rows[0] || []
  const headers = buildHeaders(headerRow)
  return rows.slice(1).map(row => {
    const record = {}
    headers.forEach((key, index) => {
      record[key] = row[index] ?? ''
    })
    return record
  })
}

function buildHeaders(headerRow) {
  const used = new Map()
  return headerRow.map((header, index) => {
    const base = String(header || `column_${index + 1}`).trim() || `column_${index + 1}`
    const count = used.get(base) || 0
    used.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

function buildFilename(sourceName, targetType) {
  const cleanName = String(sourceName || 'data').replace(/\.[^.]+$/, '')
  return `${cleanName}_converted.${targetType}`
}
