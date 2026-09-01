import { beforeEach, describe, expect, it, vi } from 'vitest'

const { store } = vi.hoisted(() => ({
  store: {
    isAuthenticated: false,
    initialized: true,
    role: 'guest',
    bootstrap: vi.fn(),
    setRedirect: vi.fn(),
  },
}))
vi.mock('@/admin/stores/auth', () => ({ useAuthStore: () => store }))

import { setupRouteGuards } from './guards'

type Guard = (to: never, from: never, next: ReturnType<typeof vi.fn>) => Promise<void>

function setup() {
  let before!: Guard
  let after!: (to: never) => void
  const router = {
    beforeEach: vi.fn((callback) => { before = callback }),
    afterEach: vi.fn((callback) => { after = callback }),
    replace: vi.fn(),
    resolve: vi.fn((location: { name: string }) => ({
      // overview 对 admin 和 guest 开放
      meta: location.name === 'overview' ? { roles: ['admin', 'guest'] } : { roles: ['admin'] },
    })),
  }
  setupRouteGuards(router as never)
  return { router, before, after }
}

describe('管理端路由守卫', () => {
  beforeEach(() => {
    sessionStorage.clear(); vi.clearAllMocks()
    Object.assign(store, { isAuthenticated: false, initialized: true, role: 'guest' })
  })

  it('公开路由无需初始化或认证', async () => {
    const { before } = setup(); const next = vi.fn()
    await before({ name: 'public', meta: { roles: ['*'] }, fullPath: '/public' } as never, {} as never, next)
    expect(next).toHaveBeenCalledWith(); expect(store.bootstrap).not.toHaveBeenCalled()
  })

  it('未初始化时先初始化，并把未认证用户送到登录页且记录意图', async () => {
    store.initialized = false; store.bootstrap.mockImplementation(async () => { store.initialized = true })
    const { before } = setup(); const next = vi.fn()
    await before({ name: 'manager', meta: { roles: ['admin'] }, fullPath: '/servers' } as never, {} as never, next)
    expect(store.bootstrap).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('intended_path')).toBe('/servers')
    expect(store.setRedirect).toHaveBeenCalledWith('/servers')
    expect(next).toHaveBeenCalledWith({ name: 'login', query: { redirect_uri: '/servers' } })
  })

  it('已认证但角色不匹配时回到总览', async () => {
    Object.assign(store, { isAuthenticated: true, role: 'guest' })
    const { before } = setup(); const next = vi.fn()
    await before({ name: 'settings', meta: { roles: ['admin'] }, fullPath: '/settings' } as never, {} as never, next)
    expect(next).toHaveBeenCalledWith({ name: 'overview' })
  })

  it('guest 可以访问总览，不会形成无限重定向', async () => {
    Object.assign(store, { isAuthenticated: true, role: 'guest' })
    const { before } = setup(); const next = vi.fn()
    await before({ name: 'overview', meta: { roles: ['admin', 'guest'] }, fullPath: '/' } as never, {} as never, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('已认证用户进入登录页时恢复保存的意图路径', async () => {
    store.isAuthenticated = true; sessionStorage.setItem('intended_path', '/monitor')
    const { before } = setup(); const next = vi.fn()
    await before({ name: 'login', fullPath: '/login' } as never, { fullPath: '/' } as never, next)
    expect(sessionStorage.getItem('intended_path')).toBeNull()
    expect(next).toHaveBeenCalledWith({ name: 'overview', query: { redirect_uri: '/monitor' } })
  })

  it('通过总览 redirect_uri 恢复目标且使用 replace', () => {
    store.isAuthenticated = true
    const { router, after } = setup()
    after({ name: 'overview', fullPath: '/?redirect_uri=/servers', query: { redirect_uri: '/servers' } } as never)
    expect(router.replace).toHaveBeenCalledWith('/servers')
  })
})
