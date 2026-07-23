import { publicRequester } from '@/public/utils/public-requester'
import type { GetPublicIncidentsResponse } from '@/shared/types/incidents'
import type { GetServersResponse } from '@/shared/types/manager/servers'
import type { PublicSettingsResponse } from '@/shared/types/auth'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'

export const publicApi = {
  getSettings: () => publicRequester.Get<PublicSettingsResponse>('/settings/public'),
  getServers: () => publicRequester.Get<GetServersResponse>('/public/servers'),
  getIncidents: (params: { path: string }) =>
    publicRequester.Get<GetPublicIncidentsResponse>('/public/incidents', { params }),
  getServiceMonitors: () =>
    publicRequester.Get<{
      status: boolean
      message?: string
      data: PublicServiceMonitor[]
      meta?: { last_updated_at?: string | null }
    }>('/public/service-monitors'),
}
