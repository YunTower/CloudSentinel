import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
const csrfToken = () =>
  document.cookie
    .split('; ')
    .find((v) => v.startsWith('cloudsentinel_csrf='))
    ?.split('=')[1]

let crossOriginCSRFToken = ''

// 当管理端与 API 使用不同子域名时，HttpOnly 认证 Cookie 对页面脚本不可见。
// Token 仅由已认证的 /auth/csrf 接口返回，并只在当前内存中保存。
export const setCSRFToken = (token: string) => {
  crossOriginCSRFToken = token
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
  responded: (response) => response.json(),
})
