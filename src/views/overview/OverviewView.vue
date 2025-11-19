<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import ServerCard from './components/ServerCard.vue'
import serversApi from '@/apis/servers'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'
import type { ServerItem } from '@/types/server'
import type { GetServersResponse } from '@/types/manager/servers'
import { mapServerListItemToServerItem } from './utils'

const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()

// 响应式状态
const servers = ref<ServerItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const initializing = ref(false)

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

    <!-- 服务器卡片列表 -->
    <div
      v-else-if="!initializing"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
    >
      <ServerCard v-for="server in servers" :key="server.id" v-bind="server" />
    </div>
  </div>
</template>
