import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { authApi, panelApi, websocketManager, csrfSetter } = vi.hoisted(() => ({
  authApi: {
    login: vi.fn(), checkLogin: vi.fn(), csrfToken: vi.fn(), refreshToken: vi.fn(),
    logout: vi.fn(() => ({ send: vi.fn(() => Promise.resolve()) })),
  },
  panelApi: { getPublicSettings: vi.fn() },
  websocketManager: { disconnect: vi.fn(), resetTokenInvalid: vi.fn() },
  csrfSetter: vi.fn(),
}))

vi.mock('@/admin/apis/auth', () => ({ default: authApi }))
vi.mock('@/admin/apis/settings/panel', () => ({ default: panelApi }))
vi.mock('@/admin/services/websocket-manager', () => ({ default: websocketManager }))
vi.mock('@/admin/utils/requester', () => ({ setCSRFToken: csrfSetter }))

import { useAuthStore } from './auth'

describe('管理员认证状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks()
  })

  it('校验登录输入并把 API 错误转换为用户结果', async () => {
    const store = useAuthStore()
    await expect(store.handleAdminLogin('', '')).resolves.toEqual({ success: false, error: '请输入用户名和密码' })
    authApi.login.mockRejectedValueOnce(new Error('密码错误'))
    await expect(store.handleAdminLogin('admin', 'bad')).resolves.toEqual({ success: false, error: '密码错误' })
  })

  it('登录成功后建立管理员会话、同步 CSRF 并重置 WebSocket 状态', async () => {
    authApi.login.mockResolvedValue({ status: true, data: { username: 'alice', type: 'admin' } })
    authApi.csrfToken.mockResolvedValue({ status: true, data: { csrf_token: 'csrf' } })
    const store = useAuthStore()
    const result = await store.handleAdminLogin('alice', 'secret', true)
    expect(result.success).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.role).toBe('admin')
    expect(csrfSetter).toHaveBeenCalledWith('csrf')
    expect(websocketManager.resetTokenInvalid).toHaveBeenCalled()
  })

  it('并发加载公开设置只发起一次请求并更新标题', async () => {
    let resolve!: (value: unknown) => void
    panelApi.getPublicSettings.mockReturnValue(new Promise((r) => { resolve = r }))
    const store = useAuthStore()
    const one = store.loadPublicSettings(); const two = store.loadPublicSettings()
    resolve({ status: true, data: { panel_title: '云哨测试' } })
    await expect(Promise.all([one, two])).resolves.toEqual([
      { panel_title: '云哨测试' }, { panel_title: '云哨测试' },
    ])
    expect(panelApi.getPublicSettings).toHaveBeenCalledTimes(1)
    expect(document.title).toBe('云哨测试')
  })

  it('公开设置失败时返回安全默认值但不缓存失败结果', async () => {
    panelApi.getPublicSettings.mockRejectedValue(new Error('offline'))
    const store = useAuthStore()
    await expect(store.loadPublicSettings()).resolves.toEqual({ panel_title: 'CloudSentinel 云哨' })
    await expect(store.loadPublicSettings()).resolves.toEqual({ panel_title: 'CloudSentinel 云哨' })
    expect(panelApi.getPublicSettings).toHaveBeenCalledTimes(2)
  })

  it('登录检查失败保留既有会话，明确未认证则清理本地状态', async () => {
    const store = useAuthStore()
    store.setCurrentUser({ id: 'admin', username: 'admin', role: 'admin', exp: 9999999999 })
    authApi.checkLogin.mockRejectedValueOnce(new Error('network'))
    await store.checkLoginStatus()
    expect(store.isAuthenticated).toBe(true)
    authApi.checkLogin.mockResolvedValueOnce({ status: true, data: { is_valid: false } })
    await store.checkLoginStatus()
    expect(store.isAuthenticated).toBe(false)
    expect(websocketManager.disconnect).toHaveBeenCalled()
    expect(csrfSetter).toHaveBeenCalledWith('')
  })

  it('重定向意图写入会话存储并可清除', () => {
    const store = useAuthStore()
    store.setRedirect('/servers/1')
    expect(store.redirectUri).toBe('/servers/1')
    expect(sessionStorage.getItem('intended_path')).toBe('/servers/1')
    store.setRedirect(null)
    expect(sessionStorage.getItem('intended_path')).toBeNull()
  })
})
