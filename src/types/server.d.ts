import type { ServerGroup } from './manager/servers'

export interface ServerItem {
  id: string
  name: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  cpuUsage: number
  memoryUsage: number
  diskUsage: number // 综合磁盘使用率
  totalStorage: string // 总存储容量，如 "10TB"
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
  show_billing_cycle?: boolean
  show_traffic_limit?: boolean
  show_traffic_reset_cycle?: boolean
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom'
  custom_cycle_days?: number
  price?: number
  expire_time?: string
  traffic_limit_type?: 'unlimited' | 'permanent' | 'periodic'
  traffic_limit_bytes?: number
  traffic_reset_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  traffic_custom_cycle_days?: number
}
