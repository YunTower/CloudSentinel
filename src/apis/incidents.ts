import { requester } from '@/utils/requester.ts'
import type { GetIncidentsResponse, GetPublicIncidentsResponse } from '@/types/incidents'

export default {
  getAll: () => requester.Get<GetIncidentsResponse>('/incidents'),
  getPublic: () => requester.Get<GetPublicIncidentsResponse>('/public/incidents'),
  createMaintenance: (data: { title: string; message: string }) =>
    requester.Post<{ status: boolean; message?: string; data?: any }>('/incidents/maintenance', data),
  addMaintenanceUpdate: (id: number, data: { message: string }) =>
    requester.Post<{ status: boolean; message?: string; data?: any }>(`/incidents/${id}/updates`, data),
  resolveMaintenance: (id: number, data: { message?: string }) =>
    requester.Post<{ status: boolean; message?: string; data?: any }>(`/incidents/${id}/resolve`, data),
}
