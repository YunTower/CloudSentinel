<script setup lang="ts">
import type { DiskInfo } from '@/types/manager/servers'
import { getProgressTextColor, getProgressBarColor, formatBytes } from '@/utils/version.ts'
import { RiHardDriveLine } from '@remixicon/vue'

interface Props {
  disks?: DiskInfo[]
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <ri-hard-drive-line size="14px" />
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
          <span :class="getProgressTextColor(disk.usage_percent)" class="font-medium">
            {{ disk.usage_percent.toFixed(2) }}%
          </span>
        </div>
        <n-progress
          type="line"
          :percentage="disk.usage_percent"
          :show-indicator="false"
          :color="getProgressBarColor(disk.usage_percent)"
          :height="8"
          :border-radius="9999"
        />
        <div class="flex items-center justify-between text-xs text-muted-color">
          <span>{{ formatBytes(disk.used_size) }} / {{ formatBytes(disk.total_size) }}</span>
          <span>剩余: {{ formatBytes(disk.free_size) }}</span>
        </div>
      </div>
    </div>
    <n-empty v-else description="暂无磁盘信息" class="py-2" />
  </div>
</template>
