import { requester } from '@/admin/utils/requester.ts'

export default {
  checkAgentVersion: () => {
    return requester.Get('/update/agent/check')
  },
}
