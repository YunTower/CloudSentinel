<script setup lang="ts">
import { computed } from 'vue'
import type { SystemOverview } from '@/types/manager/monitor'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

const props = defineProps<Props>()

// 计算在线率
const onlineRate = computed(() => {
  if (props.overview.totalServers === 0) return 0
  return Math.round((props.overview.onlineServers / props.overview.totalServers) * 100)
})
</script>

<template>
  <Card
    class="stat-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800"
  >
    <template #content>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {{ overview.onlineServers }}
          </div>
          <div class="text-sm font-medium text-green-700 dark:text-green-300">在线服务器</div>
        </div>
        <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-xl"></i>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
        <div class="text-sm text-green-600 dark:text-green-400">在线率: {{ onlineRate }}%</div>
      </div>
    </template>
  </Card>
</template>
