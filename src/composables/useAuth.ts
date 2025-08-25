import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UserSession, UserRole } from '@/types/auth'

// 权限系统组合式函数
export function useAuth() {
  const authStore = useAuthStore()
  const currentUser = ref<UserSession | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(true)

  // 计算属性
  const userRole = computed(() => currentUser.value?.role || 'guest')

  // 角色检查
  const isAdmin = computed(() => userRole.value === 'admin')
  const isGuest = computed(() => userRole.value === 'guest')

  // 角色检查
  const hasRole = (role: UserRole) => {
    return userRole.value === role
  }

  const hasAnyRole = (roles: UserRole[]) => {
    return roles.includes(userRole.value)
  }

  // 更新用户状态
  const updateUserState = () => {
    isAuthenticated.value = authStore.isAuthenticated
    currentUser.value = authStore.user
    isLoading.value = false
  }

  // 登出
  const logout = () => {
    authStore.logout()
    updateUserState()
  }

  // 检查认证状态
  const checkAuth = () => {
    updateUserState()
  }

  // 定期检查认证状态
  let authCheckInterval: number | null = null

  const startAuthCheck = () => {
    authCheckInterval = setInterval(checkAuth, 5000) // 每5秒检查一次
  }

  const stopAuthCheck = () => {
    if (authCheckInterval) {
      clearInterval(authCheckInterval)
      authCheckInterval = null
    }
  }

  // 生命周期
  onMounted(() => {
    updateUserState()
    startAuthCheck()
  })

  onUnmounted(() => {
    stopAuthCheck()
  })

  return {
    // 状态
    currentUser,
    isAuthenticated,
    isLoading,

    // 计算属性
    userRole,
    isAdmin,
    isGuest,

    // 方法
    hasRole,
    hasAnyRole,
    logout,
    checkAuth,
    updateUserState,
  }
}
