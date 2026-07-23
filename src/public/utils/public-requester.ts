import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'

// 公开站永不携带浏览器凭据，避免把管理会话发送到公开接口。
export const publicRequester = createAlova({
  requestAdapter: adapterFetch(),
  baseURL: import.meta.env.VITE_API_URL_PREFIX || '/api',
  cacheFor: null,
  beforeRequest: (method) => {
    method.config.credentials = 'omit'
  },
  responded: (response) => response.json(),
})
