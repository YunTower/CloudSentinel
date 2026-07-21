import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
const csrfToken = () => document.cookie.split('; ').find((v) => v.startsWith('__Host-csrf='))?.split('=')[1]

export const requester = createAlova({
  requestAdapter: adapterFetch(),
  baseURL: import.meta.env.VITE_API_URL_PREFIX || '/api',
  cacheFor: null,
  beforeRequest: (method) => {
    const token = csrfToken()
    if (token) method.config.headers = { ...method.config.headers, 'X-CSRF-Token': token }
    method.config.credentials = 'include'
  },
  responded: (response) => response.json(),
})
