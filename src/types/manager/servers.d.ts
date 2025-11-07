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
