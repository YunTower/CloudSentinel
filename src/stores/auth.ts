import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { jwtDecode } from 'jwt-decode'
import type {
  CheckLoginResponse,
  CustomJwtPayload,
  LoginResponse,
  PublicSettingsResponse,
  UserRole,
  UserSession,
} from '@/types/auth'
import panelApi from '@/apis/settings/panel'
import authApi from '@/apis/auth'
import websocketManager from '@/services/websocket-manager'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<UserSession | null>(null)
  const initialized = ref(false)
  const redirectUri = ref<string | null>(null)
  const isLoggedIn = ref(false)
  const currentUserSession = ref<UserSession | null>(null)
  const publicSettings = ref<PublicSettingsResponse['data'] | null>(null)
  const loadingPublicSettings = ref(false)
  const loadingPublicSettingsPromise = ref<Promise<PublicSettingsResponse['data']> | null>(null)
  const bootstrapPromise = ref<Promise<void> | null>(null)

  // 常量
  const TOKEN_KEY = 'auth_token'
  const REFRESH_TOKEN_KEY = 'refresh_token'

  // 计算属性
  const isAuthenticated = computed(() => {
    if (!initialized.value) return false
    return getCurrentUser() !== null
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

  const clearPublicSettingsCache = (): void => {
    publicSettings.value = null
    loadingPublicSettingsPromise.value = null
  }

  const refreshPublicSettings = async (): Promise<PublicSettingsResponse['data']> => {
    clearPublicSettingsCache()
    return await loadPublicSettings()
  }

  // 公开设置
  const fetchPublicSettings = async (): Promise<PublicSettingsResponse['data']> => {
    if (publicSettings.value) {
      if (publicSettings.value.panel_title) {
        document.title = `${publicSettings.value.panel_title}`
      }
      return publicSettings.value
    }

    if (loadingPublicSettingsPromise.value) {
      return loadingPublicSettingsPromise.value
    }

    loadingPublicSettings.value = true
    const requestPromise = (async (): Promise<PublicSettingsResponse['data']> => {
      try {
        const data = (await panelApi.getPublicSettings()) as PublicSettingsResponse

        if (data.status && data.data) {
          publicSettings.value = data.data
          if (data.data.panel_title) {
            document.title = `${data.data.panel_title}`
          }

          return data.data
        }

        throw new Error(data.message || '获取公开设置失败')
      } catch (error) {
        console.error('Failed to load public settings:', error)
        const defaultData: PublicSettingsResponse['data'] = {
          panel_title: 'CloudSentinel 云哨',
        }
        publicSettings.value = null
        document.title = `${defaultData.panel_title}`
        return defaultData
      } finally {
        loadingPublicSettings.value = false
        loadingPublicSettingsPromise.value = null
      }
    })()

    loadingPublicSettingsPromise.value = requestPromise
    return await requestPromise
  }

  const loadPublicSettings = async (): Promise<PublicSettingsResponse['data']> =>
    await fetchPublicSettings()

  const getPanelTitle = async (): Promise<string> => {
    const data = await fetchPublicSettings()
    return data.panel_title || 'CloudSentinel 云哨'
  }

  const getPublicSettings = (): PublicSettingsResponse['data'] | null => {
    return publicSettings.value
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

        // 从 JWT 中读取实际过期时间
        let tokenExp = Date.now() / 1000 + 86400
        try {
          const decoded = jwtDecode<CustomJwtPayload>(data.data.token)
          if (decoded.exp) tokenExp = decoded.exp
        } catch {}

        const userSession: UserSession = {
          id: data.data.username,
          username: data.data.username,
          role: data.data.type as UserRole,
          exp: tokenExp,
        }

        setCurrentUser(userSession)
        return userSession
      }

      throw new Error(data.message || '登录失败')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // 检查登录状态
  const checkLoginStatus = async (): Promise<void> => {
    try {
      const response = await authApi.checkLogin()
      const data = response as CheckLoginResponse

      if (data.status && data.data?.is_valid) {
        const userSession: UserSession = {
          id: data.data.user_id,
          username: data.data.user_type === 'admin' ? 'admin' : '游客',
          role: data.data.user_type as UserRole,
          exp: Date.now() / 1000 + 86400,
        }
        setCurrentUser(userSession)
      } else {
        // 服务器明确返回 token 无效，清除认证状态
        logout()
      }
    } catch (error) {
      console.error('Failed to check login status:', error)
      // 网络错误不等同于 token 失效，保留现有会话状态
      // 仅当服务器明确拒绝时才 logout
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
    websocketManager.disconnect()
    clearTokens()
    isLoggedIn.value = false
    currentUserSession.value = null
    user.value = null
    initialized.value = false
    bootstrapPromise.value = null
  }

  // 登录结果
  interface LoginResult {
    success: boolean
    userSession?: UserSession
    error?: string
  }

  // 处理管理员登录
  const handleAdminLogin = async (
    username: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<LoginResult> => {
    // 验证输入
    if (!username || !password) {
      return {
        success: false,
        error: '请输入用户名和密码',
      }
    }

    try {
      const userSession = await login(username, password, rememberMe)
      websocketManager.resetTokenInvalid()

      return {
        success: true,
        userSession,
      }
    } catch (error) {
      console.error('Admin login failed:', error)
      return {
        success: false,
        error: (error as { message: string }).message || '登录过程中发生错误',
      }
    }
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
  const bootstrap = async (): Promise<void> => {
    if (bootstrapPromise.value) {
      return await bootstrapPromise.value
    }

    const initPromise = (async (): Promise<void> => {
      try {
        // 记录当前意图路径，用于刷新后跳回
        try {
          const existingIntended = sessionStorage.getItem('intended_path')
          if (!existingIntended) {
            const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
            sessionStorage.setItem('intended_path', currentPath)
            redirectUri.value = currentPath
          } else {
            redirectUri.value = existingIntended
          }
        } catch {}

        await fetchPublicSettings()

        // 如果有 token，检查登录状态
        const token = getToken()
        if (token) {
          try {
            await checkLoginStatus()
          } catch (error) {
            console.error('Failed to check login status during bootstrap:', error)
          }
        }

        initialized.value = true
      } finally {
        // 无论成功或失败，都清除 promise，确保下次可重新初始化（如登出后重新登录）
        bootstrapPromise.value = null
      }
    })()

    bootstrapPromise.value = initPromise
    return await initPromise
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

    // 公开设置
    loadPublicSettings,
    clearPublicSettingsCache,
    refreshPublicSettings,
    getPanelTitle,
    getPublicSettings,

    // 登录方法
    login,
    checkLoginStatus,
    handleAdminLogin,
  }
})
