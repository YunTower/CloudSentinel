import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatChartAxisTime, parseMetricsTimestamp, toChartTimeMs } from './metricsTimestamp'

describe('指标时间戳规范化', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it.each([
    [1_700_000_000, 1_700_000_000],
    [1_700_000_000_987, 1_700_000_000],
    ['1700000000.9', 1_700_000_000],
    ['1700000000987', 1_700_000_000],
    ['2023-11-14 22:13:20', 1_700_000_000],
    ['2023-11-14T22:13:20Z', 1_700_000_000],
  ])('将 %s 解析为 Unix 秒', (input, expected) => {
    expect(parseMetricsTimestamp(input)).toBe(expected)
  })

  it.each([null, undefined, '', 'not-a-date', Number.NaN, Number.POSITIVE_INFINITY])(
    '无效输入 %s 回退到当前时间',
    (input) => expect(parseMetricsTimestamp(input)).toBe(1_786_492_800),
  )

  it('将 Unix 秒转换为图表毫秒', () => {
    expect(toChartTimeMs(1_700_000_000)).toBe(1_700_000_000_000)
  })

  it('将图表时间格式化为本地时分秒并拒绝无效值', () => {
    const ms = new Date(2026, 7, 12, 9, 5, 7).getTime()
    expect(formatChartAxisTime(ms)).toBe('09:05:07')
    expect(formatChartAxisTime(Number.NaN)).toBe('')
  })
})
