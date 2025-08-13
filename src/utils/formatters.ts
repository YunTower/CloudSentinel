// 通用格式化工具函数

/**
 * 格式化网络速度
 * @param bytes 字节数
 * @returns 格式化后的速度字符串
 */
export const formatSpeed = (bytes: number): string => {
  if (bytes === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化运行时间
 * @param uptime 运行时间字符串
 * @returns 简化的运行时间
 */
export const formatUptime = (uptime: string): string => {
  if (!uptime) return '0天'
  const uptimeParts = uptime.split('天')
  return uptimeParts[0] + '天'
}

/**
 * 格式化最后更新时间
 * @param lastUpdate ISO 时间字符串
 * @returns 相对时间描述
 */
export const formatLastUpdate = (lastUpdate: string): string => {
  const now = new Date()
  const updateTime = new Date(lastUpdate)
  const diffMs = now.getTime() - updateTime.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}天前`
}

/**
 * 格式化日期时间
 * @param dateTime ISO 时间字符串
 * @returns 格式化的日期时间
 */
export const formatDateTime = (dateTime: string): string => {
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 格式化时间差
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 时间差描述
 */
export const formatTimeDiff = (startTime: string, endTime?: string): string => {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 60) return `${diffMinutes}分钟`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}天`
}

/**
 * 格式化百分比（保留1位小数）
 * @param value 数值
 * @returns 格式化的百分比
 */
export const formatPercentage = (value: number): string => {
  return value.toFixed(1) + '%'
}

/**
 * 格式化存储大小
 * @param bytes 字节数
 * @returns 格式化的存储大小
 */
export const formatStorageSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
