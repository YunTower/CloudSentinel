<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import ServerCard from './components/ServerCard.vue'
import serversApi from '@/apis/servers'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'
import type { ServerItem } from '@/types/server'
import type { GetServersResponse } from '@/types/manager/servers'
import { mapServerListItemToServerItem } from './utils'

const toast = useToast()
const authStore = useAuthStore()

// 响应式状态
const servers = ref<ServerItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 获取用户角色和敏感信息设置
const isGuest = computed(() => authStore.role === 'guest')
const hideSensitiveInfo = computed(() => {
  const config = authStore.getGuestAccessConfig()
  return config.hideSensitiveInfo
})

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
    console.log('收到 metrics_update 事件:', data)
    // 根据 server_id 更新对应服务器的指标
    const serverIndex = servers.value.findIndex((s) => s.id === data.server_id)
    if (serverIndex !== -1) {
      const server = servers.value[serverIndex]
      // 使用对象替换确保响应式更新
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
      console.log('已更新服务器指标:', servers.value[serverIndex])
    } else {
      console.warn('未找到服务器:', data.server_id)
    }
  },
  onSystemInfoUpdate: (data) => {
    console.log('收到 system_info_update 事件:', data)
    // 更新系统信息（可选）
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

// 组件挂载时加载数据并连接WebSocket
onMounted(() => {
  loadServers()
  websocket.connect()
})

// 组件卸载时断开WebSocket
onUnmounted(() => {
  websocket.disconnect()
})
</script>
<template>
  <div class="mx-0 my-auto space-y-6">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-12 space-y-4">
      <p class="text-2xl text-color">{{ error }}</p>
      <Button
        size="small"
        @click="loadServers"
      >
        重试
      </Button>
    </div>

    <!-- 空数据状态 -->
    <div v-else-if="servers.length === 0" class="flex flex-col items-center justify-center py-12">
      <i class="pi pi-server text-4xl text-muted-color mb-4"></i>
      <p class="text-lg text-muted-color">暂无服务器</p>
    </div>

    <!-- 服务器卡片列表 -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
    >
      <ServerCard v-for="server in servers" :key="server.id" v-bind="server" />
    </div>
  </div>
</template>
