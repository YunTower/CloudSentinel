import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSettings } = vi.hoisted(() => ({ getSettings: vi.fn() }))
vi.mock('@/public/apis/public', () => ({ publicApi: { getSettings } }))

import { usePublicSettings } from './public-settings'

describe('公开页设置状态', () => {
  beforeEach(() => vi.clearAllMocks())

  it('相同路径并发加载复用请求并缓存结果', async () => {
    let resolve!: (value: unknown) => void
    getSettings.mockReturnValue(new Promise((r) => { resolve = r }))
    const state = usePublicSettings()
    const one = state.load(' /public/team '); const two = state.load('/public/team')
    resolve({ status: true, data: { panel_title: '团队状态' } })
    await expect(Promise.all([one, two])).resolves.toEqual([
      { panel_title: '团队状态' }, { panel_title: '团队状态' },
    ])
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getSettings).toHaveBeenCalledWith({ path: '/public/team' })
    await state.load('/public/team')
    expect(getSettings).toHaveBeenCalledTimes(1)
  })

  it('后发路径胜出，较慢旧请求不会覆盖当前设置', async () => {
    const resolvers = new Map<string, (value: unknown) => void>()
    getSettings.mockImplementation(({ path }: { path: string }) => new Promise((resolve) => resolvers.set(path, resolve)))
    const state = usePublicSettings()
    const old = state.load('/old'); const current = state.load('/current')
    resolvers.get('/current')?.({ status: true, data: { panel_title: '当前' } }); await current
    resolvers.get('/old')?.({ status: true, data: { panel_title: '旧页' } }); await old
    expect(state.settings.value?.panel_title).toBe('当前')
  })

  it('空路径不发送参数，错误响应抛出后允许重试', async () => {
    getSettings.mockResolvedValueOnce({ status: false, message: '不可用' })
    const state = usePublicSettings()
    await expect(state.load()).rejects.toThrow('不可用')
    getSettings.mockResolvedValueOnce({ status: true, data: { panel_title: '默认' } })
    await expect(state.load()).resolves.toEqual({ panel_title: '默认' })
    expect(getSettings).toHaveBeenNthCalledWith(1, undefined)
    expect(getSettings).toHaveBeenCalledTimes(2)
  })
})
