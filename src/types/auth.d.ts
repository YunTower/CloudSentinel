// 用户角色类型
export type UserRole = 'guest' | 'admin'

// 用户会话接口
export interface UserSession {
  id: string
  username: string
  role: UserRole
  exp: number
}

// 游客访问配置接口
export interface GuestAccessConfig {
  allowGuest: boolean
  enablePassword: boolean
  guestPassword: string
  hideSensitiveInfo: boolean
}

// API响应类型
export interface PublicSettingsResponse {
  data: {
    allow_guest_login: boolean
    guest_password_enabled: boolean
    panel_title: string
  }
  message: string
  status: boolean
}

// 登录响应类型
export interface LoginResponse {
  data: {
    token: string
    type: 'admin' | 'guest'
    username: string
  }
  message: string
  status: boolean
}

// 检查登录状态响应类型
export interface CheckLoginResponse {
  data: {
    guard: string
    is_valid: boolean
    user_id: string
    user_type: 'admin' | 'guest'
  }
  message: string
  status: boolean
}
