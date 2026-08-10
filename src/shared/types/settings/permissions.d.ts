// 权限设置
export interface PermissionSettings {
  maxLoginAttempts: number
  lockoutDuration: number
  // 认证配置动态化：会话有效期（秒），0 = 未显式配置
  sessionTimeout: number
  // JWT 有效期（秒），0 = 未显式配置
  jwtExpiration: number
  // JWT 密钥：仅掩码标示是否已显式配置（'***' / ''），密钥本身不回显
  jwtSecret: string
}

// 管理员账号信息
export interface AdminAccount {
  username: string
  newUsername: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
