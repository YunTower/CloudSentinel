import { requester } from '@/utils/requester.ts'
import type {
  ServerForm,
  ServerGroup,
  ServerAlertRules,
  ServerAlertRulesInput,
} from '@/types/manager/servers'

export default {
  createServer: (form: ServerForm) => requester.Post('/servers', form),
  getServers: (groupID?: number) => {
    let url = '/servers'
    if (groupID !== undefined) {
      url += `?group_id=${groupID}`
    }
    return requester.Get(url)
  },
  getServerDetail: (id: string) => requester.Get(`/servers/${id}`),
  updateServer: (id: string, form: ServerForm) => requester.Patch(`/servers/${id}`, form),
  deleteServer: (id: string) => requester.Delete(`/servers/${id}`),
  restartService: (id: string) => requester.Post(`/servers/${id}/agent/restart`),
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
  updateAgent: (id: string) => {
    return requester.Post(`/servers/${id}/agent/update`)
  },
  resetAgentKey: (id: string) =>
    requester.Post<{ status: boolean; message: string; data: { agent_key: string } }>(
      `/servers/${id}/agent/reset-key`,
    ),
  // 服务器分组管理
  getGroups: () =>
    requester.Get<{ status: boolean; message: string; data: ServerGroup[] }>('/servers/groups'),
  createGroup: (group: { name: string; description?: string; color?: string }) =>
    requester.Post<{ status: boolean; message: string; data: ServerGroup }>(
      '/servers/groups',
      group,
    ),
  updateGroup: (id: number, group: { name: string; description?: string; color?: string }) =>
    requester.Patch<{ status: boolean; message: string; data: ServerGroup }>(
      `/servers/groups/${id}`,
      group,
    ),
  deleteGroup: (id: number) =>
    requester.Delete<{ status: boolean; message: string; data: null }>(`/servers/groups/${id}`),
  // 获取服务器告警规则（仅告警规则，不包括其他服务器信息）
  getServerAlertRules: (id: string) =>
    requester.Get<{ status: boolean; message: string; data: ServerAlertRules }>(
      `/servers/${id}/alert-rules`,
    ),
  // 复制告警规则
  copyAlertRules: (sourceId: string, targetIds: string[], ruleTypes: string[]) =>
    requester.Post<{ status: boolean; message: string }>('/servers/alert-rules/copy', {
      source_server_id: sourceId,
      target_server_ids: targetIds,
      rule_types: ruleTypes,
    }),
}
