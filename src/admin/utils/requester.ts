import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
const csrfToken = () =>
  document.cookie
    .split('; ')
    .find((v) => v.startsWith('cloudsentinel_csrf='))
    ?.split('=')[1]

let crossOriginCSRFToken = ''

export const setCSRFToken = (token: string) => {
  crossOriginCSRFToken = token
}

const handleUnauthorized = () => {
  if (typeof window === 'undefined') return
  const current = `${window.location.pathname}${window.location.hash}`
  if (current.includes('/login')) return
  void import('@/admin/stores/auth').then(({ useAuthStore }) => {
    try {
      useAuthStore().clearLocalSession()
    } catch {
    }
    window.location.hash = '#/login'
  })
}

export const requester = createAlova({
  requestAdapter: adapterFetch(),
  baseURL: import.meta.env.VITE_API_URL_PREFIX || '/api',
  cacheFor: null,
  beforeRequest: (method) => {
    const token = csrfToken() || crossOriginCSRFToken
    if (token) method.config.headers = { ...method.config.headers, 'X-CSRF-Token': token }
    method.config.credentials = 'include'
  },
  responded: {
    onSuccess: async (response, method) => {
      if (response.status === 401 && !(method?.url || '').includes('/auth/check')) {
        handleUnauthorized()
        throw new Error('登录已过期，请重新登录')
      }
      if (!response.ok && response.status !== 401) {
        throw new Error(`请求失败 (HTTP ${response.status})`)
      }
      return await response.json()
    },
  },
})
