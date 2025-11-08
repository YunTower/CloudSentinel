<script setup lang="ts">
import type { DiskInfo } from '@/types/manager/servers'
import { getDiskTextColorClass, getProgressBarColor, formatBytes } from '../utils'

interface Props {
  disks?: DiskInfo[]
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-database text-primary"></i>
        <span class="font-medium">磁盘使用情况</span>
      </div>
    </div>
    <div v-if="disks && disks.length > 0" class="space-y-3">
      <div v-for="(disk, index) in disks" :key="index" class="space-y-1">
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <span class="font-medium text-color">{{ disk.mount_point || disk.disk_name }}</span>
            <span class="text-xs text-muted-color">({{ disk.disk_name }})</span>
          </div>
          <span :class="getDiskTextColorClass(disk.usage_percent)" class="font-medium">
            {{ disk.usage_percent.toFixed(2) }}%
          </span>
        </div>
        <ProgressBar
          :value="disk.usage_percent"
          :showValue="false"
          class="h-2 rounded-full"
          :pt="{
            value: {
              style: {
                backgroundColor: getProgressBarColor(disk.usage_percent),
              },
            },
          }"
        />
        <div class="flex items-center justify-between text-xs text-muted-color">
          <span>{{ formatBytes(disk.used_size) }} / {{ formatBytes(disk.total_size) }}</span>
          <span>剩余: {{ formatBytes(disk.free_size) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="text-sm text-muted-color text-center py-2">暂无磁盘信息</div>
  </div>
</template>
