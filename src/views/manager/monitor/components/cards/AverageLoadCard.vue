<script setup lang="ts">
import { computed } from 'vue'
import type { SystemOverview } from '../types'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

const props = defineProps<Props>()

// 计算平均负载
const averageLoad = computed(() => {
  return Math.round((props.overview.avgCpuUsage + props.overview.avgMemoryUsage) / 2)
})
</script>

<template>
  <Card
    class="stat-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800"
  >
    <template #content>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {{ averageLoad }}%
          </div>
          <div class="text-sm font-medium text-purple-700 dark:text-purple-300">平均负载</div>
        </div>
        <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
          <i class="pi pi-chart-line text-purple-600 dark:text-purple-400 text-xl"></i>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
        <div class="text-xs text-purple-600 dark:text-purple-400">
          CPU: {{ overview.avgCpuUsage }}% | 内存: {{ overview.avgMemoryUsage }}%
        </div>
      </div>
    </template>
  </Card>
</template>
