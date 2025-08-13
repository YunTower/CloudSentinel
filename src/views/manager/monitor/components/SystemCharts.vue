<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import type { PerformanceMetrics } from './types'

interface Props {
  metrics: PerformanceMetrics
  loading?: boolean
}

const props = defineProps<Props>()

// 计算当前值
const currentCpuUsage = computed(() => {
  const lastData = props.metrics.cpu[props.metrics.cpu.length - 1]
  return lastData ? Math.round(lastData.value) : 0
})

const currentMemoryUsage = computed(() => {
  const lastData = props.metrics.memory[props.metrics.memory.length - 1]
  return lastData ? Math.round(lastData.value) : 0
})

const currentDiskUsage = computed(() => {
  const lastData = props.metrics.disk[props.metrics.disk.length - 1]
  return lastData ? Math.round(lastData.value) : 0
})

// Chart.js 数据格式
const cpuChartData = computed(() => ({
  labels: props.metrics.cpu.map(p => p.time),
  datasets: [{
    label: 'CPU 使用率',
    data: props.metrics.cpu.map(p => p.value),
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 5
  }]
}))

const memoryChartData = computed(() => ({
  labels: props.metrics.memory.map(p => p.time),
  datasets: [{
    label: '内存使用率',
    data: props.metrics.memory.map(p => p.value),
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 5
  }]
}))

const diskChartData = computed(() => ({
  labels: props.metrics.disk.map(p => p.time),
  datasets: [{
    label: '磁盘使用率',
    data: props.metrics.disk.map(p => p.value),
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 5
  }]
}))

const networkChartData = computed(() => ({
  labels: props.metrics.network.upload.map(p => p.time),
  datasets: [
    {
      label: '上传速度',
      data: props.metrics.network.upload.map(p => (p.value / 1048576).toFixed(2)), // 转换为 MB/s
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: false,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 4
    },
    {
      label: '下载速度',
      data: props.metrics.network.download.map(p => (p.value / 1048576).toFixed(2)), // 转换为 MB/s
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: false,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 4
    }
  ]
}))

// Chart.js 配置选项
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        maxTicksLimit: 6,
        color: '#6b7280'
      }
    },
    y: {
      display: true,
      beginAtZero: true,
      max: 100,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        color: '#6b7280',
        callback: function(value: number) {
          return value + '%'
        }
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
}

const networkChartOptions = {
  ...commonChartOptions,
  scales: {
    ...commonChartOptions.scales,
    y: {
      ...commonChartOptions.scales.y,
      max: undefined, // 自动计算最大值
      ticks: {
        color: '#6b7280',
        callback: function(value: number) {
          return value + ' MB/s'
        }
      }
    }
  }
}

// 颜色类函数
const getCpuColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 70) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getMemoryColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 80) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getDiskColorClass = (usage: number) => {
  if (usage >= 95) return 'text-red-600 dark:text-red-400'
  if (usage >= 85) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}
</script>
<template>
  <div class="system-charts">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- CPU 使用率趋势图 -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-microchip text-blue-600"></i>
              <span>CPU 使用率趋势</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-sm text-muted-color">当前:</div>
              <div class="text-lg font-bold" :class="getCpuColorClass(currentCpuUsage)">
                {{ currentCpuUsage }}%
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-container" v-if="!loading">
            <div class="h-48">
              <Chart
                type="line"
                :data="cpuChartData"
                :options="commonChartOptions"
                class="w-full h-full"
              />
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-48">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          </div>
        </template>
      </Card>

      <!-- 内存使用率趋势图 -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-database text-green-600"></i>
              <span>内存使用率趋势</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-sm text-muted-color">当前:</div>
              <div class="text-lg font-bold" :class="getMemoryColorClass(currentMemoryUsage)">
                {{ currentMemoryUsage }}%
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-container" v-if="!loading">
            <div class="h-48">
              <Chart
                type="line"
                :data="memoryChartData"
                :options="commonChartOptions"
                class="w-full h-full"
              />
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-48">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          </div>
        </template>
      </Card>

      <!-- 磁盘使用率趋势图 -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-hdd text-orange-600"></i>
              <span>磁盘使用率趋势</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-sm text-muted-color">当前:</div>
              <div class="text-lg font-bold" :class="getDiskColorClass(currentDiskUsage)">
                {{ currentDiskUsage }}%
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-container" v-if="!loading">
            <div class="h-48">
              <Chart
                type="line"
                :data="diskChartData"
                :options="commonChartOptions"
                class="w-full h-full"
              />
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-48">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          </div>
        </template>
      </Card>

      <!-- 网络流量趋势图 -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-wifi text-purple-600"></i>
              <span>网络流量趋势</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 rounded bg-green-500"></div>
                <span class="text-muted-color">上传</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 rounded bg-blue-500"></div>
                <span class="text-muted-color">下载</span>
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-container" v-if="!loading">
            <div class="h-48">
              <Chart
                type="line"
                :data="networkChartData"
                :options="networkChartOptions"
                class="w-full h-full"
              />
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-48">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
<style scoped>
.system-charts > * + * {
  margin-top: 1.5rem;
}

.chart-container {
  position: relative;
}

.chart-container canvas {
  border-radius: 0.5rem;
}
</style>
