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

// 版本类型定义
export type VersionType = 'dev' | 'alpha' | 'beta' | 'rc' | 'release'

// 版本类型优先级：dev < alpha < beta < rc < release
export const VERSION_TYPE_PRIORITY: Record<VersionType, number> = {
  dev: 0,
  alpha: 1,
  beta: 2,
  rc: 3,
  release: 4,
}

// 版本类型标签配置
export const VERSION_TYPE_CONFIG: Record<
  VersionType,
  { label: string; severity: 'danger' | 'warn' | 'info' | 'success' }
> = {
  dev: { label: '开发版', severity: 'danger' },
  alpha: { label: '内测版', severity: 'warn' },
  beta: { label: '测试版', severity: 'info' },
  rc: { label: '预览版', severity: 'success' },
  release: { label: '正式版', severity: 'success' },
}

/**
 * 获取版本类型标签配置
 */
export const getVersionTypeConfig = (type: VersionType) => {
  return VERSION_TYPE_CONFIG[type] || VERSION_TYPE_CONFIG.release
}

/**
 * 比较两个版本号
 * @param version1 版本号1 (如 "1.0.0")
 * @param version2 版本号2 (如 "1.0.1")
 * @returns 1: version1 > version2, 0: version1 === version2, -1: version1 < version2
 */
export const compareVersions = (version1: string, version2: string): number => {
  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)
  const maxLength = Math.max(v1Parts.length, v2Parts.length)

  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0
    const v2Part = v2Parts[i] || 0

    if (v1Part > v2Part) return 1
    if (v1Part < v2Part) return -1
  }

  return 0
}

/**
 * 从版本字符串中提取版本号和版本类型
 * @param version 版本字符串，如 "1.0.0-release" 或 "1.0.0"
 * @returns { version: string, versionType: VersionType }
 */
export const parseVersion = (version: string): { version: string; versionType: VersionType } => {
  const parts = version.split('-')
  const versionNum = parts[0]
  const versionType = (parts[1] || 'release') as VersionType
  return { version: versionNum, versionType }
}

/**
 * 判断是否需要更新
 * @param currentVersion 当前版本，如 "1.0.0" 或 "1.0.0-release"
 * @param latestVersion 最新版本，如 "1.0.1" 或 "1.0.1-release"
 * @param currentVersionType 当前版本类型（如果版本号中已包含类型，可省略）
 * @param latestVersionType 最新版本类型（如果版本号中已包含类型，可省略）
 * @returns 是否需要更新
 */
export const hasUpdate = (
  currentVersion: string | undefined,
  latestVersion: string | undefined,
  currentVersionType?: VersionType,
  latestVersionType?: VersionType
): boolean => {
  if (!currentVersion || !latestVersion) return false

  // 解析版本号（如果包含类型则提取，否则使用传入的类型）
  const current = parseVersion(currentVersion)
  const latest = parseVersion(latestVersion)

  // 使用传入的类型或解析出的类型
  const currentType = currentVersionType || current.versionType
  const latestType = latestVersionType || latest.versionType

  // 比较版本号
  const versionCompare = compareVersions(latest.version, current.version)

  if (versionCompare > 0) {
    // 最新版本号更大，需要更新
    return true
  }

  if (versionCompare === 0) {
    // 版本号相同，比较版本类型优先级
    const latestPriority = VERSION_TYPE_PRIORITY[latestType] ?? 0
    const currentPriority = VERSION_TYPE_PRIORITY[currentType] ?? 0

    if (latestPriority > currentPriority) {
      // 最新版本类型优先级更高，需要更新
      return true
    }
  }

  return false
}

/**
 * 判断 Agent 是否需要更新
 * @param currentVersion 当前版本，如 "1.0.0-release"
 * @param latestVersion 最新版本，如 "1.0.1-release"
 * @param latestVersionType 最新版本类型
 * @returns 是否需要更新
 */
export const hasAgentUpdate = (
  currentVersion: string | undefined,
  latestVersion: string | undefined,
  latestVersionType: VersionType = 'release'
): boolean => {
  return hasUpdate(currentVersion, latestVersion, undefined, latestVersionType)
}
