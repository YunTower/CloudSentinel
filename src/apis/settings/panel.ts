import { requester } from '@/utils/requester.ts'

export default {
  savePanelSettings: (settings: { title: string }) => requester.Post('/settings/panel', settings),
  getPanelSettings: () => requester.Get('/settings/panel'),
  getPublicSettings: () => requester.Get('/settings/public'),
}
