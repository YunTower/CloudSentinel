import { requester } from '@/utils/requester.ts'
import type {
  GetPermissionsSettingsResponse,
  SavePermissionsSettingsBody,
} from '@/types/settings/api'

export default {
  savePermissionsSettings: (settings: SavePermissionsSettingsBody) =>
    requester.Patch('/settings/permissions', settings),
  getPermissionsSettings: () =>
    requester.Get<GetPermissionsSettingsResponse>('/settings/permissions'),
}
