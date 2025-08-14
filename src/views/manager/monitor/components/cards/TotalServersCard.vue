<script setup lang="ts">
import type { SystemOverview } from '../types'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <Card
    class="stat-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800"
  >
    <template #content>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {{ overview.totalServers }}
          </div>
          <div class="text-sm font-medium text-blue-700 dark:text-blue-300">总服务器</div>
        </div>
        <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <i class="pi pi-server text-blue-600 dark:text-blue-400 text-xl"></i>
        </div>
      </div>
      <!-- 状态分布指示器 -->
      <div
        class="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200 dark:border-blue-700"
      >
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-green-500"></div>
          <span class="text-xs text-blue-600 dark:text-blue-400">{{
            overview.onlineServers
          }}</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-gray-500"></div>
          <span class="text-xs text-blue-600 dark:text-blue-400">{{
            overview.offlineServers
          }}</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-red-500"></div>
          <span class="text-xs text-blue-600 dark:text-blue-400">{{
            overview.errorServers
          }}</span>
        </div>
      </div>
    </template>
  </Card>
</template>
