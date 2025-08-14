<script setup lang="ts">
import { computed } from 'vue'
import type { SystemOverview } from '../types'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

const props = defineProps<Props>()

// 计算离线和异常服务器总数
const offlineAndErrorCount = computed(() => {
  return props.overview.offlineServers + props.overview.errorServers
})
</script>

<template>
  <Card
    class="stat-card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800"
  >
    <template #content>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {{ offlineAndErrorCount }}
          </div>
          <div class="text-sm font-medium text-red-700 dark:text-red-300">离线/异常</div>
        </div>
        <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
          <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
        <div class="text-xs text-red-600 dark:text-red-400">
          离线: {{ overview.offlineServers }} | 异常: {{ overview.errorServers }}
        </div>
      </div>
    </template>
  </Card>
</template>
