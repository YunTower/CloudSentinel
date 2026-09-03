import { publicRequester } from '@/public/utils/public-requester'
import type { GetPublicIncidentsResponse } from '@/shared/types/incidents'
import type { GetServersResponse } from '@/shared/types/manager/servers'
import type { PublicSettingsResponse } from '@/shared/types/auth'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'

export const publicApi = {
  getSettings: (params?: { path?: string }) =>
    publicRequester.Get<PublicSettingsResponse>('/settings/public', {
      params,
    }),
  getServers: () => publicRequester.Get<GetServersResponse>('/public/servers'),
  getIncidents: (params: { path: string; page?: number; pageSize?: number }) => {
    // 后端 query 为下划线风格；仅传递有值的分页参数
    const query: Record<string, string | number> = { path: params.path }
    if (params.page !== undefined) query.page = params.page
    if (params.pageSize !== undefined) query.page_size = params.pageSize
    return publicRequester.Get<GetPublicIncidentsResponse>('/public/incidents', { params: query })
  },
  getServiceMonitors: () =>
    publicRequester.Get<{
      status: boolean
      message?: string
      data: PublicServiceMonitor[]
      meta?: { last_updated_at?: string | null }
    }>('/public/service-monitors'),
}
