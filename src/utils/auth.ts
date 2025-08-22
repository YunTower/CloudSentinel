import { jwtDecode } from 'jwt-decode'
import type { UserRole, UserSession, GuestAccessConfig } from '@/types/auth'

// JWT Token管理
class AuthManager {
  private readonly TOKEN_KEY = 'auth_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private readonly GUEST_CONFIG_KEY = 'guest_access_config'

  // 获取访问token
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY)
  }

  // 设置访问token
  setToken(token: string, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(this.TOKEN_KEY, token)
  }

  // 获取刷新token
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY) || sessionStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  // 设置刷新token
  setRefreshToken(token: string, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(this.REFRESH_TOKEN_KEY, token)
  }

  // 清除所有token
  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(this.TOKEN_KEY)
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY)
  }

  // 检查token是否有效
  isTokenValid(): boolean {
    const token = this.getToken()
    if (!token) return false

    try {
      const decoded = jwtDecode<UserSession>(token)
      const currentTime = Date.now() / 1000
      return decoded.exp > currentTime
    } catch {
      return false
    }
  }

  // 获取当前用户信息
  getCurrentUser(): UserSession | null {
    const token = this.getToken()
    if (!token) return null

    try {
      const decoded = jwtDecode<UserSession>(token)
      const currentTime = Date.now() / 1000

      if (decoded.exp <= currentTime) {
        this.clearTokens()
        return null
      }

      // 如果是游客用户，恢复中文显示名称
      if (decoded.role === 'guest' && decoded.username === 'guest') {
        decoded.username = '游客'
      }

      return decoded
    } catch {
      this.clearTokens()
      return null
    }
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return this.isTokenValid()
  }

  // 检查用户角色
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }



  // 获取游客访问配置
  getGuestAccessConfig(): GuestAccessConfig {
    try {
      const saved = localStorage.getItem(this.GUEST_CONFIG_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load guest access config:', error)
    }

    // 默认配置
    return {
      allowGuest: true,
      enablePassword: false,
      guestPassword: '',
      hideSensitiveInfo: true
    }
  }

  // 保存游客访问配置
  saveGuestAccessConfig(config: GuestAccessConfig): void {
    localStorage.setItem(this.GUEST_CONFIG_KEY, JSON.stringify(config))
  }

  // 检查是否可以游客访问
  canGuestAccess(): boolean {
    const config = this.getGuestAccessConfig()
    return config.allowGuest
  }

  // 检查游客是否需要密码
  guestRequiresPassword(): boolean {
    const config = this.getGuestAccessConfig()
    return config.allowGuest && config.enablePassword
  }

  // 验证游客密码
  validateGuestPassword(password: string): boolean {
    const config = this.getGuestAccessConfig()
    return config.guestPassword === password
  }

  // 创建游客会话
  createGuestSession(rememberMe: boolean = false): void {
    const guestSession: UserSession = {
      id: 'guest',
      username: '游客',
      role: 'guest',
      exp: Date.now() / 1000 + (24 * 60 * 60) // 24小时过期
    }

    // 创建模拟JWT token（实际项目中应该由后端生成）
    const mockToken = this.createMockJWT(guestSession)
    this.setToken(mockToken, rememberMe)
  }

  // 创建模拟JWT（仅用于开发测试）
  private createMockJWT(payload: UserSession): string {
    // 创建一个简化的模拟 JWT，避免中文字符编码问题
    const mockPayload = {
      ...payload,
      username: 'guest', // 使用英文避免编码问题
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    }

    // 使用 base64url 编码（JWT 标准）
    const header = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const body = this.base64UrlEncode(JSON.stringify(mockPayload))
    const signature = this.base64UrlEncode('mock_signature_for_development_only')

    return `${header}.${body}.${signature}`
  }

  // Base64URL 编码（JWT 标准）
  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  // 登出
  logout(): void {
    this.clearTokens()
  }
}

// 导出单例实例
export const authManager = new AuthManager()


