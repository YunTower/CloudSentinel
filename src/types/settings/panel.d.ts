import type { VersionType } from './api'

// 面板设置
export interface PanelSettings {
  title: string
  log_retention_days?: number
  /** 更新渠道 */
  update_channel?: VersionType
}

// 更新源信息
export interface UpdateSource {
  label: string
  value: string
  description: string
}
