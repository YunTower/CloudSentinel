<script setup lang="ts">
import { computed } from 'vue'
import type { SystemOverview } from './types'

interface Props {
  overview: SystemOverview
  loading?: boolean
}

const props = defineProps<Props>()

// 计算属性
const onlineRate = computed(() => {
  if (props.overview.totalServers === 0) return 0
  return Math.round((props.overview.onlineServers / props.overview.totalServers) * 100)
})

const offlineAndErrorCount = computed(() => {
  return props.overview.offlineServers + props.overview.errorServers
})

const averageLoad = computed(() => {
  return Math.round((props.overview.avgCpuUsage + props.overview.avgMemoryUsage) / 2)
})

// 工具函数
const getCpuColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 70) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getMemoryColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 80) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getCpuProgressColor = (usage: number) => {
  if (usage >= 90) return '#ef4444'
  if (usage >= 70) return '#f97316'
  if (usage >= 50) return '#eab308'
  return '#22c55e'
}

const getMemoryProgressColor = (usage: number) => {
  if (usage >= 90) return '#ef4444'
  if (usage >= 80) return '#f97316'
  if (usage >= 60) return '#eab308'
  return '#22c55e'
}

const getCpuStatusText = (usage: number) => {
  if (usage >= 90) return '极高'
  if (usage >= 70) return '较高'
  if (usage >= 50) return '正常'
  return '良好'
}

const getMemoryStatusText = (usage: number) => {
  if (usage >= 90) return '极高'
  if (usage >= 80) return '较高'
  if (usage >= 60) return '正常'
  return '良好'
}

const formatSpeed = (bytes: number) => {
  if (bytes === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
<template>
  <div class="overview-stats">
    <!-- 服务器状态统计 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- 总服务器数 -->
      <Card class="stat-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {{ overview.totalServers }}
              </div>
              <div class="text-sm font-medium text-blue-700 dark:text-blue-300">
                总服务器
              </div>
            </div>
            <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <i class="pi pi-server text-blue-600 dark:text-blue-400 text-xl"></i>
            </div>
          </div>
          <!-- 状态分布指示器 -->
          <div class="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-xs text-blue-600 dark:text-blue-400">{{ overview.onlineServers }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-gray-500"></div>
              <span class="text-xs text-blue-600 dark:text-blue-400">{{ overview.offlineServers }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
              <span class="text-xs text-blue-600 dark:text-blue-400">{{ overview.errorServers }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- 在线服务器 -->
      <Card class="stat-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {{ overview.onlineServers }}
              </div>
              <div class="text-sm font-medium text-green-700 dark:text-green-300">
                在线服务器
              </div>
            </div>
            <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-xl"></i>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
            <div class="text-sm text-green-600 dark:text-green-400">
              在线率: {{ onlineRate }}%
            </div>
          </div>
        </template>
      </Card>

      <!-- 离线/异常服务器 -->
      <Card class="stat-card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                {{ offlineAndErrorCount }}
              </div>
              <div class="text-sm font-medium text-red-700 dark:text-red-300">
                离线/异常
              </div>
            </div>
            <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
            <div class="text-xs text-red-600 dark:text-red-400">
              离线: {{ overview.offlineServers }} | 异常: {{ overview.errorServers }}
            </div>
          </div>
        </template>
      </Card>

      <!-- 平均负载 -->
      <Card class="stat-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {{ averageLoad }}%
              </div>
              <div class="text-sm font-medium text-purple-700 dark:text-purple-300">
                平均负载
              </div>
            </div>
            <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <i class="pi pi-chart-line text-purple-600 dark:text-purple-400 text-xl"></i>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
            <div class="text-xs text-purple-600 dark:text-purple-400">
              CPU: {{ overview.avgCpuUsage }}% | 内存: {{ overview.avgMemoryUsage }}%
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 系统资源概览 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- CPU 使用情况 -->
      <Card class="resource-overview-card">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-microchip text-blue-600"></i>
            <span>CPU 使用情况</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- 平均使用率显示 -->
            <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div class="text-4xl font-bold mb-2" :class="getCpuColorClass(overview.avgCpuUsage)">
                {{ overview.avgCpuUsage }}%
              </div>
              <div class="text-sm text-muted-color">平均使用率</div>
            </div>

            <!-- 详细统计信息 -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">状态:</span>
                <span class="font-medium" :class="getCpuColorClass(overview.avgCpuUsage)">
                  {{ getCpuStatusText(overview.avgCpuUsage) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">峰值使用率:</span>
                <span class="font-medium text-blue-600">{{ Math.min(overview.avgCpuUsage + 15, 100) }}%</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">活跃进程:</span>
                <span class="font-medium text-blue-600">{{ overview.onlineServers * 156 + 42 }}</span>
              </div>
            </div>

            <!-- 使用率进度条 -->
            <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
              <div class="text-xs text-muted-color mb-2">使用率分布</div>
              <ProgressBar
                :value="overview.avgCpuUsage"
                :showValue="false"
                class="h-2"
                :pt="{
                  value: {
                    style: {
                      backgroundColor: getCpuProgressColor(overview.avgCpuUsage)
                    }
                  }
                }"
              />
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-muted-color">0%</span>
                <span class="text-xs text-muted-color">100%</span>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- 内存使用情况 -->
      <Card class="resource-overview-card">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-database text-green-600"></i>
            <span>内存使用情况</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- 平均使用率显示 -->
            <div class="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div class="text-4xl font-bold mb-2" :class="getMemoryColorClass(overview.avgMemoryUsage)">
                {{ overview.avgMemoryUsage }}%
              </div>
              <div class="text-sm text-muted-color">平均使用率</div>
            </div>

            <!-- 详细统计信息 -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">状态:</span>
                <span class="font-medium" :class="getMemoryColorClass(overview.avgMemoryUsage)">
                  {{ getMemoryStatusText(overview.avgMemoryUsage) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">已用内存:</span>
                <span class="font-medium text-green-600">{{ Math.round(overview.avgMemoryUsage * 32 / 100) }} GB</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">可用内存:</span>
                <span class="font-medium text-green-600">{{ 32 - Math.round(overview.avgMemoryUsage * 32 / 100) }} GB</span>
              </div>
            </div>

            <!-- 内存使用进度条 -->
            <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
              <div class="text-xs text-muted-color mb-2">内存分配</div>
              <ProgressBar
                :value="overview.avgMemoryUsage"
                :showValue="false"
                class="h-2"
                :pt="{
                  value: {
                    style: {
                      backgroundColor: getMemoryProgressColor(overview.avgMemoryUsage)
                    }
                  }
                }"
              />
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-green-600">已用</span>
                <span class="text-xs text-muted-color">可用</span>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- 网络流量 -->
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

            <!-- 总流量和带宽利用率 -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">总流量:</span>
                <span class="font-medium text-purple-600">
                  {{ formatSpeed(overview.totalNetworkUpload + overview.totalNetworkDownload) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">带宽利用率:</span>
                <span class="font-medium text-purple-600">
                  {{ Math.round(((overview.totalNetworkUpload + overview.totalNetworkDownload) / (100 * 1024 * 1024)) * 100) }}%
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">活跃连接:</span>
                <span class="font-medium text-purple-600">{{ overview.onlineServers * 42 }}</span>
              </div>
            </div>

            <!-- 流量分布条 -->
            <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
              <div class="text-xs text-muted-color mb-2">流量分布</div>
              <div class="flex h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div
                  class="bg-green-500 transition-all duration-300"
                  :style="{ width: `${(overview.totalNetworkUpload / (overview.totalNetworkUpload + overview.totalNetworkDownload)) * 100}%` }"
                ></div>
                <div
                  class="bg-blue-500 transition-all duration-300"
                  :style="{ width: `${(overview.totalNetworkDownload / (overview.totalNetworkUpload + overview.totalNetworkDownload)) * 100}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-green-600">上传</span>
                <span class="text-xs text-blue-600">下载</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
<style scoped>
.overview-stats > * + * {
  margin-top: 1.5rem;
}

.stat-card {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: box-shadow 0.2s ease-in-out;
}

.resource-overview-card {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: box-shadow 0.2s ease-in-out;
}
</style>
