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
