import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { createServerTokenAuthentication } from 'alova/client'
import { authManager } from './auth'

const { onAuthRequired, onResponseRefreshToken } = createServerTokenAuthentication({
  refreshTokenOnError: {
    isExpired: (res) => res.status === 401 && res.data?.code === 'TOKEN_EXPIRED',
    handler: async () => {
      try {
        // 尝试刷新token
        await authManager.refreshToken()
      } catch (error) {
        console.error('Token refresh failed:', error)
        // 刷新失败，清除认证状态并跳转到登录页
        authManager.logout()
        window.location.href = '/login'
      }
    },
  },
})

export const requester = createAlova({
  requestAdapter: adapterFetch(),
  baseURL: '/api',
  beforeRequest: onAuthRequired((method) => {
    // 自动添加Authorization header
    const token = authManager.getToken()
    if (token) {
      method.config.headers = {
        ...method.config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
  }),
  responded: onResponseRefreshToken((response) => {
    return response.json()
  }),
})
