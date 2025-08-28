import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupRouteGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // 如果目标路由是登录页面
    if (to.name === 'login') {
      // 如果用户已经登录，重定向到首页
      if (authStore.isAuthenticated) {
        // 已认证则跳转到上次意图路径或首页
        try {
          const intended = sessionStorage.getItem('intended_path')
          if (intended && intended !== to.fullPath) {
            sessionStorage.removeItem('intended_path')
            next({ name: 'home', query: { redirect_uri: intended } })
            return
          }
        } catch {}
        next({ name: 'home', query: from.fullPath ? { redirect_uri: from.fullPath } : undefined })
        return
      }
      next()
      return
    }

    // 检查路由权限
    const requiredRoles = to.meta?.roles as string[] | undefined

    // 如果roles是['*']，代表所有人都可以访问
    if (requiredRoles && requiredRoles.includes('*')) {
      next()
      return
    }

    // 如果有token但store还未初始化，等待验证完成
    if (!authStore.initialized && authStore.getToken()) {
      try {
        await authStore.checkLoginStatus()
      } catch (error) {
        console.error('Failed to check login status:', error)
        // 验证失败，清除token并跳转登录页
        authStore.logout()
        try {
          sessionStorage.setItem('intended_path', to.fullPath)
          authStore.setRedirect(to.fullPath)
        } catch {}
        next({ name: 'login', query: { redirect_uri: to.fullPath } })
        return
      }
    }

    // 如果没有roles配置或roles不是['*']，则需要登录验证
    if (!authStore.isAuthenticated) {
      try {
        // 记录用户意图访问的受保护路径
        sessionStorage.setItem('intended_path', to.fullPath)
        authStore.setRedirect(to.fullPath)
      } catch {}
      next({ name: 'login', query: { redirect_uri: to.fullPath } })
      return
    }

    // 如果指定了具体角色，检查用户角色是否匹配
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes('*')) {
      const userRole = authStore.role
      if (!requiredRoles.includes(userRole)) {
        // 角色不匹配，重定向到首页
        next({ name: 'home' })
        return
      }
    }

    next()
  })

  // 在路由切换后检查是否需要处理重定向
  router.afterEach((to) => {
    const authStore = useAuthStore()

    // 如果当前在首页且有redirect_uri参数，且用户已认证，则跳转回去
    if (to.name === 'home' && to.query.redirect_uri && authStore.isAuthenticated) {
      const redirectUri = to.query.redirect_uri as string
      if (redirectUri && redirectUri !== to.fullPath) {
        // 使用replace避免在历史记录中留下多余的条目
        router.replace(redirectUri)
      }
    }
  })
}
