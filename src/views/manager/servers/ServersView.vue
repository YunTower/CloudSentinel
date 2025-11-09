<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useToast } from 'primevue/usetoast'
import ServerTable from './components/ServerTable.vue'
import ServerDialog from './components/ServerDialog.vue'
import serversApi from '@/apis/servers'
import { useWebSocket } from '@/composables/useWebSocket'
import type {
  Server,
  ServerForm,
  ServerDetailResponse,
  ExtendedServerDetailData,
  CreateServerResponse,
  GetServersResponse,
  DeleteServerResponse,
  UpdateServerResponse,
  RestartServerResponse,
} from '@/types/manager/servers'

const loading = ref(false)
const saving = ref(false)
const filterLoading = ref(false)
const expandingServerId = ref<string>('')
const deletingServerId = ref<string>('')
const restartingServerId = ref<string>('')
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const showAddDialog = ref(false)
const editingServer = ref<Server | null>(null)
const serverTableRef = ref<InstanceType<typeof ServerTable> | null>(null)

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
})

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
    const response = (await serversApi.restartServer(server.id)) as RestartServerResponse

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

const loadServers = async () => {
  loading.value = true
  try {
    const response = (await serversApi.getServers()) as GetServersResponse

    if (response.status && response.data) {
      servers.value = response.data.map((server) => ({
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
        cpu: 0,
        memory: 0,
        disk: 0,
        networkIO: { upload: 0, download: 0 },
        agent_key: server.agent_key,
        createdAt: server.created_at || '',
        updatedAt: server.updated_at || '',
        _detailLoaded: false, // 标记详细信息是否已加载
      }))
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
  if (detailWithUptime.traffic) {
    server.traffic = detailWithUptime.traffic
  }

  server._detailLoaded = true
}

const copyAgentKey = async () => {
  try {
    await navigator.clipboard.writeText(generatedAgentKey.value)
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: 'Agent Key已复制到剪贴板',
      life: 2000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制Agent Key',
      life: 3000,
    })
  }
}

const installCommand = computed(() => {
  if (selectedServerForInstall.value) {
    const server = selectedServerForInstall.value
    if (!server.agent_key) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/agent`
    const installScriptURL = window.location.origin + '/install.sh'
    return `curl -fsSL ${installScriptURL} | bash -s -- --server=${wsUrl} --key=${server.agent_key}`
  }
  if (!generatedAgentKey.value || !serverIP.value) return ''
  const installScriptURL = window.location.origin + '/install.sh'
  return `curl -fsSL ${installScriptURL} | bash -s -- --server=${websocketURL.value} --key=${generatedAgentKey.value}`
})

// 处理查看安装脚本
// 处理查看安装信息
const handleViewInstallInfo = (server: Server) => {
  selectedServerForInstall.value = server
  showInstallInfoDialog.value = true
}

const copySelectedAgentKey = async () => {
  if (!selectedServerForInstall.value?.agent_key) {
    toast.add({
      severity: 'warn',
      summary: '无法复制',
      detail: 'Agent Key 不存在',
      life: 2000,
    })
    return
  }
  try {
    await navigator.clipboard.writeText(selectedServerForInstall.value.agent_key)
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: 'Agent Key已复制到剪贴板',
      life: 2000,
    })
  } catch (error) {
    console.error('复制失败:', error)
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制Agent Key',
      life: 3000,
    })
  }
}

const copySelectedInstallCommand = async () => {
  try {
    await navigator.clipboard.writeText(installCommand.value)
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: '安装命令已复制到剪贴板',
      life: 2000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制安装命令',
      life: 3000,
    })
  }
}

const copyInstallCommand = async () => {
  try {
    await navigator.clipboard.writeText(installCommand.value)
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: '安装命令已复制到剪贴板',
      life: 2000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制安装命令',
      life: 3000,
    })
  }
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

onMounted(async () => {
  await loadServers()
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
      <Button
        label="添加服务器"
        icon="pi pi-plus"
        @click="showAddDialog = true"
        class="shadow-sm"
      />
    </div>

    <div class="space-y-6">
      <ServerTable
        ref="serverTableRef"
        :servers="filteredServers"
        :loading="loading || filterLoading"
        :expanding-server-id="expandingServerId"
        :deleting-server-id="deletingServerId"
        :restarting-server-id="restartingServerId"
        @edit-server="handleEditServer"
        @delete-server="handleDeleteServer"
        @restart-server="handleRestartServer"
        @expand-server="handleExpandServer"
        @view-install-info="handleViewInstallInfo"
      />
    </div>

    <ServerDialog
      v-model:visible="showAddDialog"
      v-model:form="serverForm"
      :editing-server="editingServer"
      :saving="saving"
      @save="handleSaveServer"
      @cancel="handleCancelDialog"
    />

    <!-- Agent Key和安装命令显示对话框 -->
    <Dialog
      v-model:visible="agentKeyDialog"
      header="服务器添加成功"
      modal
      :closable="true"
      class="w-3xl"
    >
      <div class="space-y-4">
        <!-- Agent Key -->
        <div
          class="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-2xl mt-0.5"></i>
            <div class="flex-1">
              <p class="font-medium text-green-700 dark:text-green-300 mb-2">
                服务器已成功添加！请保存以下Agent Key：
              </p>
              <div
                class="bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm break-all"
              >
                {{ generatedAgentKey }}
              </div>
              <Button
                icon="pi pi-copy"
                label="复制Agent Key"
                text
                size="small"
                class="mt-2"
                @click="copyAgentKey"
              />
            </div>
          </div>
        </div>

        <!-- 安装命令 -->
        <div
          class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-terminal text-primary"></i>
              <h4 class="text-lg font-semibold text-color">Linux 安装命令</h4>
            </div>
            <Button
              icon="pi pi-copy"
              text
              size="small"
              @click="copyInstallCommand"
              v-tooltip.top="'复制命令'"
            />
          </div>
          <code
            class="block bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm break-all whitespace-pre-wrap"
          >
            {{ installCommand }}
          </code>

          <div
            class="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <div class="flex items-start gap-2">
              <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-0.5"></i>
              <div class="text-sm text-blue-700 dark:text-blue-300">
                <p class="font-medium mb-1">安装说明</p>
                <ul class="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• 在目标Linux服务器上执行上述安装命令</li>
                  <li>• 安装完成后，探针会自动连接到控制中心</li>
                  <li>• 系统信息（位置、操作系统等）将自动获取</li>
                  <li>• 请妥善保管Agent Key，用于服务器身份验证</li>
                </ul>
              </div>
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

    <!-- 查看安装信息对话框 -->
    <Dialog
      v-model:visible="showInstallInfoDialog"
      header="安装信息"
      modal
      :closable="true"
      class="w-3xl"
    >
      <div class="space-y-4" v-if="selectedServerForInstall">
        <!-- 连接密钥 -->
        <div class="mb-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="font-medium text-color whitespace-nowrap">连接密钥 (Agent Key):</span>
              <code
                class="block bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-1 rounded font-mono text-sm break-all whitespace-pre-wrap"
                >{{ selectedServerForInstall.agent_key || '未设置' }}</code
              >
            </div>
            <Button
              icon="pi pi-copy"
              text
              size="small"
              @click.stop="copySelectedAgentKey"
              v-tooltip.top="'复制密钥'"
              class="flex-shrink-0"
            />
          </div>
        </div>

        <!-- 安装命令 -->
        <div
          class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-terminal text-primary"></i>
              <h4 class="text-lg font-semibold text-color">Linux 安装命令</h4>
            </div>
            <Button
              icon="pi pi-copy"
              text
              size="small"
              @click="copySelectedInstallCommand"
              v-tooltip.top="'复制命令'"
            />
          </div>
          <div class="space-y-3">
            <code
              class="block bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm break-all whitespace-pre-wrap"
            >
              {{ installCommand || '无法生成安装命令：缺少Agent Key' }}
            </code>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.servers-view {
  padding: 2rem;
  margin: 0 auto;
}
</style>
