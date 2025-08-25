import { requester } from '@/utils/requester.ts'
import type { GetPanelSettingsResponse, SavePanelSettingsBody } from '@/types/settings/api'

export default {
  savePanelSettings: (settings: SavePanelSettingsBody) => requester.Patch('/settings/panel', settings),
  getPanelSettings: () => requester.Get<GetPanelSettingsResponse>('/settings/panel'),
  getPublicSettings: () => requester.Get('/settings/public'),
}
