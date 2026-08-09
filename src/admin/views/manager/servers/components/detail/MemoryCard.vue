<script setup lang="ts">
import type { MemoryInfo } from '@/shared/types/manager/servers'
import { getProgressTextColor, getProgressBarColor, formatBytes } from '@/shared/utils/version.ts'
import { RiRamLine } from '@remixicon/vue'

interface Props {
  memory: number
  memoryInfo?: MemoryInfo
}

defineProps<Props>()
</script>

<template>
  <n-card size="small" :bordered="false">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <ri-ram-line size="14px" />
        <span class="font-medium">内存使用率</span>
      </div>
      <span class="text-xl font-bold" :class="getProgressTextColor(memory)">
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
  </n-card>
</template>
