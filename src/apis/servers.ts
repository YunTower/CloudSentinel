import { requester } from '@/utils/requester.ts'
import type { ServerForm } from '@/types/manager/servers'

export default {
  createServer: (form: ServerForm) => requester.Post('/servers', form),
  getServers: () => requester.Get('/servers'),
  getServerDetail: (id: string) => requester.Get(`/servers/${id}`),
  updateServer: (id: string, form: ServerForm) => requester.Patch(`/servers/${id}`, form),
  deleteServer: (id: string) => requester.Delete(`/servers/${id}`),
  restartServer: (id: string) => requester.Post(`/servers/${id}/restart`),
  getServerMetricsCPU: (id: string, start?: string, end?: string) => {
    let url = `/servers/${id}/metrics/cpu`
    const params = new URLSearchParams()
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    if (params.toString()) url += `?${params.toString()}`
    return requester.Get(url)
  },
  getServerMetricsMemory: (id: string, start?: string, end?: string) => {
    let url = `/servers/${id}/metrics/memory`
    const params = new URLSearchParams()
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    if (params.toString()) url += `?${params.toString()}`
    return requester.Get(url)
  },
  getServerMetricsDisk: (id: string, start?: string, end?: string) => {
    let url = `/servers/${id}/metrics/disk`
    const params = new URLSearchParams()
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    if (params.toString()) url += `?${params.toString()}`
    return requester.Get(url)
  },
  getServerMetricsNetwork: (id: string, start?: string, end?: string) => {
    let url = `/servers/${id}/metrics/network`
    const params = new URLSearchParams()
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    if (params.toString()) url += `?${params.toString()}`
    return requester.Get(url)
  },
  updateAgent: (id: string, type?: string) => {
    const url = `/servers/${id}/update-agent`
    const params = type ? { type } : {}
    return requester.Post(url, params)
  },
}
