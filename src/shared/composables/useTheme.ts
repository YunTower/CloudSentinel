import { computed, ref, type ComputedRef } from 'vue'

const STORAGE_KEY = 'darkMode'

const darkMode = ref(false)

export interface UseThemeReturn {
  isDarkMode: ComputedRef<boolean>
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
  initializeTheme: () => void
  setupThemeListener: () => void
}

/**
 * 明暗主题（html.dark + localStorage），管理端 / 公开端共用同一存储键。
 */
export function useTheme(): UseThemeReturn {
  function setDarkMode(value: boolean): void {
    darkMode.value = value
    if (value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: value }))
  }

  function toggleDarkMode(): void {
    const next = !darkMode.value
    setDarkMode(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  function initializeTheme(): void {
    const saved = localStorage.getItem(STORAGE_KEY)
    let isDark = false
    if (saved !== null) {
      isDark = saved === 'true'
    } else {
      isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    }
    setDarkMode(isDark)
  }

  function setupThemeListener(): void {
    if (!window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setDarkMode(e.matches)
      }
    })
  }

  return {
    isDarkMode: computed(() => darkMode.value),
    toggleDarkMode,
    setDarkMode,
    initializeTheme,
    setupThemeListener,
  }
}
