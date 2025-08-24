import { requester } from '@/utils/requester.ts'

export default {
  savePermissionsSettings: (settings: { roles: string[] }) =>
    requester.Post('/settings/permissions', settings),
  getPermissionsSettings: () => requester.Get('/settings/permissions'),
}
