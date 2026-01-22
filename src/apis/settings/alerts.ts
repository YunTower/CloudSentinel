import { requester } from '@/utils/requester.ts'
import type {
  GetAlertsSettingsResponse,
  SaveAlertsSettingsBody,
  TestAlertSettingsBody,
} from '@/types/settings/api'

export default {
  getAlertsSettings: () => requester.Get<GetAlertsSettingsResponse>('/settings/alerts'),
  saveAlertsSettings: (payload: SaveAlertsSettingsBody) =>
    requester.Patch('/settings/alerts', payload),
  testAlertSettings: (payload: TestAlertSettingsBody) =>
    requester.Post('/settings/alerts/test', payload),
}
