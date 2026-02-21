<script setup lang="ts">
import { getProgressTextColor, getProgressBarColor } from '@/utils/version.ts'
import { RiCpuLine } from '@remixicon/vue'

interface Props {
  cpu: number
}

defineProps<Props>()
</script>

<template>
  <n-card>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <ri-cpu-line size="14px" />
        <span class="font-medium">CPU 使用率</span>
      </div>
      <span class="text-2xl font-bold" :class="getProgressTextColor(cpu)">
        {{ cpu.toFixed(2) }}%
      </span>
    </div>
    <n-progress
      type="line"
      :percentage="cpu"
      :show-indicator="false"
      :color="getProgressBarColor(cpu)"
      :height="12"
      :border-radius="9999"
    />
  </n-card>
</template>
