// 公共响应
export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

export type VersionType = 'dev' | 'beta' | 'release'

export interface GetPanelSettingsData {
  panel_title: string
  current_version: string
  current_version_type: VersionType
  log_retention_days?: number
  /** 更新渠道 */
  update_channel?: VersionType
}

export type GetCheckUpdateResponse = ApiResponse<GetUpdateData>
export interface GetUpdateData {
  has_update?: boolean
  latest_version: string
  latest_version_type: VersionType
  current_version: string
  current_version_type: VersionType
  publish_time: string
  change_log: string
}

export interface UpdateStatusData {
  step: string
  progress: number
  message: string
}

export type GetUpdateStatusResponse = ApiResponse<UpdateStatusData>
export type GetPanelSettingsResponse = ApiResponse<GetPanelSettingsData>

export interface SavePanelSettingsBody {
  title: string
  log_retention_days?: number
  update_channel?: VersionType
}

// Permissions
export interface GetPermissionsSettingsData {
  maxLoginAttempts: number
  lockoutDuration: number
  adminUsername?: string
  // 认证配置动态化：会话/JWT 有效期（秒），0 = 未显式配置
  sessionTimeout?: number
  jwtExpiration?: number
  // JWT 密钥：'***' 表示已显式配置，空串表示未配置；密钥本身不回显
  jwtSecret?: string
}

export type GetPermissionsSettingsResponse = ApiResponse<GetPermissionsSettingsData>

export interface SavePermissionsSettingsBody {
  maxLoginAttempts: number
  lockoutDuration: number
  sessionTimeout?: number
  jwtExpiration?: number
  jwtSecret?: string
  newUsername?: string
  newPassword?: string
  confirmPassword?: string
  currentPassword?: string
}

// Alerts
export interface AlertRuleDto {
  enabled: boolean
  warning: number
  critical: number
}

export interface AlertsRulesDto {
  cpu: AlertRuleDto
  memory: AlertRuleDto
  disk: AlertRuleDto
}

export interface AlertsNotificationsDto {
  email: {
    enabled: boolean
    smtp: string
    port: number
    security: string
    from: string
    to: string
    password?: string
    hasPassword?: boolean
  }
  webhook: { enabled: boolean; webhook: string; hasWebhook?: boolean; clearWebhook?: boolean; mentioned: string; platform?: string }
}

export interface GetAlertsSettingsData {
  notifications: AlertsNotificationsDto
  templates: import('./alerts').AlertTemplates
  defaultTemplates: import('./alerts').AlertTemplates
  /** 是否已配置至少一个通知渠道 */
  hasNotificationChannel?: boolean
  /** 开启服务器离线告警 */
  alertServerOfflineEnabled?: boolean
  /** 开启服务器上线告警 */
  alertServerOnlineEnabled?: boolean
}

export type GetAlertsSettingsResponse = ApiResponse<GetAlertsSettingsData>

export interface SaveAlertsSettingsBody {
  notifications: AlertsNotificationsDto
  templates: import('./alerts').AlertTemplates
  alertServerOfflineEnabled?: boolean
  alertServerOnlineEnabled?: boolean
}

export interface TestAlertSettingsBody {
  type: 'email' | 'webhook'
  config: AlertsNotificationsDto['email'] | AlertsNotificationsDto['webhook']
  templates: import('./alerts').AlertTemplates
}

export interface PreviewAlertTemplatesBody {
  templates: import('./alerts').AlertTemplates
}

export type PreviewAlertTemplatesResponse = ApiResponse<import('./alerts').RenderedAlertTemplates>
