export interface ServiceMonitorHistoryEntry {
  status: string
  response_time: number
  checked_at: string
}

export interface PublicServiceMonitor {
  id: number
  name: string
  group_name: string
  type: string
  status: string
  response_time: number
  last_check_at: string | null
  check_cert_expiry?: boolean
  cert_expires_at?: string | null
  cert_days_left?: number | null
  history: ServiceMonitorHistoryEntry[]
  uptime?: Record<'24h' | '7d' | '30d', {
    total_checks: number
    up_checks: number
    slow_checks: number
    down_checks: number
    uptime_rate: number
    avg_response_time: number
  }>
}
