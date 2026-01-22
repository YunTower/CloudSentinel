<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/types/server'
import { getProgressBarColor, getProgressTextColor } from '@/utils/version.ts'
import { formatSpeed, formatOS, getStatusColor, getStatusText as getStatusTextUtil } from '../utils'

const props = defineProps<ServerItem>()

const statusClass = computed(() => getStatusColor(props.status))

const statusText = computed(() => getStatusTextUtil(props.status))

// 付费周期标签
const getBillingCycleLabel = (cycle?: string): string => {
  const options: Record<string, string> = {
    monthly: '月付',
    quarterly: '季付',
    yearly: '年付',
    one_time: '一次性',
    custom: '自定义',
  }
  return cycle ? options[cycle] || cycle : '-'
}

// 流量限制类型标签
const getTrafficLimitTypeLabel = (type?: string): string => {
  const options: Record<string, string> = {
    unlimited: '无限制',
    periodic: '周期',
  }
  return type ? options[type] || type : '-'
}

// 流量重置周期标签
const getTrafficResetCycleLabel = (cycle?: string): string => {
  const options: Record<string, string> = {
    monthly: '每月',
    quarterly: '每季度',
    yearly: '每年',
    custom: '自定义',
  }
  return cycle ? options[cycle] || cycle : '-'
}
</script>
<template>
  <Card class="h-full">
    <template #header>
      <div class="p-4 space-y-1">
        <div class="text-lg font-semibold truncate text-color-emphasis">
          {{ props.name }}
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              :class="statusClass"
              class="w-2 h-2 rounded-full shadow-sm animate-pulse-slow"
            ></div>
            <span class="text-xs font-medium text-color-emphasis">{{ statusText }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-map-marker !text-[12px] text-muted-color"></i>
            <span class="text-xs font-medium text-muted-color">{{ props.location }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #content>
      <div class="space-y-2">
        <!-- CPU 和内存监控 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
            <div class="text-2xl font-bold mb-1" :class="getProgressTextColor(props.cpuUsage)">
              {{ props.cpuUsage }}%
            </div>
            <div class="text-xs font-medium text-muted-color">CPU</div>
          </div>

          <div class="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
            <div class="text-2xl font-bold mb-1" :class="getProgressTextColor(props.memoryUsage)">
              {{ props.memoryUsage }}%
            </div>
            <div class="text-xs font-medium text-muted-color">内存</div>
          </div>
        </div>

        <!-- 系统信息 -->
        <div class="p-2 rounded-lg bg-surface-50 dark:bg-surface-800">
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="text-muted-color">系统</div>
              <div class="font-semibold text-color truncate" :title="props.os">
                {{ formatOS(props.os) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-muted-color">架构</div>
              <div class="font-semibold text-color">{{ props.architecture }}</div>
            </div>
            <div class="text-center">
              <div class="text-muted-color">核心</div>
              <div class="font-semibold text-color">{{ props.cores }}</div>
            </div>
          </div>
        </div>

        <!-- 网络 I/O -->
        <div class="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-wifi text-sm text-muted-color"></i>
            <span class="text-sm font-medium text-color">网络</span>
            <div class="flex-1 flex justify-end">
              <div
                class="w-2 h-2 rounded-full bg-primary animate-pulse"
                v-if="props.networkIO.upload > 0 || props.networkIO.download > 0"
              ></div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-2 text-center">
              <div class="flex items-center justify-center gap-1 mb-1">
                <i class="pi pi-arrow-up text-xs text-green-600 dark:text-green-400"></i>
                <span class="text-xs text-muted-color">上传</span>
              </div>
              <div class="text-base font-bold">
                {{ formatSpeed(props.networkIO.upload) }}
              </div>
            </div>
            <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-2 text-center">
              <div class="flex items-center justify-center gap-1 mb-1">
                <i class="pi pi-arrow-down text-xs text-blue-600 dark:text-blue-400"></i>
                <span class="text-xs text-muted-color">下载</span>
              </div>
              <div class="text-base font-bold">
                {{ formatSpeed(props.networkIO.download) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 综合磁盘使用 -->
        <div class="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
              <i class="pi pi-database text-sm text-muted-color"></i>
              <span class="text-sm font-medium text-color">磁盘</span>
              <span v-if="props.totalStorage" class="text-xs text-muted-color"
                >({{ props.totalStorage }})</span
              >
            </div>
            <span class="text-sm font-bold" :class="getProgressTextColor(props.diskUsage)">
              {{ props.diskUsage }}%
            </span>
          </div>
          <ProgressBar
            :value="props.diskUsage"
            class="h-2"
            :pt="{
              value: {
                class: getProgressBarColor(diskUsage) + ' transition-all duration-500',
              },
            }"
          />
        </div>

        <!-- 付费周期信息 -->
        <div
          v-if="props.show_billing_cycle && (props.billing_cycle || props.price || props.expire_time)"
          class="p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
        >
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-calendar text-sm text-muted-color"></i>
            <span class="text-sm font-medium text-color">付费周期</span>
          </div>
          <div class="space-y-1 text-xs">
            <div v-if="props.billing_cycle" class="flex justify-between">
              <span class="text-muted-color">周期</span>
              <span class="font-medium text-color">{{ getBillingCycleLabel(props.billing_cycle) }}</span>
            </div>
            <div v-if="props.price !== undefined && props.price !== null" class="flex justify-between">
              <span class="text-muted-color">价格</span>
              <span class="font-medium text-color">¥{{ props.price.toFixed(2) }}</span>
            </div>
            <div v-if="props.expire_time" class="flex justify-between">
              <span class="text-muted-color">到期</span>
              <span class="font-medium text-color">{{
                new Date(props.expire_time).toLocaleDateString('zh-CN')
              }}</span>
            </div>
          </div>
        </div>

        <!-- 流量限制信息 -->
        <div
          v-if="props.show_traffic_limit && (props.traffic_limit_type || props.traffic_limit_bytes)"
          class="p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
        >
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-chart-line text-sm text-muted-color"></i>
            <span class="text-sm font-medium text-color">流量限制</span>
          </div>
          <div class="space-y-1 text-xs">
            <div v-if="props.traffic_limit_type" class="flex justify-between">
              <span class="text-muted-color">类型</span>
              <span class="font-medium text-color">{{ getTrafficLimitTypeLabel(props.traffic_limit_type) }}</span>
            </div>
            <div
              v-if="props.traffic_limit_bytes && props.traffic_limit_bytes > 0"
              class="flex justify-between"
            >
              <span class="text-muted-color">限制</span>
              <span class="font-medium text-color">{{
                (props.traffic_limit_bytes / (1024 * 1024 * 1024)).toFixed(2)
              }}
                GB</span>
            </div>
          </div>
        </div>

        <!-- 流量重置周期信息 -->
        <div
          v-if="props.show_traffic_reset_cycle && props.traffic_reset_cycle"
          class="p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
        >
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-refresh text-sm text-muted-color"></i>
            <span class="text-sm font-medium text-color">重置周期</span>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-color">周期</span>
              <span class="font-medium text-color">{{ getTrafficResetCycleLabel(props.traffic_reset_cycle) }}</span>
            </div>
            <div v-if="props.traffic_custom_cycle_days" class="flex justify-between">
              <span class="text-muted-color">自定义</span>
              <span class="font-medium text-color">{{ props.traffic_custom_cycle_days }} 天</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
<style scoped>
:deep(.p-card) {
  height: 100%;
  background: transparent;
}

:deep(.p-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 1rem 1rem;
}

:deep(.p-card-title) {
  margin: 0;
  padding: 0;
}

:deep(.p-card-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>
