import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { auth, role } from './permission'
import { useAuthStore } from '@/admin/stores/auth'

describe('权限指令', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('隐藏角色不匹配的元素并保留匹配角色元素', () => {
    const store = useAuthStore()
    store.setCurrentUser({ id: 'admin', username: 'admin', role: 'admin', exp: 9999999999 })
    const denied = document.createElement('button')
    role.mounted(denied, { value: 'guest' } as never)
    expect(denied.style.display).toBe('none')
    const allowed = document.createElement('button')
    role.mounted(allowed, { value: 'admin' } as never)
    expect(allowed.style.display).toBe('')
  })

  it('仅在要求认证且当前未认证时隐藏元素', () => {
    const denied = document.createElement('button')
    auth.mounted(denied, { value: true } as never)
    expect(denied.style.display).toBe('none')
    const optional = document.createElement('button')
    auth.mounted(optional, { value: false } as never)
    expect(optional.style.display).toBe('')
  })
})
