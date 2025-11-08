// 状态文本映射
export const getStatusText = (status: string) => {
  const texts = {
    all: '全部',
    online: '在线',
    offline: '离线',
    error: '异常',
  }
  return texts[status as keyof typeof texts] || '未知'
}

// 状态严重程度映射
export const getStatusSeverity = (status: string) => {
  const severities = {
    online: 'success',
    offline: 'secondary',
    error: 'danger',
  }
  return severities[status as keyof typeof severities] || 'secondary'
}

// 统一的进度条颜色函数
export const getProgressBarColor = (value: number): string => {
  if (value >= 90) return '#ef4444'
  if (value >= 70) return '#f97316'
  if (value >= 50) return '#fbbf24'
  return '#10b981'
}

// CPU 文本颜色类
export const getCpuTextColorClass = (cpu: number) => {
  if (cpu >= 90) return 'text-red-600 dark:text-red-400'
  if (cpu >= 70) return 'text-orange-600 dark:text-orange-400'
  if (cpu >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

// 内存文本颜色类
export const getMemoryTextColorClass = (memory: number) => {
  if (memory >= 90) return 'text-red-600 dark:text-red-400'
  if (memory >= 70) return 'text-orange-600 dark:text-orange-400'
  if (memory >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

// 磁盘文本颜色类
export const getDiskTextColorClass = (disk: number) => {
  if (disk >= 90) return 'text-red-600 dark:text-red-400'
  if (disk >= 70) return 'text-orange-600 dark:text-orange-400'
  if (disk >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

// 格式化速度
export const formatSpeed = (bytes: number) => {
  if (bytes === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化字节
export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化运行时间
export const formatUptime = (uptime: string) => {
  if (!uptime) return '0天0时0分'
  const uptimeParts = uptime.split('天')
  const days = uptimeParts[0]
  const timeParts = uptimeParts[1]?.split('时') || ['0', '0分']
  const hours = timeParts[0]
  const minutes = timeParts[1]?.replace('分', '') || '0'
  return `${days}天${hours}时${minutes}分`
}


