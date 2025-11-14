<script setup lang="ts">
import { computed } from 'vue'
import type { SwapInfo } from '@/types/manager/servers'
import { getProgressTextColor, getProgressBarColor, formatBytes } from '../utils'

interface Props {
  swapInfo?: SwapInfo
}

const props = defineProps<Props>()

const swapUsage = computed(() => {
  if (!props.swapInfo || props.swapInfo.swap_total === 0) {
    return 0
  }
  return props.swapInfo.swap_usage_percent
})
</script>

<template>
  <div
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-database text-primary"></i>
        <span class="font-medium">Swap使用率</span>
      </div>
      <span
        v-if="swapInfo && swapInfo.swap_total > 0"
        class="text-2xl font-bold"
        :class="getProgressTextColor(swapUsage)"
      >
        {{ swapUsage.toFixed(2) }}%
      </span>
      <span v-else class="text-lg text-muted-color">未配置</span>
    </div>
    <ProgressBar
      v-if="swapInfo && swapInfo.swap_total > 0"
      :value="swapUsage"
      :showValue="false"
      class="h-3 rounded-full"
      :pt="{
        value: {
          style: {
            backgroundColor: getProgressBarColor(swapUsage),
          },
        },
      }"
    />
    <div
      v-if="swapInfo && swapInfo.swap_total > 0"
      class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 text-sm"
    >
      <div class="flex items-center justify-between text-muted-color">
        <span>已使用:</span>
        <span class="font-medium text-color">{{ formatBytes(swapInfo.swap_used) }}</span>
      </div>
      <div class="flex items-center justify-between text-muted-color mt-1">
        <span>总容量:</span>
        <span class="font-medium text-color">{{ formatBytes(swapInfo.swap_total) }}</span>
      </div>
      <div class="flex items-center justify-between text-muted-color mt-1">
        <span>可用:</span>
        <span class="font-medium text-color">{{ formatBytes(swapInfo.swap_free) }}</span>
      </div>
    </div>
    <div v-else class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 text-sm text-muted-color">
      <p>系统未配置Swap分区</p>
    </div>
  </div>
</template>

