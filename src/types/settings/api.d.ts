// 公共响应
export interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

// Panel
export interface GetPanelSettingsData {
  panel_title: string
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
  hideSensitiveInfo: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  jwtSecret: string
  jwtExpiration: number
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
  email: { enabled: boolean; smtp: string; port: number; security: string; from: string; to: string }
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


