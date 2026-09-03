import { describe, expect, it } from 'vitest'
import { formatUptimeSeconds, liveUptimeSeconds } from './uptime'

describe('liveUptimeSeconds', () => {
  it('按基准与同步时刻推算当前秒数', () => {
    const syncedAt = 1_000_000
    expect(liveUptimeSeconds(100, syncedAt, syncedAt + 5_000)).toBe(105)
  })

  it('缺少同步时刻时直接返回基准', () => {
    expect(liveUptimeSeconds(100, undefined, 2_000_000)).toBe(100)
  })

  it('缺少或非法基准时返回 undefined，不产生负数', () => {
    expect(liveUptimeSeconds(undefined, 1_000, 2_000)).toBeUndefined()
    expect(liveUptimeSeconds(-1, 1_000, 2_000)).toBeUndefined()
    expect(liveUptimeSeconds(10, 2_000_000, 1_000_000)).toBe(0)
  })
})

describe('formatUptimeSeconds', () => {
  it('按天/小时/分/秒格式化并省略前导零单位', () => {
    expect(formatUptimeSeconds(59)).toBe('59秒')
    expect(formatUptimeSeconds(61)).toBe('1分1秒')
    expect(formatUptimeSeconds(3_723)).toBe('1小时2分3秒')
    expect(formatUptimeSeconds(583_542)).toBe('6天18小时5分42秒')
  })

  it('非法输入返回占位符', () => {
    expect(formatUptimeSeconds(Number.NaN)).toBe('-')
    expect(formatUptimeSeconds(-5)).toBe('-')
  })
})
