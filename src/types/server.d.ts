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
}
