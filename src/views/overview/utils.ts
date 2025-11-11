import type { ServerItem } from '@/types/server'
import type { ServerListItemData } from '@/types/manager/servers'

/**
 * 将后端服务器列表数据转换为前端 ServerItem 格式
 */
export function mapServerListItemToServerItem(server: ServerListItemData): ServerItem {
  // 扩展 ServerListItemData 类型以包含指标字段
  interface ExtendedServerListItemData extends ServerListItemData {
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    network_upload?: number
    network_download?: number
    total_storage?: string
    cores?: number
  }

  const extendedServer = server as ExtendedServerListItemData

  // 处理 cores，确保是数字
  const cores = typeof extendedServer.cores === 'number' ? extendedServer.cores : 0

  // 处理状态，确保符合类型定义
  let status: 'online' | 'offline' | 'maintenance' | 'error' = 'offline'
  if (server.status === 'online' || server.status === 'offline' || server.status === 'maintenance' || server.status === 'error') {
    status = server.status
  }

  // 从后端返回的数据中获取指标（如果存在）
  const cpuUsage = typeof extendedServer.cpu_usage === 'number' ? extendedServer.cpu_usage : 0
  const memoryUsage = typeof extendedServer.memory_usage === 'number' ? extendedServer.memory_usage : 0
  const diskUsage = typeof extendedServer.disk_usage === 'number' ? extendedServer.disk_usage : 0
  const networkUpload = typeof extendedServer.network_upload === 'number' ? extendedServer.network_upload : 0
  const networkDownload = typeof extendedServer.network_download === 'number' ? extendedServer.network_download : 0
  const totalStorage = typeof extendedServer.total_storage === 'string' ? extendedServer.total_storage : ''

  return {
    id: server.id,
    name: server.name,
    status,
    cpuUsage,
    memoryUsage,
    diskUsage,
    totalStorage,
    cores,
    location: server.location || '',
    os: server.os || '',
    architecture: server.architecture || '',
    networkIO: {
      upload: networkUpload,
      download: networkDownload,
    },
  }
}

