<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'
import type { ServerItem } from '@/types/server'

const props = defineProps<ServerItem>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'online':
      return 'bg-green-500 dark:bg-green-400'
    case 'offline':
      return 'bg-red-500 dark:bg-red-400'
    case 'maintenance':
      return 'bg-yellow-500 dark:bg-yellow-400'
    default:
      return 'bg-surface-400'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'online':
      return '在线'
    case 'offline':
      return '离线'
    case 'maintenance':
      return '维护中'
    default:
      return '未知'
  }
})

// 根据使用率获取文本颜色类
const getCpuTextColorClass = (usage: number) => {
  if (usage >= 80) return 'text-red-500 dark:text-red-400'
  if (usage >= 60) return 'text-orange-500 dark:text-orange-400'
  return 'text-primary'
}

const getMemoryTextColorClass = (usage: number) => {
  if (usage >= 85) return 'text-red-500 dark:text-red-400'
  if (usage >= 70) return 'text-orange-500 dark:text-orange-400'
  return 'text-green-600 dark:text-green-400'
}

const getDiskTextColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-500 dark:text-red-400'
  if (usage >= 75) return 'text-orange-500 dark:text-orange-400'
  return 'text-blue-600 dark:text-blue-400'
}

const getDiskBgColorClass = (usage: number) => {
  if (usage >= 90) return 'bg-red-500 dark:bg-red-400'
  if (usage >= 75) return 'bg-orange-500 dark:bg-orange-400'
  return 'bg-blue-600 dark:bg-blue-400'
}

// 格式化网络速度
const formatSpeed = (speedKBps: number) => {
  if (speedKBps >= 1024 * 1024) {
    return `${(speedKBps / (1024 * 1024)).toFixed(1)}GB/s`
  } else if (speedKBps >= 1024) {
    return `${(speedKBps / 1024).toFixed(1)}MB/s`
  } else {
    return `${speedKBps.toFixed(1)}KB/s`
  }
}

// 格式化操作系统显示（简化显示）
const formatOS = (os: string) => {
  if (os.includes('Ubuntu')) return 'Ubuntu'
  if (os.includes('CentOS')) return 'CentOS'
  if (os.includes('Windows')) return 'Windows'
  if (os.includes('Debian')) return 'Debian'
  if (os.includes('RHEL')) return 'RHEL'
  return os.split(' ')[0] // 取第一个单词
}

// 根据网络流量获取颜色类
const getNetworkColorClass = (speedKBps: number) => {
  if (speedKBps === 0) return 'text-muted-color'
  if (speedKBps >= 1024 * 1024) return 'text-red-500 dark:text-red-400' // >= 1GB/s 红色
  if (speedKBps >= 1024 * 100) return 'text-orange-500 dark:text-orange-400' // >= 100MB/s 橙色
  if (speedKBps >= 1024 * 10) return 'text-blue-600 dark:text-blue-400' // >= 10MB/s 蓝色
  if (speedKBps >= 1024) return 'text-green-600 dark:text-green-400' // >= 1MB/s 绿色
  return 'text-primary' // < 1MB/s 主题色
}
</script>
<template>
  <Card class="h-full">
    <template #header>
      <div class="p-4 space-y-1">
        <div class="text-lg font-semibold truncate text-color-emphasis">
          {{ name }}
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div :class="statusClass" class="w-2 h-2 rounded-full shadow-sm animate-pulse-slow"></div>
            <span class="text-xs font-medium text-color-emphasis">{{ statusText }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-map-marker !text-[12px] text-muted-color"></i>
            <span class="text-xs font-medium text-muted-color">{{ location }}</span>
          </div>
        </div>
      </div>

    </template>

    <template #content>
      <div class="space-y-2">
        <!-- CPU 和内存监控 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
            <div class="text-2xl font-bold mb-1" :class="getCpuTextColorClass(cpuUsage)">
              {{ cpuUsage }}%
            </div>
            <div class="text-xs font-medium text-muted-color">CPU </div>
          </div>

          <div class="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
            <div class="text-2xl font-bold mb-1" :class="getMemoryTextColorClass(memoryUsage)">
              {{ memoryUsage }}%
            </div>
            <div class="text-xs font-medium text-muted-color">内存</div>
          </div>
        </div>

        <!-- 系统信息 -->
        <div class="p-2 rounded-lg bg-surface-50 dark:bg-surface-800">
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="text-muted-color">系统</div>
              <div class="font-semibold text-color truncate" :title="os">{{ formatOS(os) }}</div>
            </div>
            <div class="text-center">
              <div class="text-muted-color">架构</div>
              <div class="font-semibold text-color">{{ architecture }}</div>
            </div>
            <div class="text-center">
              <div class="text-muted-color">核心</div>
              <div class="font-semibold text-color">{{ cores }}</div>
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
                v-if="networkIO.upload > 0 || networkIO.download > 0"
              ></div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-2 text-center">
              <div class="flex items-center justify-center gap-1 mb-1">
                <i class="pi pi-arrow-up text-xs text-green-600 dark:text-green-400"></i>
                <span class="text-xs text-muted-color">上传</span>
              </div>
              <div class="text-base font-bold" :class="getNetworkColorClass(networkIO.upload)">
                {{ formatSpeed(networkIO.upload) }}
              </div>
            </div>
            <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-2 text-center">
              <div class="flex items-center justify-center gap-1 mb-1">
                <i class="pi pi-arrow-down text-xs text-blue-600 dark:text-blue-400"></i>
                <span class="text-xs text-muted-color">下载</span>
              </div>
              <div class="text-base font-bold" :class="getNetworkColorClass(networkIO.download)">
                {{ formatSpeed(networkIO.download) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 综合磁盘使用 -->
        <div class="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
              <i class="pi pi-database text-sm text-muted-color"></i>
              <span class="text-sm font-medium text-color">存储</span>
              <span class="text-xs text-muted-color">({{ totalStorage }})</span>
            </div>
            <span class="text-sm font-bold" :class="getDiskTextColorClass(diskUsage)">
              {{ diskUsage }}%
            </span>
          </div>
          <ProgressBar
            :value="diskUsage"
            class="h-2"
            :pt="{
              value: {
                class: getDiskBgColorClass(diskUsage) + ' transition-all duration-500',
              },
            }"
          />
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

/* 自定义动画类 */
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
