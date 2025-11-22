import { requester } from '@/utils/requester.ts'
import type {
  ReleaseTypes,
  GetCheckUpdateResponse,
  GetPanelSettingsResponse,
  GetUpdateStatusResponse,
  SavePanelSettingsBody,
} from '@/types/settings/api'

// 获取公开设置
const getPublicSettingsMethod = () => {
  const method = requester.Get('/settings/public')
  method.meta = {
    isVisitor: true,
  }
  return method
}

export default {
  savePanelSettings: (settings: SavePanelSettingsBody) =>
    requester.Patch('/settings/panel', settings),
  getPanelSettings: () => requester.Get<GetPanelSettingsResponse>('/settings/panel'),
  getPublicSettings: getPublicSettingsMethod,
  checkUpdate: (type: ReleaseTypes) =>
    requester.Get<GetCheckUpdateResponse>('/update/check', { params: { type } }),
  getUpdateStatus: () => requester.Get<GetUpdateStatusResponse>('/update/status'),
  updatePanel: (type: ReleaseTypes) => requester.Post('/update', { type }),
}
