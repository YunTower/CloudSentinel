// 公共响应
export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

export interface GetPanelSettingsData {
  panel_title: string
  current_version: string
  current_version_type: VersionType
  log_retention_days?: number
}

export type GetCheckUpdateResponse = ApiResponse<GetUpdateData>
export type VersionType = 'dev' | 'alpha' | 'beta' | 'rc' | 'release'
export interface GetUpdateData {
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
}

// Permissions
export interface GetPermissionsSettingsData {
  allowGuest: boolean
  enablePassword: boolean
  guestPassword: string
  hasPassword?: boolean // 是否已设置访客密码
  hideSensitiveInfo: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  jwtSecret: string
  jwtExpiration: number
  adminUsername?: string
}

export type GetPermissionsSettingsResponse = ApiResponse<GetPermissionsSettingsData>

export interface SavePermissionsSettingsBody {
  allowGuest: boolean
  enablePassword: boolean
  guestPassword?: string
  hideSensitiveInfo: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  jwtSecret: string
  jwtExpiration: number
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
  webhook: { enabled: boolean; webhook: string; mentioned: string; platform?: string }
}

export interface GetAlertsSettingsData {
  notifications: AlertsNotificationsDto
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
  alertServerOfflineEnabled?: boolean
  alertServerOnlineEnabled?: boolean
}

export interface TestAlertSettingsBody {
  type: 'email' | 'webhook'
  config: AlertsNotificationsDto['email'] | AlertsNotificationsDto['webhook']
}
