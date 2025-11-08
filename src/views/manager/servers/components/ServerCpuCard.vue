<script setup lang="ts">
import { getCpuTextColorClass, getProgressBarColor } from '../utils'

interface Props {
  cpu: number
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-microchip text-primary"></i>
        <span class="font-medium">CPU 使用率</span>
      </div>
      <span class="text-2xl font-bold" :class="getCpuTextColorClass(cpu)">
        {{ cpu.toFixed(2) }}%
      </span>
    </div>
    <ProgressBar
      :value="cpu"
      :showValue="false"
      class="h-3 rounded-full"
      :pt="{
        value: {
          style: {
            backgroundColor: getProgressBarColor(cpu),
          },
        },
      }"
    />
  </div>
</template>


