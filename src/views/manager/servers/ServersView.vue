<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useToast } from 'primevue/usetoast'
import ServerTable from './components/ServerTable.vue'
import ServerDialog from './components/ServerDialog.vue'
import serversApi from '@/apis/servers'
import type { Server, ServerForm } from '@/types/manager/servers'

// 响应式数据
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

// 组件引用
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

// 计算属性
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
    const response: any = await serversApi.deleteServer(server.id)

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
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: error.message || '请稍后重试',
      life: 3000,
    })
  } finally {
    deletingServerId.value = ''
  }
}

const handleRestartServer = async (server: Server) => {
  restartingServerId.value = server.id
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast.add({
      severity: 'success',
      summary: '重启成功',
      detail: `服务器 "${server.name}" 重启完成`,
      life: 3000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '重启失败',
      detail: '请稍后重试',
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
      const response: any = await serversApi.updateServer(editingServer.value.id, form)

      if (response.status) {
        // 重新加载服务器列表
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
      const response: any = await serversApi.createServer(form)

      if (response.status && response.data) {
        // 保存生成的agent_key和服务器IP
        generatedAgentKey.value = response.data.agent_key
        serverIP.value = response.data.ip

        // 获取WebSocket URL（从当前页面URL推断）
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        websocketURL.value = `${protocol}//${host}/api/ws/agent`

        // 重新加载服务器列表
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
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: error.message || '请稍后重试',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

const loadServers = async () => {
  loading.value = true
  try {
    const response: any = await serversApi.getServers()

    if (response.status && response.data) {
      servers.value = response.data.map((server: any) => ({
        id: server.id,
        name: server.name,
        ip: server.ip,
        port: server.port || 22,
        status: server.status || 'offline',
        location: server.location || '',
        os: server.os || '',
        architecture: server.architecture || '',
        kernel: server.kernel || '',
        hostname: server.hostname || '',
        uptime: server.uptime || '0天0时0分',
        cpu: 0, // 这些需要从性能指标表获取，暂时设为0
        memory: 0,
        disk: 0,
        networkIO: { upload: 0, download: 0 },
        agent_key: server.agent_key,
        createdAt: server.created_at || '',
        updatedAt: server.updated_at || '',
      }))
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: error.message || '获取服务器列表失败',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
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
  if (!generatedAgentKey.value || !serverIP.value) return ''
  // 这里需要根据实际的安装脚本URL来生成命令
  // 暂时使用占位符，实际应该从配置或环境变量获取
  const installScriptURL = window.location.origin + '/install.sh'
  return `curl -fsSL ${installScriptURL} | bash -s -- --server=${websocketURL.value} --key=${generatedAgentKey.value}`
})

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
    filterLoading.value = true
    // 模拟筛选加载延迟
    await new Promise((resolve) => setTimeout(resolve, 300))
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
      // 自动展开新的服务器
      nextTick(() => {
        serverTableRef.value?.autoExpandServer(serverId)
      })
    }
  },
  { immediate: false },
)

// 展开详情处理
const handleExpandServer = async (serverId: string) => {
  expandingServerId.value = serverId
  try {
    // 模拟加载服务器详细信息
    await new Promise((resolve) => setTimeout(resolve, 500))
  } finally {
    expandingServerId.value = ''
  }
}

// 生命周期
onMounted(async () => {
  // 加载服务器列表
  await loadServers()

  // 检查URL参数，自动展开指定服务器详情
  const urlParams = new URLSearchParams(window.location.search)
  const serverId = urlParams.get('server')
  if (serverId) {
    // 延迟执行，确保组件完全挂载
    nextTick(() => {
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
      <!-- 服务器数据表格 -->
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
      />
    </div>

    <!-- 添加/编辑服务器对话框 -->
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
        <div class="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-2xl mt-0.5"></i>
            <div class="flex-1">
              <p class="font-medium text-green-700 dark:text-green-300 mb-2">
                服务器已成功添加！请保存以下Agent Key：
              </p>
              <div class="bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm break-all">
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
        <div class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-terminal text-primary"></i>
            <h4 class="text-lg font-semibold text-color">安装被控探针</h4>
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-color">Linux 安装命令</span>
              <Button
                icon="pi pi-copy"
                text
                size="small"
                @click="copyInstallCommand"
                v-tooltip.top="'复制命令'"
              />
            </div>
            <div class="bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm overflow-x-auto break-all">
              {{ installCommand }}
            </div>
          </div>

          <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
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

        <!-- 重要提示 -->
        <div class="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div class="flex items-start gap-2">
            <i class="pi pi-exclamation-triangle text-blue-600 dark:text-blue-400 mt-0.5"></i>
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">重要提示</p>
              <ul class="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <li>• 请务必保存此Agent Key，关闭后将无法再次查看</li>
                <li>• Agent Key用于验证服务器身份，请妥善保管</li>
                <li>• 如果丢失Agent Key，需要重新添加服务器</li>
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
