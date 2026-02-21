<script setup lang="ts">
import type { MemoryInfo } from '@/types/manager/servers'
import { getProgressTextColor, getProgressBarColor, formatBytes } from '@/utils/version.ts'
import { RiRamLine } from '@remixicon/vue'

interface Props {
  memory: number
  memoryInfo?: MemoryInfo
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <ri-ram-line size="14px" />
        <span class="font-medium">内存使用率</span>
      </div>
      <span class="text-2xl font-bold" :class="getProgressTextColor(memory)">
        {{ memory.toFixed(2) }}%
      </span>
    </div>
    <n-progress
      type="line"
      :percentage="memory"
      :show-indicator="false"
      :color="getProgressBarColor(memory)"
      :height="12"
      :border-radius="9999"
    />
    <div v-if="memoryInfo" class="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-sm">
      <div class="flex items-center justify-between text-muted-color">
        <span>已使用:</span>
        <span class="font-medium text-color">{{ formatBytes(memoryInfo.memory_used) }}</span>
      </div>
      <div class="flex items-center justify-between text-muted-color mt-1">
        <span>总容量:</span>
        <span class="font-medium text-color">{{ formatBytes(memoryInfo.memory_total) }}</span>
      </div>
    </div>
  </div>
</template>
