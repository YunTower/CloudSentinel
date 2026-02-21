<script setup lang="ts">
import type { TrafficInfo } from '@/types/manager/servers'
import { formatSpeed, formatBytes } from '@/utils/version.ts'
import { RiArrowDownLine, RiArrowUpLine, RiWifiLine } from '@remixicon/vue'

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
    class="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center gap-2 mb-3">
      <ri-wifi-line size="14px" />
      <span class="font-medium">网络 I/O</span>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
        <div class="flex items-center justify-center gap-2 mb-1">
          <ri-arrow-up-line size="14px" />
          <span class="text-xs text-muted-color">上传</span>
        </div>
        <div class="text-xl font-bold">
          {{ formatSpeed(networkIO?.upload || 0) }}
        </div>
      </div>
      <div class="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
        <div class="flex items-center justify-center gap-2 mb-1">
          <ri-arrow-down-line size="14px" />
          <span class="text-xs text-muted-color">速度</span>
        </div>
        <div class="text-xl font-bold">
          {{ formatSpeed(networkIO?.download || 0) }}
        </div>
      </div>
    </div>
    <div v-if="traffic">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <div class="flex items-center justify-center gap-2 mb-1">
            <ri-arrow-up-line size="14px" />
            <span class="text-xs text-muted-color">总发送</span>
          </div>
          <div class="text-lg font-bold">
            {{ formatBytes(traffic.upload_bytes) }}
          </div>
        </div>
        <div class="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <div class="flex items-center justify-center gap-2 mb-1">
            <ri-arrow-down-line size="14px" />
            <span class="text-xs text-muted-color">总接收</span>
          </div>
          <div class="text-lg font-bold">
            {{ formatBytes(traffic.download_bytes) }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="pt-3 border-t border-zinc-200 dark:border-zinc-700">
      <n-empty description="暂无流量数据" class="py-2" />
    </div>
  </div>
</template>
