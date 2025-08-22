import type { GuestAccessConfig } from '../auth'

// 权限设置
export interface PermissionSettings extends GuestAccessConfig {
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  jwtSecret: string
  jwtExpiration: number
}

// 管理员账号信息
export interface AdminAccount {
  username: string
  newUsername: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
