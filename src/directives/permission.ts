import type { App, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 角色权限指令
export const role = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const authStore = useAuthStore()
    const { value } = binding

    if (value && !authStore.hasRole?.(value)) {
      el.style.display = 'none'
    }
  },
}

// 认证权限指令
export const auth = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const authStore = useAuthStore()
    const { value } = binding

    if (value && !authStore.isAuthenticated) {
      el.style.display = 'none'
    }
  },
}
