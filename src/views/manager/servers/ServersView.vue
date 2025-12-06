<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useToast } from 'primevue/usetoast'
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
  ServerDetailResponse,
  ExtendedServerDetailData,
  CreateServerResponse,
  GetServersResponse,
  DeleteServerResponse,
  UpdateServerResponse,
  RestartServiceResponse,
  ServerListItemData,
} from '@/types/manager/servers'

const loading = ref(false)
const saving = ref(false)
const filterLoading = ref(false)
const expandingServerId = ref<string>('')
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
  port: 22,
  status: 'online',
  location: '',
  os: '',
  architecture: '',
  kernel: '',
  hostname: '',
})

const toast = useToast()

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
  onMetricsRealtime: (data) => {
    if (serverTableRef.value) {
      serverTableRef.value.addRealtimeDataPoint(data.server_id, {
        timestamp: data.timestamp,
        cpu_usage: data.cpu_usage,
        memory_usage: data.memory_usage,
        disk_usage: data.disk_usage,
        disk_read: data.disk_read,
        disk_write: data.disk_write,
        network_upload: data.network_upload,
        network_download: data.network_download,
      })
    }
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

      toast.add({
        severity: 'success',
        summary: '删除成功',
        detail: `服务器 "${server.name}" 已删除`,
        life: 3000,
      })
    } else {
      throw new Error(response.message || '删除失败')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '请稍后重试'
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: errorMessage,
      life: 3000,
    })
  } finally {
    deletingServerId.value = ''
  }
}

const handleRestartServer = async (server: Server) => {
  restartingServerId.value = server.id
  try {
    const response = (await serversApi.restartService(server.id)) as RestartServiceResponse

    if (response.status) {
      toast.add({
        severity: 'success',
        summary: '重启成功',
        detail: `服务器 "${server.name}" 的重启命令已发送`,
        life: 3000,
      })
    } else {
      throw new Error(response.message || '重启失败')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '请稍后重试'
    toast.add({
      severity: 'error',
      summary: '重启失败',
      detail: errorMessage,
      life: 3000,
    })
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
        toast.add({
          severity: 'success',
          summary: '更新成功',
          detail: '服务器信息已更新',
          life: 3000,
        })
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

        toast.add({
          severity: 'success',
          summary: '添加成功',
          detail: '新服务器已添加',
          life: 3000,
        })

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
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: errorMessage,
      life: 3000,
    })
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
  loading.value = true
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
          port: server.port || 22,
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
          createdAt: server.created_at || '',
          updatedAt: server.updated_at || '',
          _detailLoaded: false, // 标记详细信息是否已加载
        }
      })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取服务器列表失败'
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

// 加载服务器详细信息
const loadServerDetail = async (serverId: string) => {
  const server = servers.value.find((s) => s.id === serverId)
  if (!server) {
    return
  }

  const response = (await serversApi.getServerDetail(serverId)) as ServerDetailResponse
  if (!response.status || !response.data) {
    throw new Error(response.message || '获取服务器详细信息失败')
  }

  const detail = response.data
  // 更新服务器详细信息
  server.os = detail.os || ''
  server.architecture = detail.architecture || ''
  server.kernel = detail.kernel || ''
  server.hostname = detail.hostname || ''
  server.agent_key = detail.agent_key || ''

  // 使用后端计算的运行时间，否则使用uptime_days
  const detailWithUptime = detail as ExtendedServerDetailData
  server.uptime =
    detailWithUptime.uptime || (detail.uptime_days ? `${detail.uptime_days}天` : '0天0时0分')

  // 更新新增的字段
  if (detailWithUptime.disks) {
    server.disks = detailWithUptime.disks
  }
  if (detailWithUptime.cpus) {
    server.cpus = detailWithUptime.cpus
  }
  if (detailWithUptime.memory) {
    server.memoryInfo = detailWithUptime.memory
  }
  if (detailWithUptime.swap) {
    server.swapInfo = detailWithUptime.swap
  }
  if (detailWithUptime.traffic) {
    server.traffic = detailWithUptime.traffic
  }

  server._detailLoaded = true
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
    port: 22,
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

// 监听URL参数变化
watch(
  () => window.location.search,
  (newSearch) => {
    const urlParams = new URLSearchParams(newSearch)
    const serverId = urlParams.get('server')
    if (serverId && serverTableRef.value) {
      // 清除之前的展开状态
      expandingServerId.value = ''
      // 展开新的服务器
      nextTick(() => {
        serverTableRef.value?.autoExpandServer(serverId)
      })
    }
  },
  { immediate: false },
)

// 展开详情处理
const handleExpandServer = async (serverId: string) => {
  const server = servers.value.find((s) => s.id === serverId)
  if (!server) {
    return
  }

  // 如果数据已加载过，先展开显示现有数据，然后后台刷新
  const hasData = server._detailLoaded

  // 设置 loading 状态
  if (!hasData) {
    expandingServerId.value = serverId
  }

  try {
    await loadServerDetail(serverId)
    if (serverTableRef.value && 'confirmExpand' in serverTableRef.value) {
      await (
        serverTableRef.value as { confirmExpand: (id: string) => Promise<void> }
      ).confirmExpand(serverId)
    }
  } catch (error: unknown) {
    if (!hasData) {
      if (serverTableRef.value && 'cancelExpand' in serverTableRef.value) {
        ;(serverTableRef.value as { cancelExpand: (id: string) => void }).cancelExpand(serverId)
      }
    }

    const errorMessage = error instanceof Error ? error.message : '获取服务器详细信息失败'
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: errorMessage,
      life: 3000,
    })
  } finally {
    expandingServerId.value = ''
  }
}

// 获取 Agent 最新版本信息
const loadAgentVersion = async () => {
  try {
    const response = (await updateApi.checkAgentVersion('github')) as {
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

// 处理 Agent 更新
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
  // 更新后可以刷新服务器列表以获取最新版本号
  // 这里可以选择是否刷新
  toast.add({
    severity: 'info',
    summary: '更新中',
    detail: `服务器 "${server.name}" 的 Agent 正在更新中...`,
    life: 3000,
  })
}

onMounted(async () => {
  await loadGroups()
  await loadServers()
  await loadAgentVersion()
  websocket.connect()

  const urlParams = new URLSearchParams(window.location.search)
  const serverId = urlParams.get('server')
  if (serverId) {
    await nextTick(() => {
      if (serverTableRef.value) {
        serverTableRef.value.autoExpandServer(serverId)
      }
    })
  }
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
        <Button
          label="分组管理"
          icon="pi pi-folder"
          severity="secondary"
          @click="showGroupManager = true"
        />
        <Button
          label="创建分组"
          icon="pi pi-plus"
          severity="secondary"
          @click="handleCreateGroup"
        />
      <Button
        label="添加服务器"
        icon="pi pi-plus"
        @click="showAddDialog = true"
        />
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="mb-4 flex gap-4 items-center flex-wrap">
      <div class="flex-1 min-w-[200px]">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="搜索服务器名称、IP或地域..."
            class="w-full"
          />
        </IconField>
      </div>
      <Select
        v-model="statusFilter"
        :options="[
          { label: '全部状态', value: 'all' },
          { label: '在线', value: 'online' },
          { label: '离线', value: 'offline' },
          { label: '错误', value: 'error' },
        ]"
        option-label="label"
        option-value="value"
        placeholder="筛选状态"
        class="w-[150px]"
      />

      <Select
        v-model="groupFilter"
        :options="[
          { label: '全部分组', value: null },
          ...groups.map((g) => ({ label: g.name, value: g.id })),
        ]"
        option-label="label"
        option-value="value"
        placeholder="筛选分组"
        class="w-[150px]"
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
        <Button
          label="复制告警规则到"
          icon="pi pi-copy"
          size="small"
          :disabled="!canCopyAlertRules"
          @click="showCopyAlertRulesDialog = true"
        />
        <Button
          label="取消选择"
          icon="pi pi-times"
          size="small"
          severity="secondary"
          outlined
          @click="selectedServers = []"
        />
      </div>
    </div>

    <div class="space-y-6">
      <ServerTable
        ref="serverTableRef"
        :servers="filteredServers"
        :loading="loading || filterLoading"
        :expanding-server-id="expandingServerId"
        :deleting-server-id="deletingServerId"
        :restarting-server-id="restartingServerId"
        :latest-agent-version="latestAgentVersion"
        :latest-agent-version-type="latestAgentVersionType"
        :selected-servers="selectedServers"
        @edit-server="handleEditServer"
        @delete-server="handleDeleteServer"
        @restart-server="handleRestartServer"
        @expand-server="handleExpandServer"
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
    <Dialog v-model:visible="agentKeyDialog" modal :closable="true" class="w-3xl">
      <template #header>
        <div class="flex items-center gap-3">
          <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-2xl mt-0.5"></i>
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
          <div class="mt-4 p-3 border rounded-lg">
            <div class="flex items-start gap-2">
              <div>
                <p class="font-medium mb-1 gap-2">
                  <i class="pi pi-info-circle mt-0.5 mr-2"></i>
                  <span class="font-bold">安装说明</span>
                </p>
                <ul class="space-y-1">
                  <li>• 在目标Linux服务器上执行上述安装命令</li>
                  <li>• 安装完成后，探针会自动连接到控制中心</li>
                  <li>• 系统信息（地域、操作系统等）将自动获取</li>
                  <li>• 请妥善保管Agent Key避免泄露，此Agent Key用于服务器之间身份验证</li>
                </ul>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <Button
            label="我已保存"
            icon="pi pi-check"
            @click="agentKeyDialog = false"
            class="px-6 py-2"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.servers-view {
  padding: 2rem;
  margin: 0 auto;
}
</style>

