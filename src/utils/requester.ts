import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { createServerTokenAuthentication } from 'alova/client'
import { useAuthStore } from '@/stores/auth'

const { onAuthRequired, onResponseRefreshToken } = createServerTokenAuthentication({
  // 自动附加 token
  assignToken: (method) => {
    const authStore = useAuthStore()
    const token = authStore.getToken()
    if (token) {
      method.config.headers = {
        ...method.config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
  },
  // Token 刷新
  refreshTokenOnError: {
    isExpired: (res) => res.status === 401,
    handler: async () => {
      const authStore = useAuthStore()
      await authStore.refreshToken()
    },
  },
  // 登出拦截器
  logout: () => {
    const authStore = useAuthStore()
    authStore.logout()
  },
  // 访客请求放行
  visitorMeta: {
    isVisitor: true,
  },
})

export const requester = createAlova({
  requestAdapter: adapterFetch(),
  baseURL: import.meta.env.VITE_API_URL_PREFIX || '/api',
  cacheFor: null,
  beforeRequest: onAuthRequired(() => {}),
  responded: onResponseRefreshToken((response) => response.json()),
})
