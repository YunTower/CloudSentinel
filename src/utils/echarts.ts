// ECharts 工具模块
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  TitleComponentOption,
  TooltipComponentOption,
  GridComponentOption,
  LegendComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  LineChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
])

export type ECOption = ComposeOption<
  | LineSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | LegendComponentOption
>

// 获取主题颜色
export const getThemeColors = () => {
  const isDarkMode = document.documentElement.classList.contains('p-dark')

  return {
    isDark: isDarkMode,
    textColor: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
  }
}

// 初始化图表实例
export const initChart = (dom: HTMLElement): echarts.ECharts => {
  const chart = echarts.init(dom)

  // 监听窗口大小变化
  const resizeHandler = () => {
    chart.resize()
  }
  window.addEventListener('resize', resizeHandler)

  // 在图表销毁时移除监听器
  const originalDispose = chart.dispose.bind(chart)
  chart.dispose = () => {
    window.removeEventListener('resize', resizeHandler)
    originalDispose()
  }

  return chart
}

export { echarts }

