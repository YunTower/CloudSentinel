import type { Router } from 'vue-router'
import { authManager } from '@/utils/auth'

export function setupRouteGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const isAuthenticated = authManager.isAuthenticated()

    // 用户未认证的情况，优先检查
    if (!isAuthenticated) {
      // 登录页面直接通过
      if (to.name === 'login') {
        next()
        return
      }

      // 检查是否是公开路由
      if (to.meta?.public) {
        next()
        return
      }

      // 阻止路由继续，直接跳转到登录页面
      router.push({ name: 'login' })
      return
    }

    // 用户已认证，检查角色权限
    const user = authManager.getCurrentUser()
    if (!user) {
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

    next()
  })

  router.afterEach((to) => {
    if (to.meta?.title) {
      document.title = `${to.meta.title} - 云哨 CloudSentinel`
    }
  })
}
