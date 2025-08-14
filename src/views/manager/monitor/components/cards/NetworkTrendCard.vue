<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import ProgressSpinner from 'primevue/progressspinner'
import type { PerformanceMetrics } from '../types'
import { formatSpeed } from '@/utils/formatters'

interface Props {
  metrics: PerformanceMetrics
  loading?: boolean
}

const props = defineProps<Props>()

// 计算当前网络速度
const currentUploadSpeed = computed(() => {
  const lastData = props.metrics.network.upload[props.metrics.network.upload.length - 1]
  return lastData ? formatSpeed(lastData.value) : '0 B/s'
})

const currentDownloadSpeed = computed(() => {
  const lastData = props.metrics.network.download[props.metrics.network.download.length - 1]
  return lastData ? formatSpeed(lastData.value) : '0 B/s'
})

// Chart.js 数据格式 - 优化为总览显示，只显示最近10个点，使用面积图
const networkChartData = computed(() => {
  const recentUpload = props.metrics.network.upload.slice(-10)
  const recentDownload = props.metrics.network.download.slice(-10)

  return {
    labels: recentUpload.map((p) => p.time),
    datasets: [
      {
        label: '上传',
        data: recentUpload.map((p) => (p.value / 1048576).toFixed(1)), // 转换为 MB/s
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 1,
        pointHoverRadius: 3,
        borderWidth: 2,
      },
      {
        label: '下载',
        data: recentDownload.map((p) => (p.value / 1048576).toFixed(1)), // 转换为 MB/s
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 1,
        pointHoverRadius: 3,
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
      callbacks: {
        label: function(context: { dataset: { label: string }, parsed: { y: number } }) {
          return `${context.dataset.label}: ${context.parsed.y} MB/s`
        }
      }
    },
  },
  scales: {
    x: {
      display: false, // 隐藏X轴以节省空间
    },
    y: {
      display: false, // 隐藏Y轴以节省空间
      beginAtZero: true,
    },
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-wifi text-purple-600"></i>
          <span>网络趋势</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded bg-green-500"></div>
            <span class="text-muted-color text-xs">{{ currentUploadSpeed }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded bg-blue-500"></div>
            <span class="text-muted-color text-xs">{{ currentDownloadSpeed }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #content>
      <div class="chart-container" v-if="!loading">
        <div class="h-32">
          <Chart
            type="line"
            :data="networkChartData"
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
