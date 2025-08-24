import type { Router } from 'vue-router'
import { authManager } from '@/utils/auth'

export function setupRouteGuards(router: Router) {
  router.beforeEach((to, from, next) => {
    // 如果目标路由是登录页面
    if (to.name === 'login') {
      // 如果用户已经登录，重定向到首页
      if (authManager.isAuthenticated()) {
        next({ name: 'home' })
        return
      }
      next()
      return
    }

    // 检查用户认证状态
    const isAuthenticated = authManager.isAuthenticated()

    // 用户未认证的情况
    if (!isAuthenticated) {
      // 检查是否是公开路由
      if (to.meta?.public) {
        next()
        return
      }

      // 重定向到登录页面
      next({ name: 'login' })
      return
    }

    // 用户已认证，检查角色权限
    const user = authManager.getCurrentUser()

    if (!user) {
      // 用户信息无效，清除认证状态并重定向到登录页面
      authManager.logout()
      next({ name: 'login' })
      return
    }

    // 检查路由角色要求
    const requiredRoles = to.meta?.roles as string[] | undefined
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      // 权限不足，重定向到首页
      next({ name: 'home' })
      return
    }

    // 所有检查通过，允许导航
    next()
  })

  router.afterEach((to) => {
    if (to.meta?.title) {
      document.title = `${to.meta.title} - 云哨 CloudSentinel`
    }
  })
}
