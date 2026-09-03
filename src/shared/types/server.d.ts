import type { ServerGroup, BillingInfo, NetworkInfo } from './manager/servers'

export interface ServerItem {
  id: string
  name: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  uptime?: string
  /** 运行秒数基准（下发时刻的值），配合 uptimeSyncedAt 由前端每秒递增显示 */
  uptimeSeconds?: number
  /** 基准对应的本地时间戳(ms)，用于实时递增与 WS 校准 */
  uptimeSyncedAt?: number
  cpuUsage: number
  memoryUsage: number
  swapUsage?: number
  diskUsage: number // 综合磁盘使用率
  totalStorage?: string // 总存储容量，如"10TB"
  cpuName?: string
  systemName?: string
  cores: number
  location: string
  os: string
  architecture: string
  networkIO: {
    upload: number // KB/s
    download: number // KB/s
  }
  group_id?: number
  group?: ServerGroup
  billing?: BillingInfo
  network?: NetworkInfo
}
