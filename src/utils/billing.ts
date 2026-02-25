/**
 * 付费周期 / 到期时间展示用工具
 */

export type BillingTagType = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付',
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

/** 付费周期展示文案 */
export function getBillingCycle(billingCycle: string): string {
  return BILLING_CYCLE_LABELS[billingCycle] ?? '-'
}

/** 付费周期对应的 */
export function getBillingType(billingCycle: string): BillingTagType {
  return BILLING_CYCLE_TYPES[billingCycle] ?? 'default'
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
