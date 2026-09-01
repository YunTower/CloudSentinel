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

const toErrorResponse = (body: unknown, fallbackMessage: string): unknown => {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const normalized = body as { status?: unknown; message?: unknown }
    if (typeof normalized.status !== 'boolean') normalized.status = false
    if (typeof normalized.message !== 'string' || !normalized.message.trim()) {
      normalized.message = fallbackMessage
    }
    return normalized
  }
  return { status: false, message: fallbackMessage }
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
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
      }

      if (response.status === 401) {
        if (!(method?.url || '').includes('/auth/check')) {
          handleUnauthorized()
          return toErrorResponse(body, '登录已过期，请重新登录')
        }
      } else if (!response.ok) {
        return toErrorResponse(body, `请求失败 (HTTP ${response.status})`)
      }

      return body ?? {}
    },
  },
})
