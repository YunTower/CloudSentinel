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

// 进度条颜色
export const getProgressBarColor = (value: number): string => {
  if (value >= 90) return '#ef4444'
  if (value >= 70) return '#f97316'
  return 'var(--p-primary-color)'
}

// 进度条文字颜色
export const getProgressTextColor = (cpu: number) => {
  if (cpu >= 90) return 'text-red-600 dark:text-red-400'
  if (cpu >= 70) return 'text-orange-600 dark:text-orange-400'
  return 'text-[var(--p-primary-color)]'
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
