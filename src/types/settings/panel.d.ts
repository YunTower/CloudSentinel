// 面板设置
export interface PanelSettings {
  title: string
}

// 版本信息
export interface VersionInfo {
  current: string
  latest: string
  hasUpdate: boolean
  updateTime: string
  changelog: string[]
}

// 更新源信息
export interface UpdateSource {
  label: string
  value: string
  url: string
  description: string
}
