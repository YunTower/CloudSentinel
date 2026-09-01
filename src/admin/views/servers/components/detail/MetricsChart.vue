<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { MetricsData } from '@/shared/types/manager/servers'
import VChart, { type ILineChartSpec } from '@/shared/utils/vcharts.ts'
import {
  formatChartAxisTime,
  parseMetricsTimestamp,
  toChartTimeMs,
} from '@/shared/utils/metricsTimestamp.ts'
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

type SpeedUnit = 'B/s' | 'KB/s' | 'MB/s' | 'GB/s'

const diskUnit = ref<SpeedUnit>('KB/s')
const networkUnit = ref<SpeedUnit>('KB/s')

const speedUnitOptions: Array<{ label: string; value: SpeedUnit }> = [
  { label: 'B/s', value: 'B/s' },
  { label: 'KB/s', value: 'KB/s' },
  { label: 'MB/s', value: 'MB/s' },
  { label: 'GB/s', value: 'GB/s' },
]

const speedUnitDivisor: Record<SpeedUnit, number> = {
  'B/s': 1,
  'KB/s': 1024,
  'MB/s': 1024 * 1024,
  'GB/s': 1024 * 1024 * 1024,
}

const getSpeedInUnit = (bytesPerSec: number, unit: SpeedUnit): number => {
  const safe = Number.isFinite(bytesPerSec) ? bytesPerSec : 0
  return safe / speedUnitDivisor[unit]
}

const timeRangeOptions = [
  { label: '1小时', value: 1 },
  { label: '6小时', value: 6 },
  { label: '12小时', value: 12 },
  { label: '24小时', value: 24 },
]

const toPointTime = (raw: string | number | undefined): number =>
  toChartTimeMs(parseMetricsTimestamp(raw))

const buildChartPointsFromProps = (): ChartPoint[] => {
  const source = props.data || []
  const points: ChartPoint[] = []

  if (props.chartType === 'network') {
    source.forEach((item) => {
      const timestamp = toPointTime(item.timestamp)
      points.push({
        time: timestamp,
        value: getSpeedInUnit(item.network_upload || 0, networkUnit.value),
        series: `上传 (${networkUnit.value})`,
      })
      points.push({
        time: timestamp,
        value: getSpeedInUnit(item.network_download || 0, networkUnit.value),
        series: `下载 (${networkUnit.value})`,
      })
    })
  } else if (props.chartType === 'disk') {
    source.forEach((item) => {
      const timestamp = toPointTime(item.timestamp)
      points.push({
        time: timestamp,
        value: getSpeedInUnit(item.disk_read || 0, diskUnit.value),
        series: `读取速度 (${diskUnit.value})`,
      })
      points.push({
        time: timestamp,
        value: getSpeedInUnit(item.disk_write || 0, diskUnit.value),
        series: `写入速度 (${diskUnit.value})`,
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
      const timestamp = toPointTime(item.timestamp)
      points.push({
        time: timestamp,
        value: item[valueKey] || 0,
        series: '使用率 (%)',
      })
    })
  }

  return points
}

const createChartSpecFromPoints = (): ILineChartSpec => {
  const valueUnit =
    props.chartType === 'cpu' || props.chartType === 'memory'
      ? '%'
      : props.chartType === 'disk'
        ? diskUnit.value
        : props.chartType === 'network'
          ? networkUnit.value
          : ''

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
    crosshair: {
      trigger: 'hover',
      followTooltip: true,
      xField: {
        visible: true,
        line: {
          visible: true,
          type: 'line',
          style: {
            stroke: '#94a3b8',
            strokeOpacity: 0.95,
            lineWidth: 1,
            lineDash: [],
          },
        },
        label: {
          visible: false,
        },
      },
      yField: {
        visible: false,
      },
    },
    tooltip: {
      trigger: 'hover',
      activeType: 'dimension',
      dimension: {
        updateTitle: (prev) => {
          if (!prev) return prev
          const raw =
            typeof prev.value === 'string'
              ? prev.value
              : typeof prev.key === 'string'
                ? prev.key
                : undefined

          if (raw === undefined) return prev
          const numeric = Number(raw)
          if (!Number.isFinite(numeric)) return prev

          // tooltip 中的 time 可能是 ms 或秒
          const ms = numeric < 1e12 ? numeric * 1000 : numeric
          const formatted = formatChartAxisTime(ms)
          return formatted ? { ...prev, value: formatted } : prev
        },
      },
    },
    axes: [
      {
        orient: 'bottom',
        type: 'time',
        label: {
          formatMethod: (text: string | string[]) => {
            const rawText = Array.isArray(text) ? text[0] : text

            const numeric = Number(rawText)
            if (Number.isFinite(numeric)) {
              // VChart time 轴可能传入 ms 或已格式化文本
              const ms = numeric < 1e12 ? numeric * 1000 : numeric
              return formatChartAxisTime(ms) || String(rawText)
            }

            const parsedMs = toChartTimeMs(parseMetricsTimestamp(rawText))
            return formatChartAxisTime(parsedMs) || String(rawText)
          },
        },
      },
      {
        orient: 'left',
        label: {
          formatMethod: (text: string | string[]) => {
            const rawText = Array.isArray(text) ? text[0] : text
            return valueUnit ? `${rawText} ${valueUnit}` : String(rawText)
          },
        },
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

watch(
  () => diskUnit.value,
  () => {
    if (props.chartType === 'disk') updateChart()
  },
)

watch(
  () => networkUnit.value,
  () => {
    if (props.chartType === 'network') updateChart()
  },
)

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
  updateChart,
})
</script>

<template>
  <n-card size="small" :bordered="false">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <ri-line-chart-line size="14px" />
        <span class="font-medium">{{ chartTitles[chartType] }}</span>
      </div>
      <div class="flex items-center gap-1">
        <n-select
          v-if="chartType === 'disk'"
          v-model:value="diskUnit"
          :options="speedUnitOptions"
          size="small"
          class="w-[70px]!"
        />
        <n-select
          v-else-if="chartType === 'network'"
          v-model:value="networkUnit"
          :options="speedUnitOptions"
          size="small"
          class="w-[70px]!"
        />
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
