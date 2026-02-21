<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { MetricsData } from '@/types/manager/servers'
import { initChart, getThemeColors, type ECOption } from '@/utils/echarts.ts'
import type { LineSeriesOption } from 'echarts/charts'
import type { YAXisOption } from 'echarts/types/dist/shared'
import type { CallbackDataParams } from 'echarts/types/dist/shared'
import { formatSpeed } from '@/utils/version.ts'
import { useLayout } from '@/composables/useLayout.ts'
import { RiLineChartLine } from '@remixicon/vue'

interface Props {
  serverId: string
  chartType: 'cpu' | 'memory' | 'disk' | 'network'
  data: MetricsData[]
  timeRange: number // 小时数
}

interface TooltipParam extends CallbackDataParams {
  axisValueLabel?: string
  value: [number, number] | number | string
  seriesName?: string
  color?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:timeRange': [value: number]
}>()

const chartContainer = ref<HTMLDivElement | null>(null)
let chartInstance: ReturnType<typeof initChart> | null = null

// 图表标题映射
const chartTitles = {
  cpu: 'CPU负载',
  memory: '内存负载',
  disk: '磁盘IO',
  network: '网络IO',
}

// 时间范围选项
const timeRangeOptions = [
  { label: '1小时', value: 1 },
  { label: '6小时', value: 6 },
  { label: '12小时', value: 12 },
  { label: '24小时', value: 24 },
]

// 创建图表配置
const createChartOption = (): ECOption => {
  const theme = getThemeColors()
  const data = props.data || []

  let series: LineSeriesOption[] = []
  const yAxisConfig: YAXisOption = {
    type: 'value',
    name: '',
    nameTextStyle: {
      color: theme.textColor,
    },
    axisLabel: {
      color: theme.textColor,
      formatter: (value: number) => {
        if (props.chartType === 'network' || props.chartType === 'disk') {
          return formatSpeed(value * 1024) // value 是 KB/s，转换为字节显示
        }
        return `${value}%`
      },
    },
    splitLine: {
      lineStyle: {
        color: theme.gridColor,
      },
    },
  }

  if (props.chartType === 'network') {
    const uploadData: Array<[number, number]> = data.map((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      return [timestamp, item.network_upload / 1024] // 转换为KB/s
    })
    const downloadData: Array<[number, number]> = data.map((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      return [timestamp, item.network_download / 1024] // 转换为KB/s
    })

    series = [
      {
        name: '上传',
        type: 'line',
        data: uploadData,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        lineStyle: {
          color: '#3b82f6',
          width: 2,
        },
        symbol: 'none',
      },
      {
        name: '下载',
        type: 'line',
        data: downloadData,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
            ],
          },
        },
        lineStyle: {
          color: '#10b981',
          width: 2,
        },
        symbol: 'none',
      },
    ]
    // yAxisConfig.name = '速度'
  } else if (props.chartType === 'disk') {
    const readData: Array<[number, number]> = data.map((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      return [timestamp, item.disk_read || 0]
    })
    const writeData: Array<[number, number]> = data.map((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      return [timestamp, item.disk_write || 0]
    })

    series = [
      {
        name: '读取速度',
        type: 'line',
        data: readData,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        lineStyle: {
          color: '#3b82f6',
          width: 2,
        },
        symbol: 'none',
      },
      {
        name: '写入速度',
        type: 'line',
        data: writeData,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
            ],
          },
        },
        lineStyle: {
          color: '#10b981',
          width: 2,
        },
        symbol: 'none',
      },
    ]
    // yAxisConfig.name = '速度'
  } else {
    let valueKey: 'cpu_usage' | 'memory_usage' = 'cpu_usage'
    const color = '#3b82f6' // 统一使用蓝色
    const colorStops: Array<{ offset: number; color: string }> = [
      { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
      { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
    ]
    let seriesName = ''

    switch (props.chartType) {
      case 'cpu':
        valueKey = 'cpu_usage'
        seriesName = '使用率'
        break
      case 'memory':
        valueKey = 'memory_usage'
        seriesName = '使用率'
        break
    }

    const chartData: Array<[number, number]> = data.map((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      return [timestamp, item[valueKey]]
    })

    series = [
      {
        name: seriesName,
        type: 'line',
        data: chartData,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops,
          },
        },
        lineStyle: {
          color,
          width: 2,
        },
        symbol: 'none',
      },
    ]
    // yAxisConfig.name = '使用率 (%)'
    yAxisConfig.max = 100
  }

  const tooltipFormatter = (params: CallbackDataParams | CallbackDataParams[]): string => {
    const paramsArray: TooltipParam[] = Array.isArray(params)
      ? (params as TooltipParam[])
      : [params as TooltipParam]
    const firstParam = paramsArray[0]
    const axisValueLabel = 'axisValueLabel' in firstParam ? firstParam.axisValueLabel : ''
    let result = `<div style="margin-bottom: 4px;">${axisValueLabel || ''}</div>`

    paramsArray.forEach((param) => {
      const valueArray =
        Array.isArray(param.value) && param.value.length === 2
          ? (param.value as [number, number])
          : null

      if (!valueArray) return

      const value = valueArray[1]
      let formattedValue = ''
      if (props.chartType === 'network' || props.chartType === 'disk') {
        formattedValue = formatSpeed(value * 1024)
      } else {
        formattedValue = `${Math.floor(value * 100) / 100}%`
      }
      const seriesName = param.seriesName || ''
      const color = param.color || '#3b82f6'
      result += `<div style="margin-top: 2px;">
        <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>
        ${seriesName}: <span style="font-weight:bold;">${formattedValue}</span>
      </div>`
    })
    return result
  }

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.backgroundColor,
      borderColor: theme.gridColor,
      textStyle: {
        color: theme.textColor,
      },
      axisPointer: {
        type: 'cross',
      },
      formatter: tooltipFormatter,
    },
    legend: {
      data: series.map((s) => s.name).filter((name): name is string => name !== undefined),
      top: 10,
      textStyle: {
        color: theme.textColor,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      boundaryGap: [0, 0],
      axisLabel: {
        color: theme.textColor,
        formatter: '{HH}:{mm}',
        hideOverlap: true,
        rotate: 0,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: yAxisConfig,
    series,
  }
}

// 初始化图表
const initChartInstance = async () => {
  if (!chartContainer.value) return

  await nextTick()

  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = initChart(chartContainer.value)
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  const option = createChartOption()
  chartInstance.setOption(option, { notMerge: false })
}

// 添加实时数据点
const addDataPoint = (dataPoint: {
  timestamp: number
  cpu_usage?: number
  memory_usage?: number
  disk_usage?: number
  disk_read?: number
  disk_write?: number
  network_upload?: number
  network_download?: number
}) => {
  if (!chartInstance) return

  const timestamp = dataPoint.timestamp * 1000 // 转换为毫秒
  const now = Date.now()

  // 根据当前选择的时间范围计算时间窗口（毫秒）
  const timeWindowMs = props.timeRange * 60 * 60 * 1000
  const timeWindowStart = now - timeWindowMs

  // 获取当前配置
  const currentOption = chartInstance.getOption() as ECOption | ECOption[]
  const option = Array.isArray(currentOption) ? currentOption[0] : currentOption
  if (!option || !Array.isArray(option.series) || option.series.length === 0) return

  // 只保留时间窗口内的数据点
  const filterDataByTimeWindow = (data: Array<[number, number]>): Array<[number, number]> => {
    return data.filter((point) => point[0] >= timeWindowStart)
  }

  if (props.chartType === 'network') {
    // 网络图表
    const uploadValue = (dataPoint.network_upload || 0) / 1024
    const downloadValue = (dataPoint.network_download || 0) / 1024

    // 获取当前数据，过滤掉超出时间窗口的旧数据，然后添加新点
    const uploadData = filterDataByTimeWindow(
      (option.series[0]?.data as Array<[number, number]>) || [],
    )
    const downloadData = filterDataByTimeWindow(
      (option.series[1]?.data as Array<[number, number]>) || [],
    )

    uploadData.push([timestamp, uploadValue])
    downloadData.push([timestamp, downloadValue])

    chartInstance.setOption(
      {
        series: [{ data: uploadData }, { data: downloadData }],
      },
      { notMerge: false },
    )
  } else if (props.chartType === 'disk') {
    // 磁盘图表
    const readValue = dataPoint.disk_read || 0
    const writeValue = dataPoint.disk_write || 0

    // 获取当前数据，过滤掉超出时间窗口的旧数据，然后添加新点
    const readData = filterDataByTimeWindow(
      (option.series[0]?.data as Array<[number, number]>) || [],
    )
    const writeData = filterDataByTimeWindow(
      (option.series[1]?.data as Array<[number, number]>) || [],
    )

    readData.push([timestamp, readValue])
    writeData.push([timestamp, writeValue])

    chartInstance.setOption(
      {
        series: [{ data: readData }, { data: writeData }],
      },
      { notMerge: false },
    )
  } else {
    // CPU/内存：添加单个数据点
    let value = 0
    switch (props.chartType) {
      case 'cpu':
        value = dataPoint.cpu_usage || 0
        break
      case 'memory':
        value = dataPoint.memory_usage || 0
        break
    }

    // 获取当前数据，过滤掉超出时间窗口的旧数据，然后添加新点
    const currentData = filterDataByTimeWindow(
      (option.series[0]?.data as Array<[number, number]>) || [],
    )

    currentData.push([timestamp, value])

    chartInstance.setOption(
      {
        series: [{ data: currentData }],
      },
      { notMerge: false },
    )
  }
}

// 监听数据变化
watch(
  () => props.data,
  () => {
    updateChart()
  },
  { deep: true },
)

// 监听时间范围变化
watch(
  () => props.timeRange,
  () => {
    updateChart()
  },
)

// 监听主题变化
const { isDarkMode } = useLayout()
watch(
  () => isDarkMode.value,
  () => {
    updateChart()
  },
)

// 处理时间范围切换
const handleTimeRangeChange = (value: number) => {
  emit('update:timeRange', value)
}

onMounted(() => {
  initChartInstance()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

defineExpose({
  addDataPoint,
  updateChart,
})
</script>

<template>
  <n-card>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <ri-line-chart-line size="14px" />
        <span class="font-medium">{{ chartTitles[chartType] }}</span>
      </div>
      <div class="flex items-center gap-1">
        <n-button
          v-for="option in timeRangeOptions"
          :key="option.value"
          size="small"
          :secondary="timeRange !== option.value"
          :type="timeRange === option.value ? 'primary' : 'default'"
          @click="handleTimeRangeChange(option.value)"
        >
          {{ option.label }}
        </n-button>
      </div>
    </div>
    <div ref="chartContainer" class="mt-4" style="height: 250px"></div>
  </n-card>
</template>
