<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import ServerToolbar from './components/ServerToolbar.vue'
import ServerTable from './components/ServerTable.vue'
import ServerDialog from './components/ServerDialog.vue'
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue'
import type { Server, ServerForm, StatusOption } from './components/types'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const editingServer = ref<Server | null>(null)
const serverToDelete = ref<Server | null>(null)

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

// 状态选项
const statusOptions: StatusOption[] = [
  { label: '全部', value: 'all' },
  { label: '在线', value: 'online' },
  { label: '离线', value: 'offline' },
  { label: '异常', value: 'error' },
]

// Toast 通知
const toast = useToast()

// 模拟服务器数据
const servers = ref<Server[]>([
  {
    id: '1',
    name: 'Web服务器-01',
    ip: '192.168.1.100',
    port: 22,
    status: 'online',
    location: '中国/北京',
    os: 'Ubuntu 22.04',
    architecture: 'x86_64',
    kernel: '5.15.0-91-generic',
    hostname: 'web-server-01',
    uptime: '15天2时30分',
    cpu: 45,
    memory: 62,
    disk: 78,
    networkIO: { upload: 1024, download: 2048 },
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    name: '数据库服务器-01',
    ip: '192.168.1.101',
    port: 22,
    status: 'online',
    location: '中国/北京',
    os: 'CentOS 8',
    architecture: 'x86_64',
    kernel: '4.18.0-477.el8.x86_64',
    hostname: 'db-server-01',
    uptime: '10天5时15分',
    cpu: 78,
    memory: 85,
    disk: 92,
    networkIO: { upload: 512, download: 1024 },
    createdAt: '2024-01-10',
    updatedAt: '2024-01-20',
  },
  {
    id: '3',
    name: '缓存服务器-01',
    ip: '192.168.1.102',
    port: 22,
    status: 'offline',
    location: '中国/上海',
    os: 'Ubuntu 20.04',
    architecture: 'x86_64',
    kernel: '5.4.0-150-generic',
    hostname: 'cache-server-01',
    uptime: '12天8时45分',
    cpu: 23,
    memory: 34,
    disk: 45,
    networkIO: { upload: 256, download: 512 },
    createdAt: '2024-01-12',
    updatedAt: '2024-01-19',
  },
  {
    id: '4',
    name: '文件服务器-01',
    ip: '192.168.1.103',
    port: 22,
    status: 'offline',
    location: '中国/广州',
    os: 'Windows Server 2019',
    architecture: 'x86_64',
    kernel: '10.0.17763.1',
    hostname: 'file-server-01',
    uptime: '8天12时20分',
    cpu: 0,
    memory: 0,
    disk: 0,
    networkIO: { upload: 0, download: 0 },
    createdAt: '2024-01-08',
    updatedAt: '2024-01-18',
  },
  {
    id: '5',
    name: '监控服务器-01',
    ip: '192.168.1.104',
    port: 22,
    status: 'error',
    location: '中国/深圳',
    os: 'Debian 11',
    architecture: 'x86_64',
    kernel: '5.10.0-23-amd64',
    hostname: 'monitor-server-01',
    uptime: '5天18时30分',
    cpu: 95,
    memory: 98,
    disk: 99,
    networkIO: { upload: 2048, download: 4096 },
    createdAt: '2024-01-05',
    updatedAt: '2024-01-20',
  },
])

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

// 统计数据
const statistics = computed(() => ({
  online: servers.value.filter(server => server.status === 'online').length,
  offline: servers.value.filter(server => server.status === 'offline').length,
  error: servers.value.filter(server => server.status === 'error').length,
}))

// 事件处理函数
const refreshData = () => {
  loading.value = true
  // 模拟刷新数据
  setTimeout(() => {
    loading.value = false
    toast.add({
      severity: 'success',
      summary: '刷新成功',
      detail: '服务器数据已更新',
      life: 2000,
    })
  }, 1000)
}

const handleAddServer = () => {
  editingServer.value = null
  resetForm()
  showAddDialog.value = true
}

const handleEditServer = (server: Server) => {
  editingServer.value = server
  showAddDialog.value = true
}

const handleDeleteServer = (server: Server) => {
  serverToDelete.value = server
  showDeleteDialog.value = true
}

const handleSaveServer = async (form: ServerForm) => {
  saving.value = true

  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (editingServer.value) {
      // 更新服务器
      const index = servers.value.findIndex((s) => s.id === editingServer.value!.id)
      if (index !== -1) {
        servers.value[index] = {
          ...servers.value[index],
          ...form,
          updatedAt: new Date().toISOString().split('T')[0],
        }
      }
      toast.add({
        severity: 'success',
        summary: '更新成功',
        detail: '服务器信息已更新',
        life: 3000,
      })
    } else {
      // 添加新服务器
      const newServer: Server = {
        id: Date.now().toString(),
        ...form,
        cpu: 0,
        memory: 0,
        disk: 0,
        networkIO: { upload: 0, download: 0 },
        uptime: '0天0时0分',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      }
      servers.value.unshift(newServer)
      toast.add({
        severity: 'success',
        summary: '添加成功',
        detail: '新服务器已添加',
        life: 3000,
      })
    }

    showAddDialog.value = false
    resetForm()
  } catch {
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: '请稍后重试',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

const handleConfirmDelete = async () => {
  if (!serverToDelete.value) return

  deleting.value = true

  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const index = servers.value.findIndex((s) => s.id === serverToDelete.value!.id)
    if (index !== -1) {
      servers.value.splice(index, 1)
    }

    toast.add({
      severity: 'success',
      summary: '删除成功',
      detail: '服务器已删除',
      life: 3000,
    })

    showDeleteDialog.value = false
    serverToDelete.value = null
  } catch {
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: '请稍后重试',
      life: 3000,
    })
  } finally {
    deleting.value = false
  }
}

const handleCancelDialog = () => {
  showAddDialog.value = false
  showDeleteDialog.value = false
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

// 生命周期
onMounted(() => {
  // 可以在这里加载真实数据
})
</script>

<template>
  <div class="servers-view">
    <Toast />

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-color mb-2">服务器管理</h1>
      <p class="text-muted-color">管理和监控所有服务器节点</p>
    </div>

    <div class="space-y-6">
      <!-- 操作栏 -->
      <ServerToolbar
        v-model:search-query="searchQuery"
        v-model:status-filter="statusFilter"
        :status-options="statusOptions"
        :filtered-count="filteredServers.length"
        :total-count="servers.length"
        :statistics="statistics"
        @refresh="refreshData"
        @add-server="handleAddServer"
      />

      <!-- 服务器数据表格 -->
      <ServerTable
        :servers="filteredServers"
        :loading="loading"
        @edit-server="handleEditServer"
        @delete-server="handleDeleteServer"
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

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog
      v-model:visible="showDeleteDialog"
      :server="serverToDelete"
      :deleting="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDialog"
    />
  </div>
</template>

<style scoped>
.servers-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
