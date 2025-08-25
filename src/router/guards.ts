import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupRouteGuards(router: Router) {
  router.beforeEach((to, from, next) => {
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

    // 检查是否需要认证
    if (to.meta?.requiresAuth && !authStore.isAuthenticated) {
      try {
        // 记录用户意图访问的受保护路径
        sessionStorage.setItem('intended_path', to.fullPath)
        authStore.setRedirect(to.fullPath)
      } catch {}
      next({ name: 'login', query: { redirect_uri: to.fullPath } })
      return
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
