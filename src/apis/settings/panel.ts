import { requester } from '@/utils/requester.ts'
import type {
  CheckReleaseTypes, GetCheckUpdateResponse,
  GetPanelSettingsResponse,
  SavePanelSettingsBody
} from '@/types/settings/api'

export default {
  savePanelSettings: (settings: SavePanelSettingsBody) =>
    requester.Patch('/settings/panel', settings),
  getPanelSettings: () => requester.Get<GetPanelSettingsResponse>('/settings/panel'),
  getPublicSettings: () => requester.Get('/settings/public'),
  checkUpdate: (type: CheckReleaseTypes) => requester.Get<GetCheckUpdateResponse>('/update/check', { params: { type } }),
  updatePanel: () => requester.Post('/update'),
}
