<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import ServerCard from './components/ServerCard.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import SelectButton from 'primevue/selectbutton'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import serversApi from '@/apis/servers'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'
import type { ServerItem } from '@/types/server'
import type { GetServersResponse } from '@/types/manager/servers'
import { mapServerListItemToServerItem, formatSpeed, formatOS, getStatusColor, getStatusText } from './utils'
import { getProgressBarColor, getProgressTextColor } from '@/utils/version.ts'

const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()

// 响应式状态
const servers = ref<ServerItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const initializing = ref(false)

// 视图模式
const viewMode = ref<'card' | 'table'>('card')
const groupBy = ref<'none' | 'status' | 'location' | 'os'>('none')

// 视图选项
const viewOptions = [
  { label: '卡片', value: 'card', icon: 'pi pi-th-large' },
  { label: '表格', value: 'table', icon: 'pi pi-table' },
]

// 分组选项
const groupOptions = [
  { label: '不分组', value: 'none' },
  { label: '按状态', value: 'status' },
  { label: '按地区', value: 'location' },
  { label: '按系统', value: 'os' },
]

// 加载服务器列表
const loadServers = async () => {
  loading.value = true
  error.value = null
  try {
    const response = (await serversApi.getServers()) as GetServersResponse

    if (response.status && response.data) {
      // 将后端数据映射为前端格式
      servers.value = response.data.map((server) => mapServerListItemToServerItem(server))
    } else {
      throw new Error(response.message || '获取服务器列表失败')
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '获取服务器列表失败'
    error.value = errorMessage
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: errorMessage,
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

// WebSocket 连接
const websocket = useWebSocket({
  onMetricsUpdate: (data) => {
    // 根据 server_id 更新对应服务器的指标
    const serverIndex = servers.value.findIndex((s) => s.id === data.server_id)
    if (serverIndex !== -1) {
      const server = servers.value[serverIndex]
      servers.value[serverIndex] = {
        ...server,
        cpuUsage: data.cpu_usage !== undefined ? data.cpu_usage : server.cpuUsage,
        memoryUsage: data.memory_usage !== undefined ? data.memory_usage : server.memoryUsage,
        diskUsage: data.disk_usage !== undefined ? data.disk_usage : server.diskUsage,
        networkIO: {
          upload: data.network_upload !== undefined ? data.network_upload : server.networkIO.upload,
          download: data.network_download !== undefined ? data.network_download : server.networkIO.download,
        },
      }
    } else {
      console.warn('未找到服务器:', data.server_id)
    }
  },
  onSystemInfoUpdate: (data) => {
    // 更新系统信息
    const serverIndex = servers.value.findIndex((s) => s.id === data.server_id)
    if (serverIndex !== -1 && data.data) {
      const server = servers.value[serverIndex]
      servers.value[serverIndex] = {
        ...server,
        os: data.data.os !== undefined ? data.data.os : server.os,
        architecture: data.data.architecture !== undefined ? data.data.architecture : server.architecture,
      }
    }
  },
  onServerStatusUpdate: (data) => {
    // 更新服务器在线状态
    const serverIndex = servers.value.findIndex((s) => s.id === data.server_id)
    if (serverIndex !== -1 && data.status) {
      const server = servers.value[serverIndex]
      servers.value[serverIndex] = {
        ...server,
        status: data.status,
      }
    } else {
      console.warn('未找到服务器:', data.server_id)
    }
  },
  onError: (err) => {
    console.error('WebSocket错误:', err)
  },
  onOpen: () => {
    console.log('WebSocket连接已建立')
  },
  onClose: () => {
    console.log('WebSocket连接已关闭')
  },
})

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    initializing.value = true
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (!authStore.isAuthenticated) {
      await router.push({ name: 'login', query: { redirect_uri: router.currentRoute.value.fullPath } })
      return
    }
    initializing.value = false
  }

  loadServers()
  websocket.connect()
})

onUnmounted(() => {
  websocket.disconnect()
})

// 分组计算属性
const groupedServers = computed(() => {
  if (groupBy.value === 'none') {
    return { '全部': servers.value }
  }

  const grouped: Record<string, ServerItem[]> = {}

  servers.value.forEach((server) => {
    let key: string
    switch (groupBy.value) {
      case 'status':
        key = getStatusText(server.status)
        break
      case 'location':
        key = server.location || '未知地区'
        break
      case 'os':
        key = formatOS(server.os) || '未知系统'
        break
      default:
        key = '全部'
    }

    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(server)
  })

  return grouped
})

// 获取状态严重程度（用于 Tag 组件）
const getStatusSeverity = (status: string): 'success' | 'danger' | 'warning' | 'secondary' => {
  switch (status) {
    case 'online':
      return 'success'
    case 'offline':
      return 'danger'
    case 'maintenance':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'secondary'
  }
}
</script>
<template>
  <div class="mx-0 my-auto space-y-6">
    <!-- 初始化状态 -->
    <div v-if="initializing" class="flex flex-col items-center justify-center py-12 space-y-4">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      <p class="text-lg text-muted-color">正在初始化...</p>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error && !initializing" class="flex flex-col items-center justify-center py-12 space-y-4">
      <p class="text-2xl text-color">{{ error }}</p>
      <Button
        size="small"
        @click="loadServers"
      >
        重试
      </Button>
    </div>

    <!-- 空数据状态 -->
    <div v-else-if="servers.length === 0 && !initializing" class="flex flex-col items-center justify-center py-12">
      <i class="pi pi-server text-4xl text-muted-color mb-4"></i>
      <p class="text-lg text-muted-color">暂无服务器</p>
    </div>

    <!-- 主要内容 -->
    <div v-else-if="!initializing" class="space-y-6">
      <!-- 工具栏 -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold text-color">服务器概览</h2>
          <span class="text-sm text-muted-color">({{ servers.length }} 台)</span>
        </div>
        <div class="flex items-center gap-3">
          <Dropdown
            v-model="groupBy"
            :options="groupOptions"
            option-label="label"
            option-value="value"
            placeholder="分组方式"
            class="w-[140px]"
          />
          <SelectButton
            v-model="viewMode"
            :options="viewOptions"
            option-label="label"
            option-value="value"
          />
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-if="viewMode === 'table'">
        <template v-if="groupBy === 'none'">
          <DataTable
            :value="servers"
            striped-rows
            class="p-datatable-sm"
            :pt="{
              root: { class: 'rounded-lg border border-surface-200 dark:border-surface-700' },
              header: { class: 'bg-surface-50 dark:bg-surface-800' },
              tbody: { class: 'bg-surface-0 dark:bg-surface-900' },
              row: { class: 'hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors' },
            }"
          >
            <Column field="status" header="状态" style="width: 100px">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <div
                    :class="getStatusColor(data.status)"
                    class="w-2 h-2 rounded-full shadow-sm animate-pulse-slow"
                  ></div>
                  <Tag :value="getStatusText(data.status)" :severity="getStatusSeverity(data.status)" />
                </div>
              </template>
            </Column>
            <Column field="name" header="名称" sortable style="min-width: 150px">
              <template #body="{ data }">
                <span class="font-medium text-color">{{ data.name }}</span>
              </template>
            </Column>
            <Column field="location" header="地区" sortable style="width: 120px">
              <template #body="{ data }">
                <div class="flex items-center gap-1">
                  <i class="pi pi-map-marker text-xs text-muted-color"></i>
                  <span class="text-muted-color">{{ data.location || '-' }}</span>
                </div>
              </template>
            </Column>
            <Column field="os" header="系统" sortable style="width: 120px">
              <template #body="{ data }">
                <span class="text-color">{{ formatOS(data.os) || '-' }}</span>
              </template>
            </Column>
            <Column field="cpuUsage" header="CPU" sortable style="width: 120px">
              <template #body="{ data }">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold" :class="getProgressTextColor(data.cpuUsage)">
                      {{ data.cpuUsage }}%
                    </span>
                  </div>
                  <ProgressBar
                    :value="data.cpuUsage"
                    class="h-1.5"
                    :pt="{
                      value: {
                        class: getProgressBarColor(data.cpuUsage) + ' transition-all duration-500',
                      },
                    }"
                  />
                </div>
              </template>
            </Column>
            <Column field="memoryUsage" header="内存" sortable style="width: 120px">
              <template #body="{ data }">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold" :class="getProgressTextColor(data.memoryUsage)">
                      {{ data.memoryUsage }}%
                    </span>
                  </div>
                  <ProgressBar
                    :value="data.memoryUsage"
                    class="h-1.5"
                    :pt="{
                      value: {
                        class: getProgressBarColor(data.memoryUsage) + ' transition-all duration-500',
                      },
                    }"
                  />
                </div>
              </template>
            </Column>
            <Column field="diskUsage" header="磁盘" sortable style="width: 120px">
              <template #body="{ data }">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold" :class="getProgressTextColor(data.diskUsage)">
                      {{ data.diskUsage }}%
                    </span>
                  </div>
                  <ProgressBar
                    :value="data.diskUsage"
                    class="h-1.5"
                    :pt="{
                      value: {
                        class: getProgressBarColor(data.diskUsage) + ' transition-all duration-500',
                      },
                    }"
                  />
                </div>
              </template>
            </Column>
            <Column field="networkIO" header="网络" style="width: 150px">
              <template #body="{ data }">
                <div class="space-y-1 text-xs">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-arrow-up text-green-600 dark:text-green-400"></i>
                    <span class="text-muted-color">{{ formatSpeed(data.networkIO.upload) }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <i class="pi pi-arrow-down text-blue-600 dark:text-blue-400"></i>
                    <span class="text-muted-color">{{ formatSpeed(data.networkIO.download) }}</span>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
        <template v-else>
          <div v-for="(groupServers, groupName) in groupedServers" :key="groupName" class="mb-6 space-y-3">
            <div class="flex items-center justify-between px-2">
              <h3 class="text-lg font-semibold text-color">{{ groupName }}</h3>
              <span class="text-sm text-muted-color">{{ groupServers.length }} 台服务器</span>
            </div>
            <DataTable
              :value="groupServers"
              striped-rows
              class="p-datatable-sm"
              :pt="{
                root: { class: 'rounded-lg border border-surface-200 dark:border-surface-700' },
                header: { class: 'bg-surface-50 dark:bg-surface-800' },
                tbody: { class: 'bg-surface-0 dark:bg-surface-900' },
                row: { class: 'hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors' },
              }"
            >
              <Column field="status" header="状态" style="width: 100px">
                <template #body="{ data }">
                  <div class="flex items-center gap-2">
                    <div
                      :class="getStatusColor(data.status)"
                      class="w-2 h-2 rounded-full shadow-sm animate-pulse-slow"
                    ></div>
                    <Tag :value="getStatusText(data.status)" :severity="getStatusSeverity(data.status)" />
                  </div>
                </template>
              </Column>
              <Column field="name" header="名称" sortable style="min-width: 150px">
                <template #body="{ data }">
                  <span class="font-medium text-color">{{ data.name }}</span>
                </template>
              </Column>
              <Column field="location" header="地区" sortable style="width: 120px">
                <template #body="{ data }">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-map-marker text-xs text-muted-color"></i>
                    <span class="text-muted-color">{{ data.location || '-' }}</span>
                  </div>
                </template>
              </Column>
              <Column field="os" header="系统" sortable style="width: 120px">
                <template #body="{ data }">
                  <span class="text-color">{{ formatOS(data.os) || '-' }}</span>
                </template>
              </Column>
              <Column field="cpuUsage" header="CPU" sortable style="width: 120px">
                <template #body="{ data }">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-semibold" :class="getProgressTextColor(data.cpuUsage)">
                        {{ data.cpuUsage }}%
                      </span>
                    </div>
                    <ProgressBar
                      :value="data.cpuUsage"
                      class="h-1.5"
                      :pt="{
                        value: {
                          class: getProgressBarColor(data.cpuUsage) + ' transition-all duration-500',
                        },
                      }"
                    />
                  </div>
                </template>
              </Column>
              <Column field="memoryUsage" header="内存" sortable style="width: 120px">
                <template #body="{ data }">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-semibold" :class="getProgressTextColor(data.memoryUsage)">
                        {{ data.memoryUsage }}%
                      </span>
                    </div>
                    <ProgressBar
                      :value="data.memoryUsage"
                      class="h-1.5"
                      :pt="{
                        value: {
                          class: getProgressBarColor(data.memoryUsage) + ' transition-all duration-500',
                        },
                      }"
                    />
                  </div>
                </template>
              </Column>
              <Column field="diskUsage" header="磁盘" sortable style="width: 120px">
                <template #body="{ data }">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-semibold" :class="getProgressTextColor(data.diskUsage)">
                        {{ data.diskUsage }}%
                      </span>
                    </div>
                    <ProgressBar
                      :value="data.diskUsage"
                      class="h-1.5"
                      :pt="{
                        value: {
                          class: getProgressBarColor(data.diskUsage) + ' transition-all duration-500',
                        },
                      }"
                    />
                  </div>
                </template>
              </Column>
              <Column field="networkIO" header="网络" style="width: 150px">
                <template #body="{ data }">
                  <div class="space-y-1 text-xs">
                    <div class="flex items-center gap-1">
                      <i class="pi pi-arrow-up text-green-600 dark:text-green-400"></i>
                      <span class="text-muted-color">{{ formatSpeed(data.networkIO.upload) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <i class="pi pi-arrow-down text-blue-600 dark:text-blue-400"></i>
                      <span class="text-muted-color">{{ formatSpeed(data.networkIO.download) }}</span>
                    </div>
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </div>

      <!-- 卡片视图 -->
      <div v-else>
        <template v-if="groupBy === 'none'">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            <ServerCard v-for="server in servers" :key="server.id" v-bind="server" />
          </div>
        </template>
        <template v-else>
          <div v-for="(groupServers, groupName) in groupedServers" :key="groupName" class="mb-6 space-y-4">
            <div class="flex items-center justify-between px-2">
              <h3 class="text-lg font-semibold text-color">{{ groupName }}</h3>
              <span class="text-sm text-muted-color">{{ groupServers.length }} 台服务器</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              <ServerCard v-for="server in groupServers" :key="server.id" v-bind="server" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<style scoped>
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
