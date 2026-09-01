import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from './useTheme'

describe('共享主题状态', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('优先使用持久化主题并发送主题变更事件', () => {
    localStorage.setItem('darkMode', 'true')
    const listener = vi.fn()
    window.addEventListener('theme-change', listener)
    const theme = useTheme()
    theme.initializeTheme()
    expect(theme.isDarkMode.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: true }))
    window.removeEventListener('theme-change', listener)
  })

  it('没有持久化设置时使用系统主题并允许切换保存', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn() }))
    const theme = useTheme()
    theme.initializeTheme()
    expect(theme.isDarkMode.value).toBe(true)
    theme.toggleDarkMode()
    expect(theme.isDarkMode.value).toBe(false)
    expect(localStorage.getItem('darkMode')).toBe('false')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    vi.unstubAllGlobals()
  })

  it('仅在用户未手动选择主题时跟随系统变化', () => {
    let onChange: ((event: { matches: boolean }) => void) | undefined
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_name: string, callback: (event: { matches: boolean }) => void) => {
        onChange = callback
      },
    }))
    const theme = useTheme()
    theme.setupThemeListener()
    onChange?.({ matches: true })
    expect(theme.isDarkMode.value).toBe(true)
    localStorage.setItem('darkMode', 'false')
    onChange?.({ matches: false })
    expect(theme.isDarkMode.value).toBe(true)
    vi.unstubAllGlobals()
  })
})
