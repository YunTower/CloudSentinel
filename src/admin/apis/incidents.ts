import { requester } from '@/admin/utils/requester.ts'
import type { GetIncidentsResponse, GetPublicIncidentsResponse } from '@/shared/types/incidents'

export default {
  getAll: () => requester.Get<GetIncidentsResponse>('/incidents'),
  getPublic: (params: { path: string }) =>
    requester.Get<GetPublicIncidentsResponse>('/public/incidents', { params }),
  createMaintenance: (data: {
    title: string
    message: string
    impact?: 'outage' | 'degraded' | 'maintenance'
    page_ids?: string[]
  }) =>
    requester.Post<{ status: boolean; message?: string; data?: unknown }>(
      '/incidents/maintenance',
      data,
    ),
  addMaintenanceUpdate: (id: number, data: { message: string }) =>
    requester.Post<{ status: boolean; message?: string; data?: unknown }>(
      `/incidents/${id}/updates`,
      data,
    ),
  resolveMaintenance: (id: number, data: { message?: string }) =>
    requester.Post<{ status: boolean; message?: string; data?: unknown }>(
      `/incidents/${id}/resolve`,
      data,
    ),
}
