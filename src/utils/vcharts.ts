import { type ITheme, type ILineChartSpec, VChart } from '@visactor/vchart'
import {
  registerLineChart,
  registerBarChart,
  registerPieChart,
  registerTooltip,
  registerCartesianCrossHair,
  registerDomTooltipHandler,
} from '@visactor/vchart'
import vChartLight from '@/data/vchart-light.json'
import vChartDark from '@/data/vchart-dark.json'

VChart.useRegisters([
  registerLineChart,
  registerBarChart,
  registerPieChart,
  registerTooltip,
  registerDomTooltipHandler,
  registerCartesianCrossHair,
])
VChart.ThemeManager.registerTheme('vChartLight', vChartLight as Partial<ITheme>)
VChart.ThemeManager.registerTheme('vChartDark', vChartDark as Partial<ITheme>)

/** 与 useLayout 的 darkMode 一致：优先 DOM class，其次 localStorage */
function getIsDark(): boolean {
  if (typeof document === 'undefined') return false
  if (document.documentElement.classList.contains('dark')) return true
  const saved = localStorage.getItem('darkMode')
  if (saved !== null) return saved === 'true'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyChartTheme(): void {
  const isDark = getIsDark()
  VChart.ThemeManager.setCurrentTheme(isDark ? 'vChartDark' : 'vChartLight')
}

// 初始化当前主题（与项目 useLayout 的 darkMode 一致）
applyChartTheme()

/**
 * 监听主题变化，与 useLayout 的 darkMode 同步
 * 应在应用启动时调用一次，例如 App.vue onMounted
 */
export function initChartThemeWatcher(): void {
  window.addEventListener('storage', (e) => {
    if (e.key === 'darkMode' && e.newValue !== null) {
      const isDark = e.newValue === 'true'
      VChart.ThemeManager.setCurrentTheme(isDark ? 'vChartDark' : 'vChartLight')
    }
  })

  window.addEventListener('theme-change', ((e: CustomEvent<boolean>) => {
    const isDark = e.detail
    VChart.ThemeManager.setCurrentTheme(isDark ? 'vChartDark' : 'vChartLight')
  }) as EventListener)
}

/**
 * 等待图表容器具有有效尺寸后再初始化，避免线上 init chart fail
 * @param container 容器元素
 * @param maxFrames 最大等待帧数，默认 20
 */
export function waitForChartContainer(
  container: HTMLElement | null,
  maxFrames = 20,
): Promise<boolean> {
  if (!container) return Promise.resolve(false)
  return new Promise((resolve) => {
    let frames = 0
    const check = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        resolve(true)
        return
      }
      frames += 1
      if (frames >= maxFrames) {
        resolve(false)
        return
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

export default VChart
export type { ILineChartSpec }
