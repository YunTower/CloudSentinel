// 公共响应
export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

// Panel
export type CheckReleaseTypes = 'gitee' | 'github'

export interface GetPanelSettingsData {
  panel_title: string
  current_version: string
}

export type GetCheckUpdateResponse = ApiResponse<GetUpdateData>

export interface GetUpdateData {
  latest_version: string
  current_version: string
  publish_time: string
  change_log: string
}

export type GetPanelSettingsResponse = ApiResponse<GetPanelSettingsData>

export interface SavePanelSettingsBody {
  title: string
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
  }
  wechat: { enabled: boolean; webhook: string; mentioned: string }
}

export interface GetAlertsSettingsData {
  rules: AlertsRulesDto
  notifications: AlertsNotificationsDto
}

export type GetAlertsSettingsResponse = ApiResponse<GetAlertsSettingsData>

export interface SaveAlertsSettingsBody {
  rules: AlertsRulesDto
  notifications: AlertsNotificationsDto
}
