import type { ServerItem } from '@/shared/types/server'
import type { ServerListItemData } from '@/shared/types/manager/servers'

/**
 * 格式化网络速度 (KB/s -> 可读格式)
 */
export function formatSpeed(speedKBps: number): string {
  if (speedKBps >= 1024 * 1024) {
    return `${(speedKBps / (1024 * 1024)).toFixed(1)}GB/s`
  } else if (speedKBps >= 1024) {
    return `${(speedKBps / 1024).toFixed(1)}MB/s`
  } else {
    return `${speedKBps.toFixed(1)}KB/s`
  }
}

/**
 * 格式化操作系统显示
 */
export function formatOS(os: string): string {
  if (!os) return ''
  if (os.includes('Ubuntu')) return 'Ubuntu'
  if (os.includes('CentOS')) return 'CentOS'
  if (os.includes('Windows')) return 'Windows'
  if (os.includes('Debian')) return 'Debian'
  if (os.includes('RHEL')) return 'RHEL'
  return os.split(' ')[0] // 取第一个单词
}

/** 公开页/列表用的系统图标类别（兼容多种发行版命名） */
export type OsIconKind =
  | 'windows'
  | 'apple'
  | 'ubuntu'
  | 'debian'
  | 'centos'
  | 'almalinux'
  | 'rockylinux'
  | 'redhat'
  | 'fedora'
  | 'arch'
  | 'suse'
  | 'android'
  | 'linuxmint'
  | 'linux'

/**
 * 根据 system_name / os 推断图标类型，覆盖常见发行版别名
 */
export function resolveOsIconKind(systemName?: string, os?: string): OsIconKind {
  const hay = `${systemName ?? ''} ${os ?? ''}`.toLowerCase()
  if (!hay.trim()) return 'linux'
  if (/windows|win32|win64|microsoft/.test(hay)) return 'windows'
  if (/darwin|macos|mac\s*os|osx|\bos\s*x\b|apple/.test(hay)) return 'apple'
  if (/android/.test(hay)) return 'android'
  if (/linux\s*mint|linuxmint/.test(hay)) return 'linuxmint'
  if (/ubuntu|pop!_?os|elementary|kubuntu|xubuntu|lubuntu/.test(hay)) return 'ubuntu'
  if (/debian|kali|raspbian|raspberry/.test(hay)) return 'debian'
  if (/alma/.test(hay)) return 'almalinux'
  if (/rocky/.test(hay)) return 'rockylinux'
  if (/rhel|red\s*hat/.test(hay)) return 'redhat'
  if (/centos|oracle\s*linux|scientific\s*linux/.test(hay)) return 'centos'
  if (/fedora/.test(hay)) return 'fedora'
  if (/arch|manjaro|endeavour|artix/.test(hay)) return 'arch'
  if (/suse|opensuse/.test(hay)) return 'suse'
  if (/alpine|gentoo|nixos|void|freebsd|openbsd|netbsd|bsd|linux/.test(hay)) return 'linux'
  return 'linux'
}

/**
 * 获取状态颜色类
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'text-green-500 dark:text-green-400'
    case 'offline':
      return 'text-red-500 dark:text-red-400'
    case 'maintenance':
      return 'text-yellow-500 dark:text-yellow-400'
    case 'error':
      return 'text-red-600 dark:text-red-500'
    default:
      return 'text-surface-400'
  }
}

/**
 * 获取状态文本
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'online':
      return '在线'
    case 'offline':
      return '离线'
    case 'maintenance':
      return '维护中'
    case 'error':
      return '错误'
    default:
      return '未知'
  }
}

/**
 * 解析后端下发的 last_report_time（RFC3339）为时间戳(ms)；缺失/非法返回 undefined。
 */
export function parseServerLastReportTime(raw?: string | null): number | undefined {
  if (!raw) return undefined
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : undefined
}

/**
 * 判断服务器数据是否陈旧：缺失上报时间视为陈旧；否则超过 stalenessMs 未上报视为陈旧。
 */
export function isServerDataStale(lastReportAtMs?: number, stalenessMs = 5 * 60 * 1000): boolean {
  if (lastReportAtMs === undefined || lastReportAtMs === null) return true
  return Date.now() - lastReportAtMs > stalenessMs
}

/**
 * 将后端服务器列表数据转换为前端 ServerItem 格式
 */
export function mapServerListItemToServerItem(server: ServerListItemData): ServerItem {
  const cores = typeof server.cores === 'number' ? server.cores : 0

  let status: 'online' | 'offline' | 'maintenance' | 'error' = 'offline'
  if (
    server.status === 'online' ||
    server.status === 'offline' ||
    server.status === 'maintenance' ||
    server.status === 'error'
  ) {
    status = server.status
  }

  const metrics = server.metrics || {}
  const cpuUsage = typeof metrics.cpu_usage === 'number' ? metrics.cpu_usage : 0
  const memoryUsage = typeof metrics.memory_usage === 'number' ? metrics.memory_usage : 0
  const diskUsage = typeof metrics.disk_usage === 'number' ? metrics.disk_usage : 0
  const networkUpload = typeof metrics.network_upload === 'number' ? metrics.network_upload : 0
  const networkDownload =
    typeof metrics.network_download === 'number' ? metrics.network_download : 0
  const totalStorage = typeof server.total_storage === 'string' ? server.total_storage : ''
  const swapUsage =
    typeof server.swap?.swap_usage_percent === 'number' ? server.swap.swap_usage_percent : undefined

  return {
    id: server.id,
    name: server.name,
    status,
    uptime: server.uptime || '',
    uptimeSeconds:
      typeof server.uptime_seconds === 'number' && server.uptime_seconds > 0
        ? server.uptime_seconds
        : undefined,
    uptimeSyncedAt: Date.now(),
    lastReportTime: parseServerLastReportTime(server.last_report_time),
    cpuUsage,
    memoryUsage,
    swapUsage,
    diskUsage,
    totalStorage,
    cpuName: typeof server.cpu_name === 'string' ? server.cpu_name : '',
    systemName: typeof server.system_name === 'string' ? server.system_name : '',
    cores,
    location: server.location || '',
    os: server.os || '',
    architecture: server.architecture || '',
    networkIO: {
      upload: networkUpload,
      download: networkDownload,
    },
    group_id: server.group_id,
    group: server.group,
    billing: server.billing || {},
    network: server.network || {},
  }
}
