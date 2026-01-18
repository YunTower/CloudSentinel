// 服务器信息接口
export interface MonitorServer {
  id: string
  name: string
  ip: string
  status: 'online' | 'offline' | 'error' | 'warning'
  cpu: number
  memory: number
  disk: number
  networkIO: {
    upload: number
    download: number
  }
  location: string
  os: string
  architecture: string
  uptime: string
  lastUpdate: string
}

// 系统概览统计
export interface SystemOverview {
  totalServers: number
  onlineServers: number
  offlineServers: number
  errorServers: number
  warningServers: number
  avgCpuUsage: number
  avgMemoryUsage: number
  avgDiskUsage: number
  totalNetworkUpload: number
  totalNetworkDownload: number
}

// 图表数据点
export interface ChartDataPoint {
  time: string
  value: number
}

// 性能指标数据
export interface PerformanceMetrics {
  cpu: ChartDataPoint[]
  memory: ChartDataPoint[]
  disk: ChartDataPoint[]
  network: {
    upload: ChartDataPoint[]
    download: ChartDataPoint[]
  }
}

// 告警信息
export interface AlertInfo {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  serverName: string
  serverId: string
  timestamp: string
  isRead: boolean
}

// 资源排行项
export interface ResourceRankingItem {
  serverId: string
  serverName: string
  value: number
  percentage: number
  status: 'online' | 'offline' | 'error' | 'warning'
}

// 资源排行数据
export interface ResourceRanking {
  cpu: ResourceRankingItem[]
  memory: ResourceRankingItem[]
  disk: ResourceRankingItem[]
}

// 监控配置
export interface MonitorConfig {
  refreshInterval: number // 刷新间隔（秒）
  chartDataPoints: number // 图表数据点数量
  enableRealTimeUpdate: boolean // 是否启用实时更新
  alertThresholds: {
    cpu: number
    memory: number
    disk: number
  }
}

// 图表配置
export interface ChartConfig {
  title: string
  color: string
  unit: string
  min?: number
  max?: number
}

// 状态严重程度
export type StatusSeverity = 'success' | 'info' | 'warn' | 'error'

// 状态颜色映射
export const STATUS_COLORS = {
  online: 'success',
  offline: 'secondary',
  error: 'danger',
  warning: 'warn',
} as const

// 资源使用率颜色类
export const USAGE_COLOR_CLASSES = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
} as const

// 工具函数类型
export type GetUsageColorClass = (usage: number) => string
export type FormatBytes = (bytes: number) => string
export type FormatUptime = (uptime: string) => string
