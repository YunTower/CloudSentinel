/**
 * 运行时间实时显示工具。
 * 后端以下发时刻的运行秒数为基准（uptime_seconds），前端本地每秒递增，
 * WebSocket 每次推送只需刷新基准即可完成校准。
 */

/** 由基准运行秒数与同步时刻推算当前运行秒数；缺少基准时返回 undefined */
export function liveUptimeSeconds(
  baseSeconds: number | undefined,
  syncedAt: number | undefined,
  nowMs: number,
): number | undefined {
  if (typeof baseSeconds !== 'number' || !Number.isFinite(baseSeconds) || baseSeconds < 0) {
    return undefined
  }
  if (typeof syncedAt !== 'number' || !Number.isFinite(syncedAt)) {
    return baseSeconds
  }
  return Math.max(0, baseSeconds + Math.floor((nowMs - syncedAt) / 1000))
}

/** 将运行秒数格式化为 “X天X小时X分X秒”，前导的零单位省略 */
export function formatUptimeSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '-'
  const seconds = Math.floor(totalSeconds)

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (days > 0) return `${days}天${hours}小时${minutes}分${secs}秒`
  if (hours > 0) return `${hours}小时${minutes}分${secs}秒`
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}
