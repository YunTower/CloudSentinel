import { requester } from '@/utils/requester.ts'

export interface ServiceMonitorHistoryEntry {
  status: string       // "up" | "slow" | "down"
  response_time: number
  checked_at: string
}

export interface ServiceMonitor {
  id: number
  name: string
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
  history: ServiceMonitorHistoryEntry[]
  created_at: string
  updated_at: string
}

export interface ServiceMonitorForm {
  name: string
  type: string
  target: string
  port: number
  interval: number
  timeout: number
  enabled: boolean
  server_ids: string[]
  expect_status: number
  expect_body: string
}

export default {
  getAll: () => requester.Get<{ status: boolean; data: ServiceMonitor[] }>('/service-monitors'),
  create: (form: ServiceMonitorForm) =>
    requester.Post<{ status: boolean; data: ServiceMonitor }>('/service-monitors', form),
  update: (id: number, form: Partial<ServiceMonitorForm>) =>
    requester.Patch<{ status: boolean; data: ServiceMonitor }>(`/service-monitors/${id}`, form),
  delete: (id: number) =>
    requester.Delete<{ status: boolean }>(`/service-monitors/${id}`),
}
