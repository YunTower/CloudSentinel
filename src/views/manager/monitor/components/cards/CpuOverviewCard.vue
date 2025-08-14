<script setup lang="ts">
import { computed } from 'vue'
import type { SystemOverview } from '../types'
import { formatPercentage } from '@/utils/formatters'
import ProgressBar from 'primevue/progressbar'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

const props = defineProps<Props>()

// 计算平均负载
const averageLoad = computed(() => {
  return Math.round((props.overview.avgCpuUsage + props.overview.avgMemoryUsage) / 2)
})

// 工具函数
const getCpuColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 70) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getCpuProgressColor = (usage: number) => {
  if (usage >= 90) return '#ef4444'
  if (usage >= 70) return '#f97316'
  if (usage >= 50) return '#eab308'
  return '#22c55e'
}
</script>

<template>
  <Card class="resource-overview-card">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-microchip text-blue-600"></i>
        <span>CPU 使用情况</span>
      </div>
    </template>
    <template #content>
      <div class="space-y-4">
        <!-- 平均使用率显示 -->
        <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div class="text-4xl font-bold mb-2" :class="getCpuColorClass(overview.avgCpuUsage)">
            {{ formatPercentage(overview.avgCpuUsage) }}
          </div>
          <div class="text-sm text-muted-color">平均使用率</div>
        </div>

        <!-- 详细统计信息 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-color">平均负载:</span>
            <span class="font-medium text-blue-600">{{ averageLoad }}%</span>
          </div>
        </div>

        <!-- 使用率进度条 -->
        <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
          <div class="text-xs text-muted-color mb-2">使用率分布</div>
          <ProgressBar
            :value="overview.avgCpuUsage"
            :showValue="false"
            class="h-2"
            :pt="{
              value: {
                style: {
                  backgroundColor: getCpuProgressColor(overview.avgCpuUsage),
                },
              },
            }"
          />
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-muted-color">0%</span>
            <span class="text-xs text-muted-color">100%</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
