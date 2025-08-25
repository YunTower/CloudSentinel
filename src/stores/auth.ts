import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { jwtDecode } from 'jwt-decode'
import type {
  CheckLoginResponse,
  CustomJwtPayload,
  GuestAccessConfig,
  LoginResponse,
  PublicSettingsResponse,
  UserRole,
  UserSession,
} from '@/types/auth'
import panelApi from '@/apis/settings/panel'
import authApi from '@/apis/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<UserSession | null>(null)
  const initialized = ref(false)
  const redirectUri = ref<string | null>(null)
  const isLoggedIn = ref(false)
  const currentUserSession = ref<UserSession | null>(null)

  // 常量
  const TOKEN_KEY = 'auth_token'
  const REFRESH_TOKEN_KEY = 'refresh_token'
  const GUEST_CONFIG_KEY = 'guest_access_config'

  // 计算属性
  const isAuthenticated = computed(() => {
    if (!initialized.value) return false
    const user = getCurrentUser()
    if (user) {
      isLoggedIn.value = true
      return true
    }
    isLoggedIn.value = false
    return false
  })

  const role = computed<UserRole>(() => (user.value?.role || 'guest') as UserRole)

  // Token 管理
  const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  }

  const setToken = (token: string, rememberMe: boolean = false): void => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(TOKEN_KEY, token)
  }

  const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)
  }

  const setRefreshToken = (token: string, rememberMe: boolean = false): void => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(REFRESH_TOKEN_KEY, token)
  }

  const clearTokens = (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  const isTokenValid = (): boolean => {
    const token = getToken()
    if (!token) return false

    try {
      const decoded = jwtDecode<CustomJwtPayload>(token)
      const currentTime = Date.now() / 1000
      return decoded.exp > currentTime
    } catch {
      return false
    }
  }

  const isTokenStoredInLocalStorage = (): boolean => {
    return localStorage.getItem(TOKEN_KEY) !== null
  }

  // 用户管理
  const getCurrentUser = (): UserSession | null => {
    // 优先返回临时存储的用户会话
    if (currentUserSession.value) {
      return currentUserSession.value
    }

    // 如果没有临时会话，尝试从token解析
    const token = getToken()
    if (!token) return null

    try {
      const decoded = jwtDecode<CustomJwtPayload>(token)
      const currentTime = Date.now() / 1000

      if (!decoded?.exp || decoded.exp <= currentTime) {
        clearTokens()
        return null
      }

      // 后端JWT载荷为 { key: "1" | string, sub: "user", exp, iat, ... }
      // 这里根据 key 推断角色与用户名，构造 UserSession
      const inferredRole: UserRole = decoded.key === '1' ? 'admin' : 'guest'
      const inferredUsername = inferredRole === 'admin' ? 'admin' : '游客'

      return {
        id: decoded.key?.toString?.() || 'unknown',
        username: decoded.username || inferredUsername,
        role: decoded.role || inferredRole,
        exp: decoded.exp,
      }
    } catch {
      clearTokens()
      return null
    }
  }

  const setCurrentUser = (userSession: UserSession): void => {
    // 确保状态更新的顺序和响应性
    user.value = userSession
    currentUserSession.value = userSession
    isLoggedIn.value = true
    initialized.value = true // 设置初始化状态为true，确保isAuthenticated能正确计算
  }

  // 权限检查
  const hasRole = (role: UserRole): boolean => {
    const user = getCurrentUser()
    return user?.role === role
  }

  // 游客访问配置
  const getGuestAccessConfig = (): GuestAccessConfig => {
    try {
      const saved = localStorage.getItem(GUEST_CONFIG_KEY)
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

  const saveGuestAccessConfig = (config: GuestAccessConfig): void => {
    localStorage.setItem(GUEST_CONFIG_KEY, JSON.stringify(config))
  }

  const canGuestAccess = (): boolean => {
    const config = getGuestAccessConfig()
    return config.allowGuest
  }

  const guestRequiresPassword = (): boolean => {
    const config = getGuestAccessConfig()
    return config.allowGuest && config.enablePassword
  }

  const validateGuestPassword = (password: string): boolean => {
    const config = getGuestAccessConfig()
    return config.guestPassword === password
  }

  // 公开设置
  const loadPublicSettings = async (): Promise<GuestAccessConfig> => {
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
        saveGuestAccessConfig(config)
        return config
      }

      throw new Error(data.message || '获取公开设置失败')
    } catch (error) {
      console.error('Failed to load public settings:', error)
      // 如果API失败，返回本地配置
      return getGuestAccessConfig()
    }
  }

  const getPanelTitle = async (): Promise<string> => {
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

  // 登录方法
  const login = async (
    username: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<UserSession> => {
    try {
      // 调用真实的登录API
      const response = await authApi.login('admin', password, username, rememberMe)
      const data = response as LoginResponse

      if (data.status && data.data) {
        // 设置token
        setToken(data.data.token, rememberMe)

        // 直接使用API返回的用户信息，创建用户会话
        const userSession: UserSession = {
          id: data.data.username, // 使用用户名作为ID
          username: data.data.username,
          role: data.data.type as UserRole,
          exp: Date.now() / 1000 + 24 * 60 * 60, // 24小时过期
        }

        // 设置当前用户会话
        setCurrentUser(userSession)

        return userSession
      }

      throw new Error(data.message || '登录失败')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const guestLogin = async (
    password: string,
    rememberMe: boolean = false,
  ): Promise<UserSession> => {
    try {
      // 调用真实的游客登录API
      const response = await authApi.login('guest', password, undefined, rememberMe)
      const data = response as LoginResponse

      if (data.status && data.data) {
        // 设置token
        setToken(data.data.token, rememberMe)

        // 直接使用API返回的用户信息，创建用户会话
        const userSession: UserSession = {
          id: 'guest',
          username: '游客', // 使用中文显示名称
          role: 'guest',
          exp: Date.now() / 1000 + 24 * 60 * 60, // 24小时过期
        }

        // 设置当前用户会话
        setCurrentUser(userSession)

        return userSession
      }

      throw new Error(data.message || '登录失败')
    } catch (error) {
      console.error('Guest login failed:', error)
      throw error
    }
  }

  // 检查登录状态
  const checkLoginStatus = async (): Promise<void> => {
    try {
      const response = await authApi.checkLogin()
      const data = response as CheckLoginResponse

      if (data.status && data.data?.is_valid) {
        // 登录状态有效，恢复用户信息
        const userSession: UserSession = {
          id: data.data.user_id,
          username: data.data.user_type === 'admin' ? 'admin' : '游客',
          role: data.data.user_type as UserRole,
          exp: Date.now() / 1000 + 24 * 60 * 60, // 24小时过期
        }

        setCurrentUser(userSession)

        // 若当前在登录页或被重定向到其他页，校验后跳回刷新前页面
        try {
          const intended = sessionStorage.getItem('intended_path')
          const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
          if (intended && intended !== current) {
            // 避免死循环，替换当前历史记录
            window.location.replace(intended)
          }
        } catch {}
      } else {
        // 登录状态无效，清除认证状态
        logout()
      }
    } catch (error) {
      console.error('Failed to check login status:', error)
      // API调用失败，清除认证状态
      logout()
    }
  }

  // 刷新token
  const refreshToken = async (): Promise<string | null> => {
    try {
      const currentToken = getToken()
      if (!currentToken) {
        throw new Error('No token available')
      }

      // 直接使用当前token调用刷新API
      const response = await authApi.refreshToken()
      const data = response as LoginResponse

      if (data.status && data.data?.token) {
        // 更新token
        setToken(data.data.token, isTokenStoredInLocalStorage())
        return data.data.token
      }

      throw new Error(data.message || 'Token refresh failed')
    } catch (error) {
      console.error('Token refresh failed:', error)
      // 刷新失败，清除所有token
      clearTokens()
      throw error
    }
  }

  // 登出
  const logout = (): void => {
    clearTokens()
    isLoggedIn.value = false
    currentUserSession.value = null
    user.value = null
    initialized.value = false
  }

  // 重定向管理
  const setRedirect = (uri: string | null) => {
    redirectUri.value = uri
    try {
      if (uri) sessionStorage.setItem('intended_path', uri)
      else sessionStorage.removeItem('intended_path')
    } catch {}
  }

  // 初始化
  const bootstrap = async () => {
    // 记录当前意图路径，用于刷新后跳回
    try {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      sessionStorage.setItem('intended_path', currentPath)
      redirectUri.value = currentPath
    } catch {}

    const token = getToken()
    if (token) {
      await checkLoginStatus()
    }

    initialized.value = true
  }

  return {
    // 状态
    user,
    role,
    isAuthenticated,
    initialized,
    redirectUri,
    isLoggedIn,

    // 方法
    setRedirect,
    bootstrap,
    logout,
    hasRole,

    // Token 管理
    getToken,
    setToken,
    getRefreshToken,
    setRefreshToken,
    clearTokens,
    isTokenValid,
    refreshToken,

    // 用户管理
    getCurrentUser,
    setCurrentUser,

    // 游客访问配置
    getGuestAccessConfig,
    saveGuestAccessConfig,
    canGuestAccess,
    guestRequiresPassword,
    validateGuestPassword,

    // 公开设置
    loadPublicSettings,
    getPanelTitle,

    // 登录方法
    login,
    guestLogin,
    checkLoginStatus,
  }
})
