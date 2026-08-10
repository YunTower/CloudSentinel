import { requester } from '@/admin/utils/requester.ts'
import type {
  GetAlertsSettingsResponse,
  SaveAlertsSettingsBody,
  TestAlertSettingsBody,
  PreviewAlertTemplatesBody,
  PreviewAlertTemplatesResponse,
} from '@/shared/types/settings/api'

export default {
  getAlertsSettings: () => requester.Get<GetAlertsSettingsResponse>('/settings/alerts'),
  saveAlertsSettings: (payload: SaveAlertsSettingsBody) =>
    requester.Patch('/settings/alerts', payload),
  testAlertSettings: (payload: TestAlertSettingsBody) =>
    requester.Post('/settings/alerts/test', payload),
  previewAlertTemplates: (payload: PreviewAlertTemplatesBody) =>
    requester.Post<PreviewAlertTemplatesResponse>('/settings/alerts/templates/preview', payload),
}
