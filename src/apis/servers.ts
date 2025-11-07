import { requester } from '@/utils/requester.ts'
import type { ServerForm } from '@/types/manager/servers'

export default {
  createServer: (form: ServerForm) => requester.Post('/servers', form),
  getServers: () => requester.Get('/servers'),
  getServerDetail: (id: string) => requester.Get(`/servers/${id}`),
  updateServer: (id: string, form: ServerForm) => requester.Patch(`/servers/${id}`, form),
  deleteServer: (id: string) => requester.Delete(`/servers/${id}`),
}

