// 权限设置
export interface PermissionSettings {
  maxLoginAttempts: number
  lockoutDuration: number
}

// 管理员账号信息
export interface AdminAccount {
  username: string
  newUsername: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
