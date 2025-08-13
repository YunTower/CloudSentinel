<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MonitorServer } from './types'
import { formatSpeed, formatUptime, formatLastUpdate } from '@/utils/formatters'

interface Props {
  servers: Omit<MonitorServer, 'location'>[]
  loading?: boolean
}

interface StatusOption {
  label: string
  value: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'server-click': [server: Omit<MonitorServer, 'location'>]
  refresh: []
}>()

// 状态筛选
const statusFilter = ref('all')
const statusOptions: StatusOption[] = [
  { label: '全部', value: 'all' },
  { label: '在线', value: 'online' },
  { label: '离线', value: 'offline' },
  { label: '异常', value: 'error' },
  { label: '警告', value: 'warning' },
]

// 过滤后的服务器列表
const filteredServers = computed(() => {
  if (statusFilter.value === 'all') {
    return props.servers
  }
  return props.servers.filter((server) => server.status === statusFilter.value)
})

// 工具函数
const getStatusText = (status: string) => {
  const texts = {
    online: '在线',
    offline: '离线',
    error: '异常',
    warning: '警告',
  }
  return texts[status as keyof typeof texts] || '未知'
}

const getStatusSeverity = (status: string) => {
  const severities = {
    online: 'success',
    offline: 'secondary',
    error: 'danger',
    warning: 'warn',
  }
  return severities[status as keyof typeof severities] || 'secondary'
}

const getStatusIndicatorClass = (status: string) => {
  const classes = {
    online: 'bg-green-500 animate-pulse',
    offline: 'bg-gray-500',
    error: 'bg-red-500 animate-pulse',
    warning: 'bg-yellow-500 animate-pulse',
  }
  return classes[status as keyof typeof classes] || 'bg-gray-500'
}

const getServerCardClass = (status: string) => {
  const baseClass = 'bg-surface-0 dark:bg-surface-900 border-surface-200 dark:border-surface-700'
  const statusClasses = {
    online: 'hover:border-green-300 dark:hover:border-green-600',
    offline: 'hover:border-gray-300 dark:hover:border-gray-600',
    error: 'hover:border-red-300 dark:hover:border-red-600',
    warning: 'hover:border-yellow-300 dark:hover:border-yellow-600',
  }
  return `${baseClass} ${statusClasses[status as keyof typeof statusClasses] || statusClasses.offline}`
}

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

const getDiskColorClass = (usage: number) => {
  if (usage >= 95) return 'text-red-600 dark:text-red-400'
  if (usage >= 85) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 70) return 'text-yellow-600 dark:text-yellow-400'
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

const getDiskProgressColor = (usage: number) => {
  if (usage >= 95) return '#ef4444'
  if (usage >= 85) return '#f97316'
  if (usage >= 70) return '#eab308'
  return '#22c55e'
}
</script>
<template>
  <div class="server-status-grid">
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-server text-primary"></i>
            <span>服务器状态</span>
          </div>
          <div class="flex items-center gap-3">
            <!-- 状态过滤器 -->
            <Select
              v-model="statusFilter"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="状态筛选"
              class="w-36"
              size="small"
            />
            <!-- 刷新按钮 -->
            <Button
              icon="pi pi-refresh"
              size="small"
              text
              @click="emit('refresh')"
              v-tooltip.top="'刷新'"
              :loading="loading"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="!loading">
          <!-- 服务器网格 -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4"
          >
            <div
              v-for="server in filteredServers"
              :key="server.id"
              class="server-card p-4 rounded-lg border transition-all duration-200 cursor-pointer"
              :class="getServerCardClass(server.status)"
              @click="emit('server-click', server)"
            >
              <!-- 服务器基本信息 -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div
                    class="w-3 h-3 rounded-full"
                    :class="getStatusIndicatorClass(server.status)"
                  ></div>
                  <span class="font-medium text-sm truncate" :title="server.name">
                    {{ server.name }}
                  </span>
                </div>
                <Tag
                  :value="getStatusText(server.status)"
                  :severity="getStatusSeverity(server.status)"
                  class="text-xs"
                />
              </div>

              <!-- IP 地址 -->
              <div class="text-xs text-muted-color mb-3 font-mono">
                {{ server.ip }}
              </div>

              <!-- 资源使用情况 -->
              <div class="space-y-2">
                <!-- CPU -->
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-color">CPU</span>
                  <span :class="getCpuColorClass(server.cpu)">{{ server.cpu }}%</span>
                </div>
                <ProgressBar
                  :value="server.cpu"
                  :showValue="false"
                  class="h-1.5"
                  :pt="{
                    value: {
                      style: {
                        backgroundColor: getCpuProgressColor(server.cpu),
                      },
                    },
                  }"
                />

                <!-- 内存 -->
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-color">内存</span>
                  <span :class="getMemoryColorClass(server.memory)">{{ server.memory }}%</span>
                </div>
                <ProgressBar
                  :value="server.memory"
                  :showValue="false"
                  class="h-1.5"
                  :pt="{
                    value: {
                      style: {
                        backgroundColor: getMemoryProgressColor(server.memory),
                      },
                    },
                  }"
                />

                <!-- 磁盘 -->
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-color">磁盘</span>
                  <span :class="getDiskColorClass(server.disk)">{{ server.disk }}%</span>
                </div>
                <ProgressBar
                  :value="server.disk"
                  :showValue="false"
                  class="h-1.5"
                  :pt="{
                    value: {
                      style: {
                        backgroundColor: getDiskProgressColor(server.disk),
                      },
                    },
                  }"
                />
              </div>

              <!-- 网络流量 -->
              <div
                class="flex items-center justify-between mt-3 pt-3 border-t border-surface-200 dark:border-surface-700"
              >
                <div class="flex items-center gap-1 text-xs">
                  <i class="pi pi-arrow-up text-green-600 text-xs"></i>
                  <span class="text-green-600">{{ formatSpeed(server.networkIO.upload) }}</span>
                </div>
                <div class="flex items-center gap-1 text-xs">
                  <i class="pi pi-arrow-down text-blue-600 text-xs"></i>
                  <span class="text-blue-600">{{ formatSpeed(server.networkIO.download) }}</span>
                </div>
              </div>

              <div class="flex items-center justify-between mt-2 text-xs text-muted-color">
                <div class="text-xs text-muted-color mt-2">
                  更新于 {{ formatLastUpdate(server.lastUpdate) }}
                </div>
                <div class="flex items-center gap-1">
                  <span>已运行 {{ formatUptime(server.uptime) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredServers.length === 0" class="text-center py-12">
            <i class="pi pi-server text-4xl text-muted-color mb-4"></i>
            <div class="text-lg font-medium text-muted-color mb-2">
              {{ statusFilter === 'all' ? '暂无服务器' : '没有匹配的服务器' }}
            </div>
            <div class="text-sm text-muted-color">
              {{ statusFilter === 'all' ? '请先添加服务器' : '请尝试其他筛选条件' }}
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-else class="flex items-center justify-center py-12">
          <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
        </div>
      </template>
    </Card>
  </div>
</template>
<style scoped>
.server-status-grid {
  width: 100%;
}

.server-card {
  transform: scale(1);
  transition: transform 0.2s ease-in-out;
}

.server-status-grid {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--surface-400)) transparent;
}

.server-status-grid::-webkit-scrollbar {
  width: 6px;
}

.server-status-grid::-webkit-scrollbar-track {
  background: transparent;
}

.server-status-grid::-webkit-scrollbar-thumb {
  background-color: rgb(var(--surface-400));
  border-radius: 3px;
}
</style>
