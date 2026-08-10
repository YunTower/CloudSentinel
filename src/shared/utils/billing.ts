/**
 * 付费周期 / 到期时间展示用工具
 */

export type BillingTagType = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'
export type TrafficCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'unlimited'

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: '月',
  quarterly: '季',
  yearly: '年',
  one_time: '一次性',
  custom: '自定义',
}

const BILLING_CYCLE_TYPES: Record<string, BillingTagType> = {
  monthly: 'success',
  quarterly: 'info',
  yearly: 'info',
  one_time: 'success',
  custom: 'default',
}

const TRAFFIC_CYCLE_LABELS_FULL: Record<TrafficCycle, string> = {
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
  custom: '自定义',
  unlimited: '无限',
}

const TRAFFIC_CYCLE_LABELS_SHORT: Record<TrafficCycle, string> = {
  monthly: '月',
  quarterly: '季度',
  yearly: '年',
  custom: '自定义',
  unlimited: '无限',
}

/** 付费周期展示文案 */
export function getBillingCycle(billingCycle: string): string {
  return BILLING_CYCLE_LABELS[billingCycle] ?? '-'
}

/** 付费周期对应的 */
export function getBillingType(billingCycle: string): BillingTagType {
  return BILLING_CYCLE_TYPES[billingCycle] ?? 'default'
}

export function resolveTrafficCycle(
  trafficResetCycle?: string,
  trafficLimitType?: string,
): TrafficCycle | '' {
  if (
    trafficResetCycle === 'monthly' ||
    trafficResetCycle === 'quarterly' ||
    trafficResetCycle === 'yearly' ||
    trafficResetCycle === 'custom' ||
    trafficResetCycle === 'unlimited'
  ) {
    return trafficResetCycle
  }

  if (trafficLimitType === 'permanent' || trafficLimitType === 'unlimited') {
    return 'unlimited'
  }

  return ''
}

export function getTrafficCycleLabel(
  trafficResetCycle?: string,
  trafficCustomCycleDays?: number,
  trafficLimitType?: string,
  style: 'full' | 'short' = 'full',
): string {
  const resolvedCycle = resolveTrafficCycle(trafficResetCycle, trafficLimitType)
  if (!resolvedCycle) return '-'

  if (resolvedCycle === 'custom') {
    return trafficCustomCycleDays ? `${trafficCustomCycleDays}天` : TRAFFIC_CYCLE_LABELS_FULL.custom
  }

  return style === 'short'
    ? TRAFFIC_CYCLE_LABELS_SHORT[resolvedCycle]
    : TRAFFIC_CYCLE_LABELS_FULL[resolvedCycle]
}

export function formatTrafficLimitGb(trafficLimitBytes?: number): string {
  if ((trafficLimitBytes ?? 0) <= 0) return '-'

  const gb = (trafficLimitBytes ?? 0) / (1024 * 1024 * 1024)
  const decimals = gb >= 100 ? 0 : gb >= 10 ? 1 : 2
  return `${gb
    .toFixed(decimals)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1')}GB`
}

export function getTrafficLimitSummary(
  trafficLimitBytes?: number,
  trafficResetCycle?: string,
  trafficCustomCycleDays?: number,
  trafficLimitType?: string,
): string {
  const sizeText = formatTrafficLimitGb(trafficLimitBytes)
  const cycleText = getTrafficCycleLabel(
    trafficResetCycle,
    trafficCustomCycleDays,
    trafficLimitType,
    'short',
  )

  if (sizeText === '-' && cycleText === '无限') return '无限'
  if (sizeText === '-') return cycleText
  if (cycleText === '-') return sizeText
  return `${sizeText}/${cycleText}`
}

/** 根据到期时间返回「剩余 X天 / X时 / X分」或「已过期」 */
export function getExpireCountdown(expireTime: string): string {
  const remaining = new Date(expireTime).getTime() - Date.now()
  if (remaining <= 0) return '已过期'
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  if (days >= 1) return `${days}天`
  if (hours >= 1) return `${hours}时`
  return `${minutes}分`
}
