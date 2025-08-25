import { requester } from '@/utils/requester.ts'
import type { GetAlertsSettingsResponse, SaveAlertsSettingsBody } from '@/types/settings/api'

export default {
  getAlertsSettings: () => requester.Get<GetAlertsSettingsResponse>('/settings/alerts'),
  saveAlertsSettings: (payload: SaveAlertsSettingsBody) => requester.Patch('/settings/alerts', payload),
}


