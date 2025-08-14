<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import ProgressSpinner from 'primevue/progressspinner'
import type { PerformanceMetrics } from '../types'
import { formatPercentage } from '@/utils/formatters'

interface Props {
  metrics: PerformanceMetrics
  loading?: boolean
}

const props = defineProps<Props>()

// 计算当前值
const currentMemoryUsage = computed(() => {
  const lastData = props.metrics.memory[props.metrics.memory.length - 1]
  return lastData ? formatPercentage(lastData.value) : '0.0%'
})

// Chart.js 数据格式 - 优化为总览显示，只显示最近15个点
const memoryChartData = computed(() => {
  const recentData = props.metrics.memory.slice(-15)
  return {
    labels: recentData.map((p) => p.time),
    datasets: [
      {
        label: '内存使用率',
        data: recentData.map((p) => p.value),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }
})

// Chart.js 配置选项 - 简化版本适合小卡片
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      display: false, // 隐藏X轴以节省空间
    },
    y: {
      display: false, // 隐藏Y轴以节省空间
      beginAtZero: true,
      max: 100,
    },
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
}

// 颜色类函数
const getMemoryColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 80) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-history text-green-600"></i>
          <span>内存趋势</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-sm text-muted-color">当前:</div>
          <div
            class="text-lg font-bold"
            :class="
              getMemoryColorClass(
                props.metrics.memory[props.metrics.memory.length - 1]?.value || 0,
              )
            "
          >
            {{ currentMemoryUsage }}
          </div>
        </div>
      </div>
    </template>
    <template #content>
      <div class="chart-container" v-if="!loading">
        <div class="h-32">
          <Chart
            type="line"
            :data="memoryChartData"
            :options="chartOptions"
            class="w-full h-full"
          />
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-32">
        <ProgressSpinner style="width: 30px; height: 30px" strokeWidth="4" />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.chart-container {
  position: relative;
}

.chart-container canvas {
  border-radius: 0.5rem;
}
</style>
