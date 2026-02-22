import { computed, ref, type ComputedRef } from 'vue'

interface AppState {
  darkMode: boolean
}

const appState = ref<AppState>({
  darkMode: false,
})

export interface UseLayoutReturn {
  isDarkMode: ComputedRef<boolean>
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
  initializeTheme: () => void
  setupThemeListener: () => void
}

export function useLayout(): UseLayoutReturn {
  function setDarkMode(value: boolean): void {
    appState.value.darkMode = value
    if (value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: value }))
  }

  function toggleDarkMode(): void {
    const newMode = !appState.value.darkMode
    setDarkMode(newMode)
    // 保存到 localStorage
    localStorage.setItem('darkMode', newMode.toString())
  }

  function initializeTheme(): void {
    // 检查 localStorage 中的设置
    const savedMode = localStorage.getItem('darkMode')
    let isDark = false

    if (savedMode !== null) {
      // 如果有保存的设置，使用保存的设置
      isDark = savedMode === 'true'
    } else {
      // 如果没有保存的设置，使用系统主题
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setDarkMode(isDark)
  }

  function setupThemeListener(): void {
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', (e) => {
        // 只有在没有手动设置时才跟随系统主题
        if (localStorage.getItem('darkMode') === null) {
          setDarkMode(e.matches)
        }
      })
    }
  }

  const isDarkMode = computed(() => appState.value.darkMode)

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    initializeTheme,
    setupThemeListener,
  }
}
