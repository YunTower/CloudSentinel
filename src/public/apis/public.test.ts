import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requester } = vi.hoisted(() => ({ requester: { Get: vi.fn() } }))
vi.mock('@/public/utils/public-requester', () => ({ publicRequester: requester }))
import { publicApi } from './public'

describe('公开 API 契约', () => {
  beforeEach(() => vi.clearAllMocks())
  it('覆盖公开设置、服务器、事件和监测入口', () => {
    publicApi.getSettings(); expect(requester.Get).toHaveBeenLastCalledWith('/settings/public',{params:undefined})
    publicApi.getSettings({path:'/public/team'}); expect(requester.Get).toHaveBeenLastCalledWith('/settings/public',{params:{path:'/public/team'}})
    publicApi.getServers(); expect(requester.Get).toHaveBeenLastCalledWith('/public/servers')
    publicApi.getIncidents({path:'/public'}); expect(requester.Get).toHaveBeenLastCalledWith('/public/incidents',{params:{path:'/public'}})
    publicApi.getServiceMonitors(); expect(requester.Get).toHaveBeenLastCalledWith('/public/service-monitors')
  })
})
