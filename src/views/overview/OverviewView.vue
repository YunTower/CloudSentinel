<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RiLayoutGridLine, RiListCheck } from '@remixicon/vue'
import { useMessage } from 'naive-ui'
import ServerCard from './components/ServerCard.vue'
import ServerTable from './components/ServerTable.vue'
import GroupHeader from './components/GroupHeader.vue'
import serversApi from '@/apis/servers'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'
import type { ServerItem } from '@/types/server'
import type { GetServersResponse, ServerGroup } from '@/types/manager/servers'
import { mapServerListItemToServerItem, getStatusText, formatOS } from './utils'

const message = useMessage()
const router = useRouter()
const authStore = useAuthStore()

// localStorage key
const VIEW_MODE_STORAGE_KEY = 'overview_view_mode'

// 响应式状态
const servers = ref<ServerItem[]>([])
const groups = ref<ServerGroup[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const initializing = ref(false)

// 视图模式
const getStoredViewMode = (): 'card' | 'table' => {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (stored === 'card' || stored === 'table') {
      return stored
    }
  } catch (err) {
    console.warn('读取视图模式失败:', err)
  }
  return 'card'
}

const viewMode = ref<'card' | 'table'>(getStoredViewMode())
const groupBy = ref<'none' | number | 'status' | 'location' | 'os'>('none')

// 分组选项
const groupOptions = computed(() => {
  const options: Array<{ label: string; value: 'none' | number | 'status' | 'location' | 'os' }> = [
    { label: '不分组', value: 'none' },
    { label: '按状态', value: 'status' },
    { label: '按地域', value: 'location' },
    { label: '按系统', value: 'os' },
  ]

  groups.value.forEach((group) => {
    options.push({ label: group.name, value: group.id })
  })

  return options
})

// 加载服务器分组列表
const loadGroups = async () => {
  try {
    const response = await serversApi.getGroups()
    if (response.status && response.data) {
      groups.value = response.data || []
    }
  } catch (err) {
    console.error('加载分组列表失败:', err)
  }
}

// 加载服务器列表
const loadServers = async () => {
  loading.value = true
  error.value = null
  try {
    const response = (await serversApi.getServers()) as GetServersResponse

    if (response.status && response.data) {
      servers.value = response.data.map((server) => mapServerListItemToServerItem(server))
    } else {
      throw new Error(response.message || '获取服务器列表失败')
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '获取服务器列表失败'
    error.value = errorMessage
    message.error(errorMessage, { duration: 3000 })
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
          download:
            data.network_download !== undefined ? data.network_download : server.networkIO.download,
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
        architecture:
          data.data.architecture !== undefined ? data.data.architecture : server.architecture,
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

watch(
  viewMode,
  (newValue) => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, newValue)
    } catch (err) {
      console.warn('保存视图模式失败:', err)
    }
  },
  { immediate: false },
)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    initializing.value = true
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (!authStore.isAuthenticated) {
      await router.push({
        name: 'login',
        query: { redirect_uri: router.currentRoute.value.fullPath },
      })
      return
    }
    initializing.value = false
  }

  await Promise.all([loadServers(), loadGroups()])
  websocket.connect()
})

onUnmounted(() => {
  websocket.disconnect()
})

// 类型守卫函数
const isNumberGroup = (value: 'none' | number | 'status' | 'location' | 'os'): value is number => {
  return typeof value === 'number'
}

// 分组计算属性
const groupedServers = computed(() => {
  if (groupBy.value === 'none') {
    return { 全部: servers.value }
  }

  const grouped: Record<string, ServerItem[]> = {}
  const currentGroupBy = groupBy.value

  // 如果 groupBy 是数字，表示按具体分组 ID 分组
  if (isNumberGroup(currentGroupBy)) {
    const selectedGroup = groups.value.find((g) => g.id === currentGroupBy)
    if (selectedGroup) {
      servers.value.forEach((server) => {
        if (server.group_id === currentGroupBy) {
          if (!grouped[selectedGroup.name]) {
            grouped[selectedGroup.name] = []
          }
          grouped[selectedGroup.name].push(server)
        }
      })
      // 确保分组显示
      if (!grouped[selectedGroup.name]) {
        grouped[selectedGroup.name] = []
      }
    }
    return grouped
  }

  // 其他分组方式
  servers.value.forEach((server) => {
    let key: string
    switch (currentGroupBy) {
      case 'status':
        key = getStatusText(server.status)
        break
      case 'location':
        key = server.location || '未知地域'
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

// 获取分组颜色
const getGroupColor = (groupName: string): string | undefined => {
  if (isNumberGroup(groupBy.value)) {
    const group = groups.value.find((g) => g.name === groupName)
    return group?.color
  }
  return undefined
}
</script>
<template>
  <div class="w-full">
    <!-- 初始化状态 -->
    <div v-if="initializing" class="flex justify-center py-12">
      <n-spin size="large" description="正在初始化..." />
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <!-- 错误状态 -->
    <n-result v-else-if="error && !initializing" status="error" :title="error" class="py-12">
      <template #footer>
        <n-button @click="loadServers">重试</n-button>
      </template>
    </n-result>

    <!-- 空数据状态 -->
    <n-empty
      v-else-if="servers.length === 0 && !initializing"
      description="暂无服务器"
      class="py-12"
    />

    <!-- 主要内容 -->
    <div v-else-if="!initializing" class="space-y-6">
      <!-- 工具栏 -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold text-color">总览</h2>
          <span class="text-sm text-muted-color">({{ servers.length }} 台)</span>
        </div>
        <div class="flex items-center gap-3 group-type">
          <n-select
            v-model:value="groupBy"
            :options="groupOptions"
            size="small"
            placeholder="分组方式"
            style="width: 140px"
          />
          <n-radio-group v-model:value="viewMode" size="small">
            <n-radio-button value="card">
              <ri-layout-grid-line size="14px" />
            </n-radio-button>
            <n-radio-button value="table">
              <ri-list-check size="14px" />
            </n-radio-button>
          </n-radio-group>
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-if="viewMode === 'table'">
        <template v-if="groupBy === 'none'">
          <ServerTable :servers="servers" />
        </template>
        <template v-else>
          <div
            v-for="(groupServers, groupName) in groupedServers"
            :key="groupName"
            class="mb-6 space-y-3"
          >
            <GroupHeader
              :group-name="groupName"
              :count="groupServers.length"
              :color="getGroupColor(groupName)"
            />
            <ServerTable :servers="groupServers" />
          </div>
        </template>
      </div>

      <!-- 卡片视图 -->
      <div v-else>
        <template v-if="groupBy === 'none'">
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
          >
            <ServerCard v-for="server in servers" :key="server.id" v-bind="server" />
          </div>
        </template>
        <template v-else>
          <div
            v-for="(groupServers, groupName) in groupedServers"
            :key="groupName"
            class="mb-6 space-y-4"
          >
            <GroupHeader
              :group-name="groupName"
              :count="groupServers.length"
              :color="getGroupColor(groupName)"
            />
            <div
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
            >
              <ServerCard v-for="server in groupServers" :key="server.id" v-bind="server" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<style scoped>
.group-type :deep(.n-radio__label) {
  height: 100%;
  display: flex;
  align-items: center;
}
</style>
