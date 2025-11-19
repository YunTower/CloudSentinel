import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { createServerTokenAuthentication } from 'alova/client'
import { useAuthStore } from '@/stores/auth'
import { jwtDecode } from 'jwt-decode'
import type { CustomJwtPayload } from '@/types/auth'

const { onResponseRefreshToken } = createServerTokenAuthentication({
  refreshTokenOnError: {
    // 统一按 401 处理过期或无效的访问令牌
    isExpired: (res) => res.status === 401,
    handler: async () => {
      const authStore = useAuthStore()

      try {
        // 尝试刷新token
        await authStore.refreshToken()
      } catch (error) {
        console.error('Token refresh failed:', error)

        const currentToken = authStore.getToken()
        let isGuest = false

        if (currentToken) {
          try {
            const decoded = jwtDecode<CustomJwtPayload>(currentToken)
            isGuest = decoded.role === 'guest'
          } catch {
          }
        }

        // 如果是游客，尝试自动重新登录
        if (isGuest) {
          try {
            const publicSettings = await authStore.loadPublicSettings()
            // 如果允许访客访问且未开启密码访问，自动重新登录
            if (publicSettings.allowGuest && !publicSettings.enablePassword) {
              const result = await authStore.handleGuestLogin('', false, publicSettings)
              if (result.success) {
                // 自动登录成功，不需要跳转
                return
              }
            }
          } catch (autoLoginError) {
            console.error('自动重新登录失败:', autoLoginError)
          }
        }

        // 如果不是游客或自动登录失败，跳转到登录页面
        authStore.logout()
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
    const authStore = useAuthStore()
    const token = authStore.getToken()
    if (token) {
      method.config.headers = {
        ...method.config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
  },
  responded: onResponseRefreshToken((response) => response.json()),
})
