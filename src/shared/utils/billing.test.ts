import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatTrafficLimitGb,
  getBillingCycle,
  getBillingType,
  getExpireCountdown,
  getTrafficCycleLabel,
  getTrafficLimitSummary,
  resolveTrafficCycle,
} from './billing'

describe('计费与流量展示', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('将已知与未知付费周期转换为稳定文案和标签类型', () => {
    expect(getBillingCycle('monthly')).toBe('月')
    expect(getBillingCycle('one_time')).toBe('一次性')
    expect(getBillingCycle('unexpected')).toBe('-')
    expect(getBillingType('yearly')).toBe('info')
    expect(getBillingType('unexpected')).toBe('default')
  })

  it('优先采用有效重置周期，并兼容永久流量类型', () => {
    expect(resolveTrafficCycle('quarterly', 'permanent')).toBe('quarterly')
    expect(resolveTrafficCycle('legacy', 'permanent')).toBe('unlimited')
    expect(resolveTrafficCycle(undefined, undefined)).toBe('')
  })

  it('格式化自定义周期以及完整和短周期文案', () => {
    expect(getTrafficCycleLabel('custom', 15)).toBe('15天')
    expect(getTrafficCycleLabel('custom')).toBe('自定义')
    expect(getTrafficCycleLabel('quarterly', undefined, undefined, 'short')).toBe('季度')
    expect(getTrafficCycleLabel()).toBe('-')
  })

  it('根据容量大小选择精度并组合流量摘要', () => {
    const gib = 1024 ** 3
    expect(formatTrafficLimitGb(0)).toBe('-')
    expect(formatTrafficLimitGb(1.25 * gib)).toBe('1.25GB')
    expect(formatTrafficLimitGb(12.5 * gib)).toBe('12.5GB')
    expect(formatTrafficLimitGb(128.4 * gib)).toBe('128GB')
    expect(getTrafficLimitSummary(2 * gib, 'monthly')).toBe('2GB/月')
    expect(getTrafficLimitSummary(undefined, undefined, undefined, 'permanent')).toBe('无限')
    expect(getTrafficLimitSummary(2 * gib)).toBe('2GB')
  })

  it('按天、小时、分钟和过期状态展示剩余时间', () => {
    vi.setSystemTime(new Date('2026-08-12T00:00:00Z'))
    expect(getExpireCountdown('2026-08-14T01:00:00Z')).toBe('2天')
    expect(getExpireCountdown('2026-08-12T03:30:00Z')).toBe('3时')
    expect(getExpireCountdown('2026-08-12T00:42:00Z')).toBe('42分')
    expect(getExpireCountdown('2026-08-11T23:59:59Z')).toBe('已过期')
  })
})
