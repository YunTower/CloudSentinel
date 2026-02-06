<script setup lang="ts">
import { getProgressTextColor, getProgressBarColor } from '@/utils/version.ts'

interface GPUInfo {
  index: number
  name: string
  temperature: number
  memory_used: number
  memory_total: number
  memory_util: number
  gpu_util: number
}

interface Props {
  gpuInfo?: {
    available: boolean
    gpus: GPUInfo[]
  }
}

const props = defineProps<Props>()

// 格式化显存大小（MB转换为GB）
const formatMemory = (mb: number): string => {
  return (mb / 1024).toFixed(2) + ' GB'
}
</script>

<template>
  <div
    v-if="gpuInfo && gpuInfo.available && gpuInfo.gpus.length > 0"
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center gap-2 mb-4">
      <i class="pi pi-desktop text-primary"></i>
      <span class="font-medium">GPU 信息</span>
      <span class="text-sm text-surface-500">({{ gpuInfo.gpus.length }} 个设备)</span>
    </div>

    <div v-for="gpu in gpuInfo.gpus" :key="gpu.index" class="mb-4 last:mb-0">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">GPU {{ gpu.index }}</span>
          <span class="text-xs text-surface-500">{{ gpu.name }}</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1">
            <i class="pi pi-sun text-xs"></i>
            <span class="text-sm">{{ gpu.temperature }}°C</span>
          </div>
        </div>
      </div>

      <!-- GPU 利用率 -->
      <div class="mb-2">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-surface-600 dark:text-surface-400">GPU 利用率</span>
          <span class="text-sm font-semibold" :class="getProgressTextColor(gpu.gpu_util)">
            {{ gpu.gpu_util.toFixed(1) }}%
          </span>
        </div>
        <ProgressBar
          :value="gpu.gpu_util"
          :showValue="false"
          class="h-2 rounded-full"
          :pt="{
            value: {
              style: {
                backgroundColor: getProgressBarColor(gpu.gpu_util),
              },
            },
          }"
        />
      </div>

      <!-- 显存使用 -->
      <div class="mb-2">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-surface-600 dark:text-surface-400">显存使用</span>
          <span class="text-sm font-semibold" :class="getProgressTextColor(gpu.memory_util)">
            {{ formatMemory(gpu.memory_used) }} / {{ formatMemory(gpu.memory_total) }}
            ({{ gpu.memory_util.toFixed(1) }}%)
          </span>
        </div>
        <ProgressBar
          :value="gpu.memory_util"
          :showValue="false"
          class="h-2 rounded-full"
          :pt="{
            value: {
              style: {
                backgroundColor: getProgressBarColor(gpu.memory_util),
              },
            },
          }"
        />
      </div>

      <!-- 分隔线 -->
      <div
        v-if="gpu.index < gpuInfo.gpus.length - 1"
        class="border-t border-surface-200 dark:border-surface-700 mt-3"
      ></div>
    </div>
  </div>

  <!-- GPU不可用提示 -->
  <div
    v-else-if="gpuInfo && !gpuInfo.available"
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm opacity-60"
  >
    <div class="flex items-center gap-2 text-surface-500">
      <i class="pi pi-desktop"></i>
      <span class="text-sm">未检测到 GPU 设备</span>
    </div>
  </div>
</template>
