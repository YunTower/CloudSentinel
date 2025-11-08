<script setup lang="ts">
import type { MemoryInfo } from '@/types/manager/servers'
import { getMemoryTextColorClass, getProgressBarColor, formatBytes } from '../utils'

interface Props {
  memory: number
  memoryInfo?: MemoryInfo
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-history text-primary"></i>
        <span class="font-medium">内存使用率</span>
      </div>
      <span class="text-2xl font-bold" :class="getMemoryTextColorClass(memory)">
        {{ memory.toFixed(2) }}%
      </span>
    </div>
    <ProgressBar
      :value="memory"
      :showValue="false"
      class="h-3 rounded-full"
      :pt="{
        value: {
          style: {
            backgroundColor: getProgressBarColor(memory),
          },
        },
      }"
    />
    <div
      v-if="memoryInfo"
      class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 text-sm"
    >
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
