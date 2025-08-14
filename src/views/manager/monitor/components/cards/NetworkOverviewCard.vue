<script setup lang="ts">
import { computed } from 'vue'
import type { SystemOverview } from '../types'
import { formatSpeed } from '@/utils/formatters'
import ProgressBar from 'primevue/progressbar'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

const props = defineProps<Props>()

// 计算上传流量比例
const uploadPercentage = computed(() => {
  const total = props.overview.totalNetworkUpload + props.overview.totalNetworkDownload
  if (total === 0) return 0
  return Math.round((props.overview.totalNetworkUpload / total) * 100)
})

// 计算下载流量比例
const downloadPercentage = computed(() => {
  const total = props.overview.totalNetworkUpload + props.overview.totalNetworkDownload
  if (total === 0) return 0
  return Math.round((props.overview.totalNetworkDownload / total) * 100)
})
</script>

<template>
  <Card class="resource-overview-card">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-wifi text-purple-600"></i>
        <span>网络流量</span>
      </div>
    </template>
    <template #content>
      <div class="space-y-4">
        <!-- 上传下载速度 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div class="flex items-center justify-center gap-1 mb-2">
              <i class="pi pi-arrow-up text-green-600 text-sm"></i>
              <span class="text-xs text-muted-color">上传速度</span>
            </div>
            <div class="text-xl font-bold text-green-600">
              {{ formatSpeed(overview.totalNetworkUpload) }}
            </div>
          </div>
          <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div class="flex items-center justify-center gap-1 mb-2">
              <i class="pi pi-arrow-down text-blue-600 text-sm"></i>
              <span class="text-xs text-muted-color">下载速度</span>
            </div>
            <div class="text-xl font-bold text-blue-600">
              {{ formatSpeed(overview.totalNetworkDownload) }}
            </div>
          </div>
        </div>

        <!-- 流量统计信息 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-color">总流量:</span>
            <span class="font-medium text-purple-600">
              {{ formatSpeed(overview.totalNetworkUpload + overview.totalNetworkDownload) }}
            </span>
          </div>
        </div>

                <!-- 流量分布进度条 -->
        <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
          <div class="text-xs text-muted-color mb-2">流量分布</div>
          <ProgressBar
            :value="100"
            :showValue="false"
            class="h-2"
            :pt="{
              value: {
                style: {
                  background: `linear-gradient(to right, #22c55e ${uploadPercentage}%, #3b82f6 ${uploadPercentage}% 100%)`,
                },
              },
            }"
          />
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-green-600">上传 {{ uploadPercentage }}%</span>
            <span class="text-xs text-blue-600">下载 {{ downloadPercentage }}%</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
