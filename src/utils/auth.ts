import { jwtDecode } from 'jwt-decode'
import type {
  UserRole,
  UserSession,
  GuestAccessConfig,
  PublicSettingsResponse,
  LoginResponse,
} from '@/types/auth'
import panelApi from '@/apis/settings/panel'
import authApi from '@/apis/auth'

// JWT Token管理
class AuthManager {
  private readonly TOKEN_KEY = 'auth_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private readonly GUEST_CONFIG_KEY = 'guest_access_config'
  private isLoggedIn = false // 临时认证状态标志
  private currentUserSession: UserSession | null = null // 临时用户会话存储

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
    return (
      localStorage.getItem(this.REFRESH_TOKEN_KEY) || sessionStorage.getItem(this.REFRESH_TOKEN_KEY)
    )
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
    // 优先返回临时存储的用户会话
    if (this.currentUserSession) {
      return this.currentUserSession
    }

    // 如果没有临时会话，尝试从token解析（兼容性）
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

  // 设置当前用户会话
  setCurrentUser(userSession: UserSession): void {
    this.currentUserSession = userSession
    this.isLoggedIn = true
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    // 检查是否有有效的用户信息，确保状态一致性
    const user = this.getCurrentUser()
    if (user) {
      // 如果有有效用户信息，确保认证状态为true
      this.isLoggedIn = true
      return true
    }

    // 如果没有有效用户信息，清除认证状态
    this.isLoggedIn = false
    return false
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
      hideSensitiveInfo: true,
    }
  }

  // 从API加载公开设置
  async loadPublicSettings(): Promise<GuestAccessConfig> {
    try {
      const response = await panelApi.getPublicSettings()
      console.log(response)
      const data = response as PublicSettingsResponse

      if (data.status && data.data) {
        // 映射API响应到本地配置结构
        const config: GuestAccessConfig = {
          allowGuest: data.data.allow_guest_login,
          enablePassword: data.data.guest_password_enabled,
          guestPassword: '', // API不返回密码，保持为空
          hideSensitiveInfo: true, // 默认隐藏敏感信息
        }

        // 保存到本地存储作为缓存
        this.saveGuestAccessConfig(config)
        return config
      }

      throw new Error(data.message || '获取公开设置失败')
    } catch (error) {
      console.error('Failed to load public settings:', error)
      // 如果API失败，返回本地配置
      return this.getGuestAccessConfig()
    }
  }

  // 获取面板标题
  async getPanelTitle(): Promise<string> {
    try {
      const response = await panelApi.getPublicSettings()
      const data = response as PublicSettingsResponse

      if (data.status && data.data?.panel_title) {
        return data.data.panel_title
      }

      return 'CloudSentinel 云哨' // 默认标题
    } catch (error) {
      console.error('Failed to get panel title:', error)
      return 'CloudSentinel 云哨' // 默认标题
    }
  }

  // 管理员登录
  async login(
    username: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<UserSession> {
    try {
      // 调用真实的登录API
      const response = await authApi.login('admin', password, username, rememberMe)
      const data = response as LoginResponse

      if (data.status && data.data) {
        // 设置token
        this.setToken(data.data.token, rememberMe)

        // 直接使用API返回的用户信息，创建用户会话
        const userSession: UserSession = {
          id: data.data.username, // 使用用户名作为ID
          username: data.data.username,
          role: data.data.type as UserRole,
          exp: Date.now() / 1000 + 24 * 60 * 60, // 24小时过期
        }

        // 设置当前用户会话
        this.setCurrentUser(userSession)

        return userSession
      }

      throw new Error(data.message || '登录失败')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // 游客登录
  async guestLogin(password: string, rememberMe: boolean = false): Promise<UserSession> {
    try {
      // 调用真实的游客登录API
      const response = await authApi.login('guest', password, undefined, rememberMe)
      const data = response as LoginResponse

      if (data.status && data.data) {
        // 设置token
        this.setToken(data.data.token, rememberMe)

        // 直接使用API返回的用户信息，创建用户会话
        const userSession: UserSession = {
          id: 'guest',
          username: '游客', // 使用中文显示名称
          role: 'guest',
          exp: Date.now() / 1000 + 24 * 60 * 60, // 24小时过期
        }

        // 设置当前用户会话
        this.setCurrentUser(userSession)

        return userSession
      }

      throw new Error(data.message || '登录失败')
    } catch (error) {
      console.error('Guest login failed:', error)
      throw error
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

  // 登出
  logout(): void {
    this.clearTokens()
    this.isLoggedIn = false // 清除认证状态
    this.currentUserSession = null // 清除临时用户会话
  }

  // 初始化认证状态
  initAuthState(): void {
    // 检查是否有token，如果有则尝试恢复认证状态
    const token = this.getToken()
    if (token) {
      // 尝试从token解析用户信息
      const user = this.getCurrentUser()
      if (user) {
        this.isLoggedIn = true
        this.currentUserSession = user
      } else {
        // 如果token无法解析，清除无效token
        this.clearTokens()
        this.isLoggedIn = false
        this.currentUserSession = null
      }
    }
  }
}

// 导出单例实例
export const authManager = new AuthManager()
