import type { Directive, DirectiveBinding } from 'vue'
import { authManager } from '@/utils/auth'

export const role: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding

    if (!value) {
      return
    }

    const user = authManager.getCurrentUser()
    if (!user) {
      el.style.display = 'none'
      return
    }

    const hasRole = Array.isArray(value)
      ? value.includes(user.role)
      : value === user.role

    if (!hasRole) {
      el.style.display = 'none'
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding

    if (!value) {
      el.style.display = ''
      return
    }

    const user = authManager.getCurrentUser()
    if (!user) {
      el.style.display = 'none'
      return
    }

    const hasRole = Array.isArray(value)
      ? value.includes(user.role)
      : value === user.role

    el.style.display = hasRole ? '' : 'none'
  }
}

export const auth: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const isAuthenticated = authManager.isAuthenticated()

    if (value === true && !isAuthenticated) {
      el.style.display = 'none'
    } else if (value === false && isAuthenticated) {
      el.style.display = 'none'
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const isAuthenticated = authManager.isAuthenticated()

    if (value === true && !isAuthenticated) {
      el.style.display = 'none'
    } else if (value === false && isAuthenticated) {
      el.style.display = 'none'
    } else {
      el.style.display = ''
    }
  }
}
