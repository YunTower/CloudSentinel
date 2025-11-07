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
  port?: number
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
export type ServerDetailResponse = ApiResponse<ServerDetailData>

// 创建服务器响应数据接口
export interface CreateServerData {
  id: string
  name: string
  ip: string
  port: number
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
  port?: number
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os?: string
  architecture?: string
  agent_key?: string
  created_at?: string
  updated_at?: string
}

// 获取服务器列表响应类型
export type GetServersResponse = ApiResponse<ServerListItemData[]>

// 删除/更新服务器响应类型（通常只返回状态和消息，没有数据）
export type DeleteServerResponse = ApiResponse<null>
export type UpdateServerResponse = ApiResponse<null>

// 服务器接口定义
export interface Server {
  id: string
  name: string
  ip: string
  port?: number
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
  agent_key?: string
  createdAt: string
  updatedAt: string
  _detailLoaded?: boolean // 标记详细信息是否已加载
}

// 服务器表单接口定义
export interface ServerForm {
  name: string
  ip: string
  port?: number
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os: string
  architecture: string
  kernel: string
  hostname: string
}

// 状态选项接口定义
export interface StatusOption {
  label: string
  value: string
}
