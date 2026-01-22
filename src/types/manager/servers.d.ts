// API 响应类型
export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

// 服务器详情数据接口
export interface ServerDetailData {
  id: string
  name: string
  ip: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os?: string
  architecture?: string
  kernel?: string
  hostname?: string
  cores?: number
  agent_version?: string
  system_name?: string
  boot_time?: string
  last_report_time?: string
  uptime_days?: number
  agent_key?: string
  created_at?: string
  updated_at?: string
}

// 服务器详情响应类型
export type ServerDetailResponse = ApiResponse<ExtendedServerDetailData>

// 创建服务器响应数据接口
export interface CreateServerData {
  id: string
  name: string
  ip: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os: string
  architecture: string
  agent_key: string
  created_at: number
  updated_at: number
}

// 创建服务器响应类型
export type CreateServerResponse = ApiResponse<CreateServerData>

// 服务器列表项数据接口
export interface ServerListItemData {
  id: string
  name: string
  ip: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os?: string
  architecture?: string
  agent_key?: string
  agent_version?: string // Agent版本（仅管理员可见）
  uptime?: string
  created_at?: string
  updated_at?: string
  // 分组和付费相关字段
  group_id?: number
  group?: ServerGroup
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom'
  custom_cycle_days?: number
  price?: number
  expire_time?: string
  bandwidth_mbps?: number
  traffic_limit_type?: 'unlimited' | 'permanent' | 'periodic'
  traffic_limit_bytes?: number
  traffic_reset_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  traffic_custom_cycle_days?: number
  show_billing_cycle?: boolean
  show_traffic_limit?: boolean
  show_traffic_reset_cycle?: boolean
}

// 获取服务器列表响应类型
export type GetServersResponse = ApiResponse<ServerListItemData[]>

// 删除/更新/重启服务响应类型
export type DeleteServerResponse = ApiResponse<null>
export type UpdateServerResponse = ApiResponse<null>
export type RestartServiceResponse = ApiResponse<null>

// 服务器分组接口
export interface ServerGroup {
  id: number
  name: string
  description?: string
  color?: string
  created_at?: string
  updated_at?: string
}

// 服务器接口定义
export interface Server {
  id: string
  name: string
  ip: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os: string
  architecture?: string
  kernel?: string
  hostname?: string
  uptime?: string
  cpu: number
  memory: number
  disk: number
  networkIO?: {
    upload: number
    download: number
  }
  disks?: DiskInfo[]
  cpus?: CPUInfo[]
  memoryInfo?: MemoryInfo
  swapInfo?: SwapInfo
  traffic?: TrafficInfo
  agent_key?: string
  agent_version?: string // Agent版本（仅管理员可见）
  // 分组和付费相关字段
  group_id?: number
  group?: ServerGroup
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom'
  custom_cycle_days?: number
  price?: number
  expire_time?: string
  bandwidth_mbps?: number
  traffic_limit_type?: 'unlimited' | 'permanent' | 'periodic'
  traffic_limit_bytes?: number
  traffic_reset_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  traffic_custom_cycle_days?: number
  // Agent配置字段
  agent_timezone?: string
  agent_metrics_interval?: number
  agent_detail_interval?: number
  agent_system_interval?: number
  agent_heartbeat_interval?: number
  agent_log_path?: string
  // 显示开关字段
  show_billing_cycle?: boolean
  show_traffic_limit?: boolean
  show_traffic_reset_cycle?: boolean
  createdAt: string
  updatedAt: string
  _detailLoaded?: boolean // 标记详细信息是否已加载
}

// 服务器表单接口定义
export interface ServerForm {
  name: string
  ip: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os: string
  architecture: string
  kernel: string
  hostname: string
  // 分组和付费相关字段
  group_id?: number
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom'
  custom_cycle_days?: number
  price?: number
  expire_time?: string
  bandwidth_mbps?: number
  traffic_limit_type?: 'unlimited' | 'permanent' | 'periodic'
  traffic_limit_bytes?: number
  traffic_reset_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  traffic_custom_cycle_days?: number
  // Agent配置字段
  agent_timezone?: string
  agent_metrics_interval?: number
  agent_detail_interval?: number
  agent_system_interval?: number
  agent_heartbeat_interval?: number
  agent_log_path?: string
  // 显示开关字段
  show_billing_cycle?: boolean
  show_traffic_limit?: boolean
  show_traffic_reset_cycle?: boolean
}

// 状态选项接口定义
export interface StatusOption {
  label: string
  value: string
}

// 磁盘信息接口
export interface DiskInfo {
  disk_name: string
  mount_point: string
  total_size: number
  used_size: number
  free_size: number
  usage_percent: number
}

// CPU核心信息接口
export interface CPUInfo {
  cpu_name: string
  cpu_usage: number
  cores: number
  timestamp?: number
}

// 内存信息接口
export interface MemoryInfo {
  memory_total: number
  memory_used: number
  memory_usage_percent: number
  timestamp?: number
}

// Swap信息接口
export interface SwapInfo {
  swap_total: number
  swap_used: number
  swap_free: number
  swap_usage_percent: number
  timestamp?: number
}

// 流量信息接口
export interface TrafficInfo {
  upload_bytes: number
  download_bytes: number
}

// 性能指标数据接口
export interface MetricsData {
  timestamp: number
  cpu_usage: number
  memory_usage: number
  disk_usage?: number // 磁盘使用率
  disk_read?: number // 磁盘读取速度（KB/s）
  disk_write?: number // 磁盘写入速度（KB/s）
  network_upload: number
  network_download: number
}

// 性能指标响应类型
export type GetServerMetricsResponse = ApiResponse<MetricsData[]>

// 扩展服务器详情数据接口
export interface ExtendedServerDetailData extends ServerDetailData {
  uptime?: string
  disks?: DiskInfo[]
  cpus?: CPUInfo[]
  memory?: MemoryInfo
  swap?: SwapInfo
  traffic?: TrafficInfo
  group_id?: number
  group?: ServerGroup
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom'
  custom_cycle_days?: number
  price?: number
  expire_time?: string
  bandwidth_mbps?: number
  traffic_limit_type?: 'unlimited' | 'permanent' | 'periodic'
  traffic_limit_bytes?: number
  traffic_reset_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  traffic_custom_cycle_days?: number
  // Agent配置字段
  agent_timezone?: string
  agent_metrics_interval?: number
  agent_detail_interval?: number
  agent_system_interval?: number
  agent_heartbeat_interval?: number
  agent_log_path?: string
  // 显示开关字段
  show_billing_cycle?: boolean
  show_traffic_limit?: boolean
  show_traffic_reset_cycle?: boolean
  alert_rules?: ServerAlertRules
  notification_channels?: ServerNotificationChannels
}

// 告警规则接口
export interface AlertRule {
  enabled: boolean
  warning: number
  critical: number
}

// 服务器告警规则集合
export interface ServerAlertRules {
  cpu: AlertRule
  memory: AlertRule
  disk: AlertRule
  bandwidth?: {
    enabled: boolean
    threshold: number // Mbps
  }
  traffic?: {
    enabled: boolean
    threshold_percent: number // 流量使用百分比阈值
  }
  expiration?: {
    enabled: boolean
    alert_days: number // 提前多少天告警
  }
}

// 服务器告警规则输入接口
export interface ServerAlertRulesInput {
  cpu?: AlertRule
  memory?: AlertRule
  disk?: AlertRule
  bandwidth?: {
    enabled: boolean
    threshold: number
  }
  traffic?: {
    enabled: boolean
    threshold_percent: number
  }
  expiration?: {
    enabled: boolean
    alert_days: number
  }
}

// 服务器通知渠道配置
export interface ServerNotificationChannels {
  email?: boolean
  webhook?: boolean
}

// 服务器表单接口
export interface ServerFormWithAlertRules extends ServerForm {
  alert_rules?: ServerAlertRulesInput
  notification_channels?: ServerNotificationChannels
}
