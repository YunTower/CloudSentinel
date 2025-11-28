import { requester } from '@/utils/requester.ts'

export default {
  checkAgentVersion: (type: 'github' | 'gitee' = 'github') => {
    return requester.Get(`/update/agent/check?type=${type}`)
  },
}

