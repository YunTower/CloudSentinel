import { requester } from '@/admin/utils/requester.ts'

export interface ServiceMonitorHistoryEntry {
  status: string // "up" | "slow" | "down"
  response_time: number
  checked_at: string
}

export interface ServiceMonitorResult {
  id: number
  monitor_id: number
  probe_type: 'panel' | 'agent' | string
  probe_id?: string
  probe_name?: string
  probe_location?: string
  status: string
  response_time: number
  error?: string
  checked_at: string
  created_at: string
  updated_at: string
}

export interface ServiceMonitorUptimeStat {
  total_checks: number
  up_checks: number
  slow_checks: number
  down_checks: number
  uptime_rate: number
  avg_response_time: number
}

export interface ServiceMonitor {
  id: number
  name: string
  group_name: string
  type: string
  target: string
  port: number
  interval: number
  timeout: number
  enabled: boolean
  status: string
  response_time: number
  last_check_at: string | null
  server_ids: string[]
  expect_status: number
  expect_body: string
  http_method: string
  http_headers: string
  http_body: string
  failure_threshold: number
  recovery_threshold: number
  consecutive_failures: number
  consecutive_successes: number
  check_cert_expiry: boolean
  cert_expires_at: string | null
  cert_days_left: number | null
  history: ServiceMonitorHistoryEntry[]
  uptime?: Record<'24h' | '7d' | '30d', ServiceMonitorUptimeStat>
  created_at: string
  updated_at: string
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
  uptime?: Record<'24h' | '7d' | '30d', ServiceMonitorUptimeStat>
}

export interface ServiceMonitorForm {
  name: string
  group_name: string
  type: string
  target: string
  port: number
  interval: number
  timeout: number
  enabled: boolean
  server_ids: string[]
  expect_status: number
  expect_body: string
  http_method: string
  http_headers: string
  http_body: string
  failure_threshold: number
  recovery_threshold: number
  check_cert_expiry: boolean
}

export default {
  getAll: () => requester.Get<{ status: boolean; data: ServiceMonitor[] }>('/service-monitors'),
  getPublic: () =>
    requester.Get<{
      status: boolean
      message?: string
      data: PublicServiceMonitor[]
      meta?: { last_updated_at?: string | null }
    }>('/public/service-monitors'),
  create: (form: ServiceMonitorForm) =>
    requester.Post<{ status: boolean; message?: string; data: ServiceMonitor }>(
      '/service-monitors',
      form,
    ),
  update: (id: number, form: Partial<ServiceMonitorForm>) =>
    requester.Patch<{ status: boolean; message?: string; data: ServiceMonitor }>(
      `/service-monitors/${id}`,
      form,
    ),
  getResults: (id: number, limit = 100) =>
    requester.Get<{ status: boolean; message?: string; data: ServiceMonitorResult[] }>(
      `/service-monitors/${id}/results`,
      { params: { limit } },
    ),
  delete: (id: number) => requester.Delete<{ status: boolean }>(`/service-monitors/${id}`),
}
