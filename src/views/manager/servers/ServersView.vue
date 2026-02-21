<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import ServerTable from './components/ServerTable.vue'
import ServerDialog from './components/ServerDialog.vue'
import ServerGroupDialog from './components/ServerGroupDialog.vue'
import ServerGroupManager from './components/ServerGroupManager.vue'
import InstallInfo from './components/InstallInfo.vue'
import CopyAlertRulesDialog from './components/CopyAlertRulesDialog.vue'
import serversApi from '@/apis/servers'
import type { ServerGroup } from '@/types/manager/servers'
import updateApi from '@/apis/update'
import { useWebSocket } from '@/composables/useWebSocket'
import type { VersionType } from '@/utils/version.ts'
import type {
  Server,
  ServerForm,
  CreateServerResponse,
  GetServersResponse,
  DeleteServerResponse,
  UpdateServerResponse,
  RestartServiceResponse,
  ServerListItemData,
} from '@/types/manager/servers'
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiFileCodeLine,
  RiFileCopyFill,
  RiFileCopyLine,
  RiFolderLine,
  RiInformationLine,
  RiSearchLine,
} from '@remixicon/vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const saving = ref(false)
const filterLoading = ref(false)
const deletingServerId = ref<string>('')
const restartingServerId = ref<string>('')
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const groupFilter = ref<number | null>(null)
const showAddDialog = ref(false)
const showGroupDialog = ref(false)
const showGroupManager = ref(false)
const editingGroup = ref<ServerGroup | null>(null)
const groups = ref<ServerGroup[]>([])
const editingServer = ref<Server | null>(null)
const serverTableRef = ref<InstanceType<typeof ServerTable> | null>(null)
const selectedServers = ref<Server[]>([])
const showCopyAlertRulesDialog = ref(false)

// 表单数据
const serverForm = ref<ServerForm>({
  name: '',
  ip: '',
  status: 'online',
  location: '',
  os: '',
  architecture: '',
  kernel: '',
  hostname: '',
})

const message = useMessage()

// 服务器数据
const servers = ref<Server[]>([])
const agentKeyDialog = ref(false)
const generatedAgentKey = ref('')
const serverIP = ref('')
const websocketURL = ref('')

// 查看安装信息对话框
const showInstallInfoDialog = ref(false)
const selectedServerForInstall = ref<Server | null>(null)

// Agent 最新版本信息
const latestAgentVersion = ref<string>('')
const latestAgentVersionType = ref<VersionType>('release')

// WebSocket连接
const websocket = useWebSocket({
  onMetricsUpdate: (data) => {
    const server = servers.value.find((s) => s.id === data.server_id)
    if (server) {
      if (data.cpu_usage !== undefined) server.cpu = data.cpu_usage
      if (data.memory_usage !== undefined) server.memory = data.memory_usage
      if (data.disk_usage !== undefined) server.disk = data.disk_usage
      if (data.network_upload !== undefined || data.network_download !== undefined) {
        server.networkIO = {
          upload: data.network_upload ?? 0,
          download: data.network_download ?? 0,
        }
      }
      if (data.uptime !== undefined) server.uptime = data.uptime
    }
  },
  onMetricsRealtime: () => {
    // 实时指标在列表页仅更新列表数据；详情页可单独订阅
  },
  onSystemInfoUpdate: (data) => {
    const server = servers.value.find((s) => s.id === data.server_id)
    if (server && data.data) {
      if (data.data.os !== undefined) server.os = data.data.os
      if (data.data.architecture !== undefined) server.architecture = data.data.architecture
      if (data.data.kernel !== undefined) server.kernel = data.data.kernel
      if (data.data.hostname !== undefined) server.hostname = data.data.hostname
    }
  },
  onSwapInfoUpdate: (data) => {
    const server = servers.value.find((s) => s.id === data.server_id)
    if (server && data.swap) {
      server.swapInfo = {
        swap_total: data.swap.swap_total ?? 0,
        swap_used: data.swap.swap_used ?? 0,
        swap_free: data.swap.swap_free ?? 0,
        swap_usage_percent: data.swap.swap_usage_percent ?? 0,
      }
    }
  },
  onServerStatusUpdate: (data) => {
    const server = servers.value.find((s) => s.id === data.server_id)
    if (server && data.status) {
      server.status = data.status
    }
  },
  onProcessInfoUpdate: (data) => {
    const server = servers.value.find((s) => s.id === data.server_id)
    if (server && data.data) {
      server.process_status = {}
      for (const [name, info] of Object.entries(data.data)) {
        server.process_status[name] = {
          name,
          running: info.running,
          pids: info.pids,
          cpu: info.cpu,
          memory: info.memory,
        }
      }
    }
  },
  onGPUInfoUpdate: (data) => {
    const server = servers.value.find((s) => s.id === data.server_id)
    if (server && data.gpuInfo) {
      server.gpuInfo = data.gpuInfo
    }
  },
})

// 加载分组列表
const loadGroups = async () => {
  try {
    const response = await serversApi.getGroups()
    if (response.status && response.data) {
      groups.value = response.data || []
    }
  } catch (error) {
    console.error('加载分组列表失败:', error)
  }
}

// 过滤后的服务器
const filteredServers = computed(() => {
  let filtered = servers.value

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(
      (server) =>
        server.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        server.ip.includes(searchQuery.value) ||
        server.location.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  // 状态过滤
  if (statusFilter.value && statusFilter.value !== 'all') {
    filtered = filtered.filter((server) => server.status === statusFilter.value)
  }

  // 分组过滤
  if (groupFilter.value !== null) {
    filtered = filtered.filter((server) => server.group_id === groupFilter.value)
  }

  return filtered
})

const handleEditServer = (server: Server) => {
  editingServer.value = server
  showAddDialog.value = true
}

const handleDeleteServer = async (server: Server) => {
  deletingServerId.value = server.id
  try {
    const response = (await serversApi.deleteServer(server.id)) as DeleteServerResponse

    if (response.status) {
      const index = servers.value.findIndex((s) => s.id === server.id)
      if (index !== -1) {
        servers.value.splice(index, 1)
      }

      message.success(`服务器 "${server.name}" 已删除`, { duration: 3000 })
    } else {
      throw new Error(response.message || '删除失败')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '请稍后重试'
    message.error(errorMessage, { duration: 3000 })
  } finally {
    deletingServerId.value = ''
  }
}

const handleRestartServer = async (server: Server) => {
  restartingServerId.value = server.id
  try {
    const response = (await serversApi.restartService(server.id)) as RestartServiceResponse

    if (response.status) {
      message.success(`服务器 "${server.name}" 的重启命令已发送`, { duration: 3000 })
    } else {
      throw new Error(response.message || '重启失败')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '请稍后重试'
    message.error(errorMessage, { duration: 3000 })
  } finally {
    restartingServerId.value = ''
  }
}

const handleSaveServer = async (form: ServerForm) => {
  saving.value = true

  try {
    if (editingServer.value) {
      // 更新服务器
      const response = (await serversApi.updateServer(
        editingServer.value.id,
        form,
      )) as UpdateServerResponse

      if (response.status) {
        await loadServers()
        message.success('服务器信息已更新', { duration: 3000 })
        // 如果对话框仍然打开，触发重新加载
        if (showAddDialog.value && editingServer.value) {
          handleSaveSuccess()
        }
      } else {
        throw new Error(response.message || '更新失败')
      }
    } else {
      // 添加新服务器
      const response = (await serversApi.createServer(form)) as CreateServerResponse
      if (response.status && response.data) {
        generatedAgentKey.value = response.data.agent_key
        serverIP.value = response.data.ip

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        websocketURL.value = `${protocol}//${host}/api/ws/agent`

        await loadServers()

        message.success('新服务器已添加', { duration: 3000 })

        // 显示agent_key对话框
        agentKeyDialog.value = true
      } else {
        throw new Error(response.message || '添加失败')
      }
    }

    showAddDialog.value = false
    resetForm()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '请稍后重试'
    message.error(errorMessage, { duration: 3000 })
  } finally {
    saving.value = false
  }
}

// 分组管理
const handleCreateGroup = () => {
  editingGroup.value = null
  showGroupDialog.value = true
}

const handleEditGroup = (group: ServerGroup) => {
  editingGroup.value = group
  showGroupDialog.value = true
}

const handleGroupSuccess = async () => {
  await loadGroups()
  await loadServers()
}

const loadServers = async () => {
  try {
    const response = (await serversApi.getServers()) as GetServersResponse

    if (response.status && response.data) {
      servers.value = response.data.map((server) => {
        interface ServerWithMetrics extends ServerListItemData {
          metrics?: {
            cpu_usage?: number
            memory_usage?: number
            disk_usage?: number
            network_upload?: number
            network_download?: number
          }
        }
        const serverWithMetrics = server as ServerWithMetrics
        const metrics = serverWithMetrics.metrics || {}
        const cpu = typeof metrics.cpu_usage === 'number' ? metrics.cpu_usage : 0
        const memory = typeof metrics.memory_usage === 'number' ? metrics.memory_usage : 0
        const disk = typeof metrics.disk_usage === 'number' ? metrics.disk_usage : 0
        const networkUpload =
          typeof metrics.network_upload === 'number' ? metrics.network_upload : 0
        const networkDownload =
          typeof metrics.network_download === 'number' ? metrics.network_download : 0

        return {
          id: server.id,
          name: server.name,
          ip: server.ip,
          status: server.status || 'offline',
          location: server.location || '',
          os: server.os || '',
          architecture: server.architecture || '',
          kernel: '',
          hostname: '',
          uptime: server.uptime || '0天0时0分',
          group_id: server.group_id,
          group: server.group,
          billing_cycle: server.billing_cycle,
          custom_cycle_days: server.custom_cycle_days,
          price: server.price,
          expire_time: server.expire_time,
          bandwidth_mbps: server.bandwidth_mbps,
          traffic_limit_type: server.traffic_limit_type,
          traffic_limit_bytes: server.traffic_limit_bytes,
          traffic_reset_cycle: server.traffic_reset_cycle,
          traffic_custom_cycle_days: server.traffic_custom_cycle_days,
          cpu,
          memory,
          disk,
          networkIO: { upload: networkUpload, download: networkDownload },
          agent_key: server.agent_key,
          agent_version: server.agent_version || '',
          process_status: server.service_status || {},
          createdAt: server.created_at || '',
          updatedAt: server.updated_at || '',
          _detailLoaded: false, // 标记详细信息是否已加载
        }
      })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取服务器列表失败'
    message.error(errorMessage, { duration: 3000 })
  }
}

// 处理查看安装信息
const handleViewInstallInfo = (server: Server) => {
  selectedServerForInstall.value = server
  showInstallInfoDialog.value = true
}

const handleCancelDialog = () => {
  showAddDialog.value = false
  resetForm()
}

const resetForm = () => {
  serverForm.value = {
    name: '',
    ip: '',
    status: 'online',
    location: '',
    os: '',
    architecture: '',
    kernel: '',
    hostname: '',
  }
  editingServer.value = null
}

// 监听筛选状态变化
watch(statusFilter, async (newValue, oldValue) => {
  if (oldValue !== undefined && newValue !== oldValue) {
    filterLoading.value = false
  }
})

// 监听 URL 参数 ?server=id，跳转到详情页
watch(
  () => route.query.server,
  (serverId) => {
    if (serverId && typeof serverId === 'string') {
      router.replace({ path: `/servers/${serverId}` })
    }
  },
  { immediate: false },
)

// 获取 Agent 最新版本信息
const loadAgentVersion = async () => {
  try {
    const response = (await updateApi.checkAgentVersion()) as {
      status: boolean
      data?: {
        latest_version?: string
        latest_version_type?: VersionType
      }
    }
    if (response.status && response.data) {
      latestAgentVersion.value = response.data.latest_version || ''
      latestAgentVersionType.value = response.data.latest_version_type || 'release'
    }
  } catch (error) {
    // 静默失败，不影响主功能
    console.warn('获取 Agent 最新版本信息失败:', error)
  }
}

// 处理选中服务器变化
const handleSelectionChange = (servers: Server[]) => {
  selectedServers.value = servers
}

// 检查是否可以复制告警规则（只选择了一个服务器）
const canCopyAlertRules = computed(() => {
  return selectedServers.value.length === 1
})

// 处理复制告警规则成功
const handleCopyAlertRulesSuccess = () => {
  selectedServers.value = []
  // 可以刷新服务器列表以获取最新数据
}

// 处理保存成功
const handleSaveSuccess = async () => {
  // 如果对话框仍然打开，重新加载服务器列表和详情
  if (showAddDialog.value && editingServer.value) {
    await loadServers()
    const updatedServer = servers.value.find((s) => s.id === editingServer.value!.id)
    if (updatedServer) {
      // 创建一个新对象，确保触发 watch
      editingServer.value = { ...updatedServer }
    }
  }
}

const handleUpdateAgent = async (server: Server) => {
  message.info(`服务器 "${server.name}" 的 Agent 正在更新中...`, { duration: 3000 })
}

onMounted(async () => {
  loading.value = true
  await loadGroups()
  await loadServers()
  await loadAgentVersion()
  websocket.connect()

  const serverId = route.query.server
  if (serverId && typeof serverId === 'string') {
    router.replace({ path: `/servers/${serverId}` })
  }

  loading.value = false
})
</script>

<template>
  <div class="servers-view">
    <div class="mb-6 flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">服务器管理</h1>
        <p class="text-muted-color">管理和监控所有服务器节点</p>
      </div>
      <div class="flex gap-2">
        <n-button secondary @click="showGroupManager = true">
          <template #icon>
            <ri-folder-line />
          </template>
          分组管理
        </n-button>
        <n-button secondary @click="handleCreateGroup">
          <template #icon>
            <ri-add-line />
          </template>
          创建分组
        </n-button>
        <n-button type="primary" @click="showAddDialog = true">
          <template #icon>
            <ri-add-line />
          </template>
          添加服务器
        </n-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="mb-2 flex gap-2 items-center flex-wrap">
      <div class="flex-1 min-w-[200px]">
        <n-input v-model:value="searchQuery" placeholder="搜索服务器名称、IP或地域..." clearable />
      </div>
      <n-select
        v-model:value="statusFilter"
        :options="[
          { label: '全部状态', value: 'all' },
          { label: '在线', value: 'online' },
          { label: '离线', value: 'offline' },
          { label: '错误', value: 'error' },
        ]"
        placeholder="筛选状态"
        style="width: 150px"
      />
      <n-select
        v-model:value="groupFilter"
        :options="[
          { label: '全部分组', value: null },
          ...groups.map((g) => ({ label: g.name, value: g.id })),
        ]"
        placeholder="筛选分组"
        style="width: 150px"
      />
    </div>

    <!-- 选中服务器操作栏 -->
    <div
      v-if="selectedServers.length > 0"
      class="mb-4 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-color"
          >已选择 {{ selectedServers.length }} 个服务器</span
        >
      </div>
      <div class="flex items-center gap-2">
        <n-button
          size="small"
          type="primary"
          :disabled="!canCopyAlertRules"
          @click="showCopyAlertRulesDialog = true"
        >
          <template #icon>
            <ri-file-copy-line />
          </template>
          复制告警规则到
        </n-button>
        <n-button size="small" secondary @click="selectedServers = []">
          <template #icon>
            <ri-close-line />
          </template>
          取消选择
        </n-button>
      </div>
    </div>

    <div class="space-y-6">
      <ServerTable
        ref="serverTableRef"
        :servers="filteredServers"
        :loading="loading || filterLoading"
        :deleting-server-id="deletingServerId"
        :restarting-server-id="restartingServerId"
        :latest-agent-version="latestAgentVersion"
        :latest-agent-version-type="latestAgentVersionType"
        :selected-servers="selectedServers"
        @edit-server="handleEditServer"
        @delete-server="handleDeleteServer"
        @restart-server="handleRestartServer"
        @view-install-info="handleViewInstallInfo"
        @update-agent="handleUpdateAgent"
        @selection-change="handleSelectionChange"
      />
    </div>

    <!-- 复制告警规则对话框 -->
    <copy-alert-rules-dialog
      v-model:visible="showCopyAlertRulesDialog"
      :source-servers="selectedServers"
      :all-servers="servers"
      @success="handleCopyAlertRulesSuccess"
    />

    <!-- 分组管理对话框 -->
    <server-group-manager
      v-model:visible="showGroupManager"
      :servers="servers"
      @refresh="handleGroupSuccess"
      @edit-group="handleEditGroup"
    />

    <!-- 创建/编辑分组对话框 -->
    <server-group-dialog
      v-model:visible="showGroupDialog"
      :group="editingGroup"
      @success="handleGroupSuccess"
    />

    <server-dialog
      v-model:visible="showAddDialog"
      v-model:form="serverForm"
      :editing-server="editingServer"
      :saving="saving"
      @save="handleSaveServer"
      @save-success="handleSaveSuccess"
      @cancel="handleCancelDialog"
      @restart-server="handleRestartServer"
    />

    <!-- Agent Key和安装命令显示对话框 -->
    <n-modal v-model:show="agentKeyDialog" :mask-closable="true">
      <n-card
        style="width: 700px; max-width: 95vw"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <ri-check-line class-name="text-green-600 dark:text-green-400 text-2xl mt-0.5" />
            <h4 class="font-medium text-green-700 dark:text-green-300">添加成功</h4>
          </div>
        </template>
        <div class="space-y-4">
          <p class="font-medium mb-4">服务器已成功添加！请保存以下信息：</p>
          <InstallInfo
            :agent-key="generatedAgentKey"
            :server-i-p="serverIP"
            :websocket-u-r-l="websocketURL"
          />
          <n-alert type="info">
            <ul class="space-y-1">
              <li>• 在目标Linux服务器上执行上述安装命令</li>
              <li>• 安装完成后，探针会自动连接到控制中心</li>
              <li>• 系统信息（地域、操作系统等）将自动获取</li>
              <li>• 请妥善保管Agent Key避免泄露，此Agent Key用于服务器之间身份验证</li>
            </ul>
          </n-alert>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <n-button type="primary" @click="agentKeyDialog = false" class="px-6 py-2">
              <template #icon>
                <ri-check-line />
              </template>
              我已保存
            </n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
.servers-view {
  margin: 0 auto;
}
</style>
