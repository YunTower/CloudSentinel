/**
 * 将指标接口返回的 timestamp 规范为 Unix 秒。
 * 兼容：Unix 秒/毫秒数字、数字字符串、SQLite datetime（unixepoch，按 UTC）、ISO 字符串。
 */
export function parseMetricsTimestamp(raw: string | number | null | undefined): number {
  const fallback = Math.floor(Date.now() / 1000)

  if (raw === null || raw === undefined) {
    return fallback
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return fallback
    return raw < 1e12 ? Math.floor(raw) : Math.floor(raw / 1000)
  }

  const text = String(raw).trim()
  if (!text) return fallback

  if (/^\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text)
    if (!Number.isFinite(numeric)) return fallback
    return numeric < 1e12 ? Math.floor(numeric) : Math.floor(numeric / 1000)
  }

  // SQLite: datetime(..., 'unixepoch') → "YYYY-MM-DD HH:mm:ss"（UTC，无时区后缀）
  const sqliteMatch = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?$/.exec(text)
  if (sqliteMatch) {
    const ms = Date.parse(`${sqliteMatch[1]}T${sqliteMatch[2]}Z`)
    return Number.isNaN(ms) ? fallback : Math.floor(ms / 1000)
  }

  const ms = Date.parse(text)
  return Number.isNaN(ms) ? fallback : Math.floor(ms / 1000)
}

/** 将规范后的 Unix 秒转为图表 time 轴使用的毫秒。 */
export function toChartTimeMs(unixSeconds: number): number {
  return unixSeconds * 1000
}

/** 格式化为本地 HH:mm:ss，供图表 X 轴标签使用。 */
export function formatChartAxisTime(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return ''
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
