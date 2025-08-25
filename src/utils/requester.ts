import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { createServerTokenAuthentication } from 'alova/client'
import { authManager } from './auth'

const { onResponseRefreshToken } = createServerTokenAuthentication({
  refreshTokenOnError: {
    // 统一按 401 处理过期或无效的访问令牌
    isExpired: (res) => res.status === 401,
    handler: async () => {
      try {
        await authManager.refreshToken()
      } catch (error) {
        console.error('Token refresh failed:', error)
        authManager.logout()
        window.location.href = '/login'
      }
    },
  },
})

export const requester = createAlova({
  requestAdapter: adapterFetch(),
  baseURL: '/api',
  cacheFor: null,
  beforeRequest: (method) => {
    const token = authManager.getToken()
    if (token) {
      method.config.headers = {
        ...method.config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
  },
  responded: onResponseRefreshToken((response) => response.json()),
})
