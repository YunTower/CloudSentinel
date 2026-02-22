<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { MetricsData } from '@/types/manager/servers'
import VChart, { type ILineChartSpec } from '@/utils/vcharts'
import { RiLineChartLine } from '@remixicon/vue'

interface Props {
  serverId: string
  chartType: 'cpu' | 'memory' | 'disk' | 'network'
  data: MetricsData[]
  timeRange: number
}

interface ChartPoint {
  time: number
  value: number
  series: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:timeRange': [value: number]
}>()

const chartContainer = ref<HTMLDivElement | null>(null)
let chartInstance: VChart | null = null
let chartPoints: ChartPoint[] = []

const chartTitles = {
  cpu: 'CPU负载',
  memory: '内存负载',
  disk: '磁盘IO',
  network: '网络IO',
}

const timeRangeOptions = [
  { label: '1小时', value: 1 },
  { label: '6小时', value: 6 },
  { label: '12小时', value: 12 },
  { label: '24小时', value: 24 },
]

const buildChartPointsFromProps = (): ChartPoint[] => {
  const source = props.data || []
  const points: ChartPoint[] = []

  if (props.chartType === 'network') {
    source.forEach((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      points.push({
        time: timestamp,
        value: (item.network_upload || 0) / 1024,
        series: '上传',
      })
      points.push({
        time: timestamp,
        value: (item.network_download || 0) / 1024,
        series: '下载',
      })
    })
  } else if (props.chartType === 'disk') {
    source.forEach((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      points.push({
        time: timestamp,
        value: item.disk_read || 0,
        series: '读取速度',
      })
      points.push({
        time: timestamp,
        value: item.disk_write || 0,
        series: '写入速度',
      })
    })
  } else {
    let valueKey: 'cpu_usage' | 'memory_usage' = 'cpu_usage'

    switch (props.chartType) {
      case 'cpu':
        valueKey = 'cpu_usage'
        break
      case 'memory':
        valueKey = 'memory_usage'
        break
    }

    source.forEach((item) => {
      const timestamp = typeof item.timestamp === 'number' ? item.timestamp * 1000 : Date.now()
      points.push({
        time: timestamp,
        value: item[valueKey] || 0,
        series: '使用率',
      })
    })
  }

  return points
}

const createChartSpecFromPoints = (): ILineChartSpec => {
  const colors =
    props.chartType === 'network' || props.chartType === 'disk'
      ? ['#3b82f6', '#10b981']
      : ['#3b82f6']

  const spec: ILineChartSpec = {
    type: 'line',
    data: [
      {
        id: 'metrics',
        values: chartPoints.map((point) => ({
          time: point.time,
          value: point.value,
          series: point.series,
        })),
      },
    ],
    xField: 'time',
    yField: 'value',
    seriesField: 'series',
    color: colors,
    axes: [
      {
        orient: 'bottom',
        type: 'time',
        label: {
          formatMethod: (text: string | string[], datum?: unknown) => {
            const rawText = Array.isArray(text) ? text[0] : text
            const valueFromDatum =
              datum && typeof (datum as { value?: number }).value === 'number'
                ? (datum as { value?: number }).value
                : undefined

            let timestamp = valueFromDatum

            if (timestamp === undefined) {
              const numeric = Number(rawText)
              if (Number.isFinite(numeric)) {
                timestamp = numeric
              }
            }

            if (timestamp !== undefined) {
              const date = new Date(timestamp)
              if (!Number.isNaN(date.getTime())) {
                const hours = `${date.getHours()}`.padStart(2, '0')
                const minutes = `${date.getMinutes()}`.padStart(2, '0')
                const seconds = `${date.getSeconds()}`.padStart(2, '0')
                return `${hours}:${minutes}:${seconds}`
              }
            }

            const parsed = new Date(rawText)
            if (!Number.isNaN(parsed.getTime())) {
              const hours = `${parsed.getHours()}`.padStart(2, '0')
              const minutes = `${parsed.getMinutes()}`.padStart(2, '0')
              const seconds = `${parsed.getSeconds()}`.padStart(2, '0')
              return `${hours}:${minutes}:${seconds}`
            }

            return rawText
          },
        },
      },
      {
        orient: 'left',
      },
    ],
    legends: {
      visible: true,
      position: 'middle',
    },
    line: {
      style: {
        curveType: 'monotone',
      },
    },
    point: {
      visible: false,
    },
  }

  return spec
}

const renderChart = () => {
  if (!chartInstance || !chartContainer.value) return
  const spec = createChartSpecFromPoints()
  chartInstance.updateSpec(spec)
  chartInstance.renderSync()
}

const initChartInstance = async () => {
  if (!chartContainer.value) return

  await nextTick()

  chartPoints = buildChartPointsFromProps()

  if (!chartInstance) {
    const spec = createChartSpecFromPoints()
    chartInstance = new VChart(spec, {
      dom: chartContainer.value,
    })
    chartInstance.renderSync()
  } else {
    renderChart()
  }
}

const updateChart = () => {
  if (!chartInstance) return
  chartPoints = buildChartPointsFromProps()
  renderChart()
}

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

  const timestamp = dataPoint.timestamp * 1000
  const now = Date.now()
  const timeWindowMs = props.timeRange * 60 * 60 * 1000
  const timeWindowStart = now - timeWindowMs

  const filteredPoints = chartPoints.filter((point) => point.time >= timeWindowStart)

  if (props.chartType === 'network') {
    const uploadValue = (dataPoint.network_upload || 0) / 1024
    const downloadValue = (dataPoint.network_download || 0) / 1024

    filteredPoints.push({
      time: timestamp,
      value: uploadValue,
      series: '上传',
    })
    filteredPoints.push({
      time: timestamp,
      value: downloadValue,
      series: '下载',
    })
  } else if (props.chartType === 'disk') {
    const readValue = dataPoint.disk_read || 0
    const writeValue = dataPoint.disk_write || 0

    filteredPoints.push({
      time: timestamp,
      value: readValue,
      series: '读取速度',
    })
    filteredPoints.push({
      time: timestamp,
      value: writeValue,
      series: '写入速度',
    })
  } else {
    let value = 0
    switch (props.chartType) {
      case 'cpu':
        value = dataPoint.cpu_usage || 0
        break
      case 'memory':
        value = dataPoint.memory_usage || 0
        break
    }

    filteredPoints.push({
      time: timestamp,
      value,
      series: '使用率',
    })
  }

  chartPoints = filteredPoints
  renderChart()
}

watch(
  () => props.data,
  () => {
    updateChart()
  },
  { deep: true },
)

watch(
  () => props.timeRange,
  () => {
    updateChart()
  },
)

const handleTimeRangeChange = (value: number) => {
  emit('update:timeRange', value)
}

onMounted(() => {
  initChartInstance()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.release()
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
