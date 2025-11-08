<script setup lang="ts">
import type { TrafficInfo } from '@/types/manager/servers'
import { formatSpeed, formatBytes } from '../utils'

interface Props {
  networkIO?: {
    upload: number
    download: number
  }
  traffic?: TrafficInfo
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center gap-2 mb-3">
      <i class="pi pi-wifi text-primary"></i>
      <span class="font-medium">网络 I/O</span>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div
        class="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
      >
        <div class="flex items-center justify-center gap-2 mb-1">
          <i class="pi pi-arrow-up text-emerald-600 dark:text-emerald-400 text-sm"></i>
          <span class="text-xs text-muted-color">上传</span>
        </div>
        <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ formatSpeed(networkIO?.upload || 0) }}
        </div>
      </div>
      <div
        class="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-center justify-center gap-2 mb-1">
          <i class="pi pi-arrow-down text-blue-600 dark:text-blue-400 text-sm"></i>
          <span class="text-xs text-muted-color">速度</span>
        </div>
        <div class="text-xl font-bold text-blue-600 dark:text-blue-400">
          {{ formatSpeed(networkIO?.download || 0) }}
        </div>
      </div>
    </div>
    <div v-if="traffic" class="pt-3 border-t border-surface-200 dark:border-surface-700">
      <div class="grid grid-cols-2 gap-4">
        <div
          class="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
        >
          <div class="flex items-center justify-center gap-2 mb-1">
            <i class="pi pi-arrow-up text-emerald-600 dark:text-emerald-400 text-sm"></i>
            <span class="text-xs text-muted-color">总发送</span>
          </div>
          <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {{ formatBytes(traffic.upload_bytes) }}
          </div>
        </div>
        <div
          class="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
        >
          <div class="flex items-center justify-center gap-2 mb-1">
            <i class="pi pi-arrow-down text-blue-600 dark:text-blue-400 text-sm"></i>
            <span class="text-xs text-muted-color">总接收</span>
          </div>
          <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
            {{ formatBytes(traffic.download_bytes) }}
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="text-xs text-muted-color text-center pt-3 border-t border-surface-200 dark:border-surface-700"
    >
      暂无流量数据
    </div>
  </div>
</template>
