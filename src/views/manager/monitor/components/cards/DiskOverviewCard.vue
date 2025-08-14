<script setup lang="ts">
import type { SystemOverview } from '../types'
import { formatPercentage } from '@/utils/formatters'
import ProgressBar from 'primevue/progressbar'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

defineProps<Props>()

// 工具函数
const getDiskColorClass = (usage: number) => {
  if (usage >= 95) return 'text-red-600 dark:text-red-400'
  if (usage >= 85) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getDiskProgressColor = (usage: number) => {
  if (usage >= 95) return '#ef4444'
  if (usage >= 85) return '#f97316'
  if (usage >= 70) return '#eab308'
  return '#22c55e'
}
</script>

<template>
  <Card class="resource-overview-card">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-database text-orange-600"></i>
        <span>磁盘使用情况</span>
      </div>
    </template>
    <template #content>
      <div class="space-y-4">
        <!-- 平均使用率显示 -->
        <div class="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
          <div
            class="text-4xl font-bold mb-2"
            :class="getDiskColorClass(overview.avgDiskUsage)"
          >
            {{ formatPercentage(overview.avgDiskUsage) }}
          </div>
          <div class="text-sm text-muted-color">平均使用率</div>
        </div>

        <!-- 详细统计信息 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-color">磁盘使用:</span>
            <span class="font-medium text-orange-600">{{
              formatPercentage(overview.avgMemoryUsage)
            }}</span>
          </div>
        </div>

        <!-- 磁盘使用进度条 -->
        <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
          <div class="text-xs text-muted-color mb-2">使用率分布</div>
          <ProgressBar
            :value="overview.avgDiskUsage"
            :showValue="false"
            class="h-2"
            :pt="{
              value: {
                style: {
                  backgroundColor: getDiskProgressColor(overview.avgDiskUsage),
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
