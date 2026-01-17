import type { ServerItem } from '@/types/server'
import type { ServerListItemData } from '@/types/manager/servers'

/**
 * 格式化网络速度 (KB/s -> 可读格式)
 */
export function formatSpeed(speedKBps: number): string {
  if (speedKBps >= 1024 * 1024) {
    return `${(speedKBps / (1024 * 1024)).toFixed(1)}GB/s`
  } else if (speedKBps >= 1024) {
    return `${(speedKBps / 1024).toFixed(1)}MB/s`
  } else {
    return `${speedKBps.toFixed(1)}KB/s`
  }
}

/**
 * 格式化操作系统显示
 */
export function formatOS(os: string): string {
  if (os.includes('Ubuntu')) return 'Ubuntu'
  if (os.includes('CentOS')) return 'CentOS'
  if (os.includes('Windows')) return 'Windows'
  if (os.includes('Debian')) return 'Debian'
  if (os.includes('RHEL')) return 'RHEL'
  return os.split(' ')[0] // 取第一个单词
}

/**
 * 获取状态颜色类
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-green-500 dark:bg-green-400'
    case 'offline':
      return 'bg-red-500 dark:bg-red-400'
    case 'maintenance':
      return 'bg-yellow-500 dark:bg-yellow-400'
    case 'error':
      return 'bg-red-600 dark:bg-red-500'
    default:
      return 'bg-surface-400'
  }
}

/**
 * 获取状态文本
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'online':
      return '在线'
    case 'offline':
      return '离线'
    case 'maintenance':
      return '维护中'
    case 'error':
      return '错误'
    default:
      return '未知'
  }
}

/**
 * 将后端服务器列表数据转换为前端 ServerItem 格式
 */
export function mapServerListItemToServerItem(server: ServerListItemData): ServerItem {
  // 扩展 ServerListItemData 类型以包含指标字段
  interface ExtendedServerListItemData extends ServerListItemData {
    metrics?: {
      cpu_usage?: number
      memory_usage?: number
      disk_usage?: number
      network_upload?: number
      network_download?: number
    }
    total_storage?: string
    cores?: number
  }

  const extendedServer = server as ExtendedServerListItemData

  // 处理 cores，确保是数字
  const cores = typeof extendedServer.cores === 'number' ? extendedServer.cores : 0

  // 处理状态，确保符合类型定义
  let status: 'online' | 'offline' | 'maintenance' | 'error' = 'offline'
  if (
    server.status === 'online' ||
    server.status === 'offline' ||
    server.status === 'maintenance' ||
    server.status === 'error'
  ) {
    status = server.status
  }

  const metrics = extendedServer.metrics || {}
  const cpuUsage = typeof metrics.cpu_usage === 'number' ? metrics.cpu_usage : 0
  const memoryUsage = typeof metrics.memory_usage === 'number' ? metrics.memory_usage : 0
  const diskUsage = typeof metrics.disk_usage === 'number' ? metrics.disk_usage : 0
  const networkUpload = typeof metrics.network_upload === 'number' ? metrics.network_upload : 0
  const networkDownload =
    typeof metrics.network_download === 'number' ? metrics.network_download : 0
  const totalStorage =
    typeof extendedServer.total_storage === 'string' ? extendedServer.total_storage : ''

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
    group_id: server.group_id,
    group: server.group,
  }
}
