<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

// 类型定义
interface Server {
  id: string
  name: string
  ip: string
  port?: number
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os: string
  architecture?: string
  kernel?: string
  hostname?: string
  uptime?: string
  cpu: number
  memory: number
  disk: number
  networkIO?: {
    upload: number
    download: number
  }
  createdAt: string
  updatedAt: string
}

interface ServerForm {
  name: string
  ip: string
  port?: number
  status: 'online' | 'offline' | 'maintenance' | 'error'
  location: string
  os: string
  architecture: string
  kernel: string
  hostname: string
}

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
const expandedRows = ref<{ [key: string]: boolean }>({})

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

// 安装命令
const linuxCommand = computed(() => {
  return `curl -fsSL https://install.example.com/agent.sh | bash -s -- --server=${serverForm.value.ip} --token=YOUR_TOKEN`
})

// 状态选项
const statusOptions = [
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

// 方法
const getOnlineCount = () => {
  return servers.value.filter(server => server.status === 'online').length
}

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

const getStatusColor = (status: string) => {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500'
}

const getStatusText = (status: string) => {
  const texts = {
    all: '全部',
    online: '在线',
    offline: '离线',
    error: '异常',
  }
  return texts[status as keyof typeof texts] || '未知'
}

const getStatusSeverity = (status: string) => {
  const severities = {
    online: 'success',
    offline: 'secondary',
    error: 'danger',
  }
  return severities[status as keyof typeof severities] || 'secondary'
}

const getCpuTextColorClass = (cpu: number) => {
  if (cpu >= 90) return 'text-red-600 dark:text-red-400'
  if (cpu >= 70) return 'text-orange-600 dark:text-orange-400'
  if (cpu >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getMemoryTextColorClass = (memory: number) => {
  if (memory >= 90) return 'text-red-600 dark:text-red-400'
  if (memory >= 70) return 'text-orange-600 dark:text-orange-400'
  if (memory >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getDiskTextColorClass = (disk: number) => {
  if (disk >= 90) return 'text-red-600 dark:text-red-400'
  if (disk >= 70) return 'text-orange-600 dark:text-orange-400'
  if (disk >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const formatSpeed = (bytes: number) => {
  if (bytes === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatUptime = (uptime: string) => {
  if (!uptime) return '0天0时0分'
  const uptimeParts = uptime.split('天')
  const days = uptimeParts[0]
  const timeParts = uptimeParts[1]?.split('时') || ['0', '0分']
  const hours = timeParts[0]
  const minutes = timeParts[1]?.replace('分', '') || '0'
  return `${days}天${hours}时${minutes}分`
}

const editServer = (server: Server) => {
  editingServer.value = server
  serverForm.value = {
    name: server.name,
    ip: server.ip,
    port: server.port,
    status: server.status,
    location: server.location,
    os: server.os,
    architecture: server.architecture || '',
    kernel: server.kernel || '',
    hostname: server.hostname || '',
  }
  showAddDialog.value = true
}

const saveServer = async () => {
  if (!serverForm.value.name || !serverForm.value.ip) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '请填写必填字段',
      life: 3000,
    })
    return
  }

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
          ...serverForm.value,
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
        ...serverForm.value,
        cpu: 0,
        memory: 0,
        disk: 0,
        networkIO: { upload: 0, download: 0 },
        uptime: '0天0时0分', // 新增 uptime
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

const deleteServer = (server: Server) => {
  serverToDelete.value = server
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
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

const copyCommand = async (command: string) => {
  try {
    await navigator.clipboard.writeText(command)
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: '命令已复制到剪贴板',
      life: 2000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制命令',
      life: 3000,
    })
  }
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
      <div class="bg-gradient-to-r from-surface-0 to-surface-50 dark:from-surface-800 dark:to-surface-900 p-6 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
        <div class="flex items-center justify-between">
          <!-- 左侧搜索和筛选 -->
          <div class="flex items-center gap-4">
            <!-- 搜索框 -->
            <div class="relative group">
              <InputText
                v-model="searchQuery"
                placeholder="搜索服务器名称、IP或位置..."
                class="w-80 pl-10 pr-4 py-3 border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-lg"
              />
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span class="text-xs text-muted-color bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-md">
                  {{ filteredServers.length }}/{{ servers.length }}
                </span>
              </div>
            </div>

            <!-- 状态筛选 -->
            <div class="relative">
              <Select
                v-model="statusFilter"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="状态筛选"
                class="w-44 border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <!-- 快速统计 -->
            <div class="flex items-center gap-3 ml-6 pl-6 border-l border-surface-200 dark:border-surface-700">
              <!-- 在线服务器 -->
              <div class="relative group">
                <div class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 min-w-[80px] text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 cursor-pointer">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-xs font-medium text-green-700 dark:text-green-300">在线</span>
                  </div>
                  <div class="flex items-baseline justify-center gap-1">
                    <span class="text-2xl font-bold text-green-600 dark:text-green-400">{{ getOnlineCount() }}</span>
                    <span class="text-sm text-green-600 dark:text-green-400">台</span>
                  </div>
                </div>
                <div class="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {{ Math.round((getOnlineCount() / servers.length) * 100) }}%
                </div>
              </div>

              <!-- 离线服务器 -->
              <div class="relative group">
                <div class="bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 min-w-[80px] text-center hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-all duration-200 cursor-pointer">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">离线</span>
                  </div>
                  <div class="flex items-baseline justify-center gap-1">
                    <span class="text-2xl font-bold text-gray-600 dark:text-gray-400">{{ servers.filter(s => s.status === 'offline').length }}</span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">台</span>
                  </div>
                </div>
              </div>

              <!-- 异常服务器 -->
              <div class="relative group">
                <div class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 min-w-[80px] text-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 cursor-pointer">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-2 h-2 rounded-full bg-red-500"></div>
                    <span class="text-xs font-medium text-red-700 dark:text-red-300">异常</span>
                  </div>
                  <div class="flex items-baseline justify-center gap-1">
                    <span class="text-2xl font-bold text-red-600 dark:text-red-400">{{ servers.filter(s => s.status === 'error').length }}</span>
                    <span class="text-sm text-red-600 dark:text-red-400">台</span>
                  </div>
                </div>
                <div v-if="servers.filter(s => s.status === 'error').length > 0" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full h-[25px] w-[25px] text-center font-medium">
                  !
                </div>
              </div>

              <!-- 总计 -->
              <div class="ml-3 pl-4 border-l border-surface-200 dark:border-surface-700">
                <div class="bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-3 min-w-[80px] text-center hover:from-surface-100 hover:to-surface-200 dark:hover:from-surface-700 dark:hover:to-surface-800 transition-all duration-200 cursor-pointer group">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <i class="pi pi-server text-primary text-sm"></i>
                    <span class="text-xs font-medium text-muted-color">总计</span>
                  </div>
                  <div class="flex items-baseline justify-center gap-1">
                    <span class="text-2xl font-bold text-primary">{{ servers.length }}</span>
                    <span class="text-sm text-muted-color">台</span>
                  </div>

                  <!-- 状态分布指示器 -->
                  <div class="mt-2 flex items-center justify-center gap-1">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500" :style="{ opacity: getOnlineCount() / servers.length }"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-gray-500" :style="{ opacity: servers.filter(s => s.status === 'offline').length / servers.length }"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-red-500" :style="{ opacity: servers.filter(s => s.status === 'error').length / servers.length }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧操作按钮 -->
          <div class="flex items-center gap-3">
            <Button
              icon="pi pi-refresh"
              text
              @click="refreshData"
              v-tooltip.top="'刷新数据'"
            />
            <Button
              label="添加服务器"
              icon="pi pi-plus"
              @click="showAddDialog = true"
              class="px-6 py-3 font-medium"
            />
          </div>
        </div>
      </div>

      <!-- 服务器数据表格 -->
      <Card class="shadow-sm">
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="pi pi-server text-primary text-xl"></i>
              <span class="text-lg font-semibold">服务器列表</span>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2 text-sm text-muted-color">
                <span>共 {{ filteredServers.length }} 台服务器</span>
                <span class="w-1 h-1 bg-muted-color rounded-full"></span>
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <DataTable
            :value="filteredServers"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            :loading="loading"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条"
            class="w-full"
            stripedRows
            hover
            v-model:expandedRows="expandedRows"
            dataKey="id"
            scrollable
          >
            <!-- 展开列 -->
            <Column expander style="width: 3rem" />

            <!-- 服务器名称列 -->
            <Column field="name" header="服务器名称" sortable class="w-fil">
              <template #body="{ data }">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full" :class="getStatusColor(data.status)"></div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-color truncate">{{ data.name }}</div>
                    <div class="text-xs text-muted-color truncate">{{ data.ip }}</div>
                  </div>
                </div>
              </template>
            </Column>

            <!-- 状态列 -->
            <Column field="status" header="状态" sortable class="w-24">
              <template #body="{ data }">
                <Tag
                  :value="getStatusText(data.status)"
                  :severity="getStatusSeverity(data.status)"
                  class="text-xs"
                />
              </template>
            </Column>

            <!-- 位置列 -->
            <Column field="location" header="位置" sortable class="w-32">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <i class="pi pi-map-marker text-muted-color text-xs"></i>
                  <span class="text-sm truncate">{{ data.location }}</span>
                </div>
              </template>
            </Column>

            <!-- 系统列 -->
            <Column field="os" header="系统" sortable class="w-40">
              <template #body="{ data }">
                <div class="space-y-1">
                  <div class="text-sm font-medium text-color">{{ data.os }}</div>
                  <div class="text-xs text-muted-color">{{ data.architecture || 'x86_64' }}</div>
                </div>
              </template>
            </Column>

            <!-- CPU列 -->
            <Column field="cpu" header="CPU" sortable class="w-20">
              <template #body="{ data }">
                <div class="text-left">
                  <div class="text-lg font-bold" :class="getCpuTextColorClass(data.cpu)">
                    {{ data.cpu }}%
                  </div>
                  <div class="text-xs text-muted-color">使用率</div>
                </div>
              </template>
            </Column>

            <!-- 内存列 -->
            <Column field="memory" header="内存" sortable class="w-25">
              <template #body="{ data }">
                <div class="text-left">
                  <div class="text-lg font-bold" :class="getMemoryTextColorClass(data.memory)">
                    {{ data.memory }}%
                  </div>
                  <div class="text-xs text-muted-color">使用率</div>
                </div>
              </template>
            </Column>

            <!-- 磁盘列 -->
            <Column field="disk" header="磁盘" sortable class="w-25">
              <template #body="{ data }">
                <div class="text-left">
                  <div class="text-lg font-bold" :class="getDiskTextColorClass(data.disk)">
                    {{ data.disk }}%
                  </div>
                  <div class="text-xs text-muted-color">使用率</div>
                </div>
              </template>
            </Column>

            <!-- 运行时间列 -->
            <Column field="uptime" header="运行时间" sortable class="w-32">
              <template #body="{ data }">
                <div class="text-left">
                  <div class="text-sm font-medium text-color">{{ formatUptime(data.uptime) }}</div>
                  <div class="text-xs text-muted-color">天时分</div>
                </div>
              </template>
            </Column>

            <!-- 操作列 -->
            <Column header="操作" class="w-24">
              <template #body="{ data }">
                <div class="flex items-center gap-1">
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    @click.stop="deleteServer(data)"
                    v-tooltip.top="'删除'"
                    class="hover:bg-red-50"
                  />
                </div>
              </template>
            </Column>

            <!-- 展开行内容 -->
            <template #expansion="{ data }">
              <div class="p-6 bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <!-- 左侧：基本信息 -->
                  <div class="space-y-4">
                    <h4 class="text-lg font-semibold text-color border-b border-surface-200 dark:border-surface-700 pb-2">
                      <i class="pi pi-info-circle text-primary mr-2"></i>基本信息
                    </h4>
                    <div class="space-y-3">
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">服务器名称</span>
                        <span class="font-medium">{{ data.name }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">IP地址</span>
                        <span class="font-mono text-sm">{{ data.ip }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">状态</span>
                        <Tag :value="getStatusText(data.status)" :severity="getStatusSeverity(data.status)" />
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">位置</span>
                        <span>{{ data.location }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">操作系统</span>
                        <span>{{ data.os }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">系统架构</span>
                        <span>{{ data.architecture || 'x86_64' }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">运行时间</span>
                        <span>{{ formatUptime(data.uptime) }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">内核版本</span>
                        <span>{{ data.kernel || '5.15.0' }}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                        <span class="text-muted-color">主机名</span>
                        <span>{{ data.hostname || 'unknown' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 右侧：系统资源 -->
                  <div class="space-y-4">
                    <h4 class="text-lg font-semibold text-color border-b border-surface-200 dark:border-surface-700 pb-2">
                      <i class="pi pi-chart-line text-primary mr-2"></i>系统资源
                    </h4>
                    <div class="space-y-4">
                      <!-- CPU 详细 -->
                      <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                        <div class="flex items-center justify-between mb-3">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-microchip text-primary"></i>
                            <span class="font-medium">CPU 使用率</span>
                          </div>
                          <span class="text-2xl font-bold" :class="getCpuTextColorClass(data.cpu)">
                            {{ data.cpu }}%
                          </span>
                        </div>
                        <ProgressBar
                          :value="data.cpu"
                          :showValue="false"
                          class="h-3"
                          :pt="{
                            value: {
                              style: {
                                backgroundColor: data.cpu >= 90 ? '#ef4444' : data.cpu >= 70 ? '#f97316' : data.cpu >= 50 ? '#eab308' : '#22c55e'
                              }
                            }
                          }"
                        />
                      </div>

                      <!-- 内存详细 -->
                      <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                        <div class="flex items-center justify-between mb-3">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-memory text-primary"></i>
                            <span class="font-medium">内存使用率</span>
                          </div>
                          <span class="text-2xl font-bold" :class="getMemoryTextColorClass(data.memory)">
                            {{ data.memory }}%
                          </span>
                        </div>
                        <ProgressBar
                          :value="data.memory"
                          :showValue="false"
                          class="h-3"
                          :pt="{
                            value: {
                              style: {
                                backgroundColor: data.memory >= 90 ? '#ef4444' : data.memory >= 70 ? '#f97316' : data.memory >= 50 ? '#eab308' : '#22c55e'
                              }
                            }
                          }"
                        />
                      </div>

                      <!-- 磁盘详细 -->
                      <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                        <div class="flex items-center justify-between mb-3">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-hdd text-primary"></i>
                            <span class="font-medium">磁盘使用率</span>
                          </div>
                          <span class="text-2xl font-bold" :class="getDiskTextColorClass(data.disk)">
                            {{ data.disk }}%
                          </span>
                        </div>
                        <ProgressBar
                          :value="data.disk"
                          :showValue="false"
                          class="h-3"
                          :pt="{
                            value: {
                              style: {
                                backgroundColor: data.disk >= 90 ? '#ef4444' : data.disk >= 70 ? '#f97316' : data.disk >= 50 ? '#eab308' : '#22c55e'
                              }
                            }
                          }"
                        />
                      </div>

                      <!-- 网络信息 -->
                      <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                        <div class="flex items-center gap-2 mb-3">
                          <i class="pi pi-wifi text-primary"></i>
                          <span class="font-medium">网络 I/O</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                          <div class="text-center">
                            <div class="flex items-center justify-center gap-2 mb-1">
                              <i class="pi pi-arrow-up text-green-600 text-sm"></i>
                              <span class="text-xs text-muted-color">上传</span>
                            </div>
                            <div class="text-xl font-bold text-green-600">
                              {{ formatSpeed(data.networkIO?.upload || 0) }}
                            </div>
                          </div>
                          <div class="text-center">
                            <div class="flex items-center justify-center gap-2 mb-1">
                              <i class="pi pi-arrow-down text-blue-600 text-sm"></i>
                              <span class="text-xs text-muted-color">下载</span>
                            </div>
                            <div class="text-xl font-bold text-blue-600">
                              {{ formatSpeed(data.networkIO?.download || 0) }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
                  <Button
                    label="重启服务"
                    icon="pi pi-refresh"
                    text
                    severity="warn"
                    class="shadow-sm"
                  />
                  <Button
                    label="查看日志"
                    icon="pi pi-file-text"
                    text
                    class="shadow-sm"
                  />
                  <Button
                    label="编辑服务器"
                    icon="pi pi-pencil"
                    @click="editServer(data)"
                    class="shadow-sm"
                  />
                </div>
              </div>
            </template>
          </DataTable>
        </template>
      </Card>
    </div>

    <!-- 添加/编辑服务器对话框 -->
    <Dialog
      v-model:visible="showAddDialog"
      :header="editingServer ? '编辑服务器' : '添加服务器'"
      modal
      class="w-3xl"
      :pt="{
        root: 'rounded-xl border-0 shadow-2xl',
        header: 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-b border-primary-200 dark:border-primary-700 rounded-t-xl',
        content: 'p-0',
        footer: 'bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 rounded-b-xl'
      }"
    >
      <div class="p-6">
        <form @submit.prevent="saveServer" class="space-y-6">
          <!-- 基本信息 -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <i class="pi pi-server text-primary text-lg"></i>
              </div>
              <h3 class="text-lg font-semibold text-color">基本信息</h3>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <i class="pi pi-tag text-primary text-xs"></i>
                  服务器名称
                  <span class="text-red-500">*</span>
                </label>
                <InputText
                  v-model="serverForm.name"
                  placeholder="输入服务器名称"
                  required
                  class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <i class="pi pi-globe text-primary text-xs"></i>
                  IP地址
                  <span class="text-red-500">*</span>
                </label>
                <InputText
                  v-model="serverForm.ip"
                  placeholder="192.168.1.100"
                  required
                  class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <i class="pi pi-map-marker text-primary text-xs"></i>
                  位置
                </label>
                <InputText
                  v-model="serverForm.location"
                  placeholder="中国/北京"
                  class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <i class="pi pi-desktop text-primary text-xs"></i>
                  操作系统
                </label>
                <InputText
                  v-model="serverForm.os"
                  placeholder="Ubuntu 22.04"
                  class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <!-- 安装指令 -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center">
                <i class="pi pi-desktop text-lg"></i>
              </div>
              <h3 class="text-lg font-semibold text-color">安装被控探针</h3>
            </div>

            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-color">Linux 安装命令</span>
                  <Button
                    icon="pi pi-copy"
                    text
                    size="small"
                    @click="copyCommand(linuxCommand)"
                    v-tooltip.top="'复制命令'"
                  />
                </div>
                <div class="bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm overflow-x-auto">
                  {{ linuxCommand }}
                </div>
              </div>

              <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div class="flex items-start gap-2">
                  <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-0.5"></i>
                  <div class="text-sm text-blue-700 dark:text-blue-300">
                    <p class="font-medium mb-1">安装说明</p>
                    <p class="text-xs text-blue-600 dark:text-blue-400">
                      1. 在目标Linux服务器上执行安装命令<br>
                      2. 安装完成后，探针会自动连接到控制中心<br>
                      3. 系统信息将自动获取，无需手动填写
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <template #footer>
        <div class="flex justify-between items-center p-6">
          <div class="flex gap-3">
            <Button
              label="取消"
              text
              @click="showAddDialog = false"
              class="px-6 py-2"
            />
            <Button
              :label="editingServer ? '更新服务器' : '添加服务器'"
              :icon="editingServer ? 'pi pi-check' : 'pi pi-plus'"
              @click="saveServer"
              :loading="saving"
              class="px-6 py-2 font-medium"
            />
          </div>
        </div>
      </template>
    </Dialog>

    <!-- 删除确认对话框 -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="确认删除"
      modal
      class="w-md"
    >
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <i class="pi pi-exclamation-triangle text-red-500 text-xl"></i>
          <div>
            <p class="font-medium">确定要删除服务器吗？</p>
            <p class="text-sm text-muted-color mt-1">
              服务器：<span class="font-medium">{{ serverToDelete?.name }}</span>
            </p>
          </div>
        </div>
        <p class="text-sm text-muted-color">此操作无法撤销，删除后将无法恢复。</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="取消" text @click="showDeleteDialog = false" />
          <Button
            label="删除"
            severity="danger"
            @click="confirmDelete"
            :loading="deleting"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.servers-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* 自定义进度条颜色 */
:deep(.p-progressbar-value) {
  transition: all 0.3s ease;
}

:deep(.p-progressbar) {
  background-color: var(--surface-200);
}

:deep(.p-datatable .p-datatable-tbody > tr.p-highlight) {
  background-color: var(--primary-50);
}

:deep(.p-datatable .p-datatable-tbody > tr.p-highlight-contextmenu) {
  background-color: var(--primary-50);
}

/* 展开行样式 */
:deep(.p-datatable .p-datatable-tbody > tr.p-datatable-expanded-row) {
  background-color: var(--surface-50);
}


/* 表格头部样式 */
:deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-50);
  border-bottom: 1px solid var(--surface-200);
  font-weight: 600;
  color: var(--text-color);
}

/* 分页器样式 */
:deep(.p-paginator) {
  background-color: var(--surface-0);
  border-top: 1px solid var(--surface-200);
}

/* 搜索框样式 */
:deep(.p-inputtext) {
  border-radius: 0.5rem;
}

/* 按钮样式 */
:deep(.p-button) {
  border-radius: 0.5rem;
  font-weight: 500;
}

/* 卡片样式 */
:deep(.p-card) {
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

/* 对话框样式 */
:deep(.p-dialog) {
  border-radius: 0.75rem;
}

:deep(.p-dialog .p-dialog-header) {
  border-bottom: 1px solid var(--surface-200);
  padding: 1.5rem 1.5rem 1rem 1.5rem;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 1rem 1.5rem;
}

:deep(.p-dialog .p-dialog-footer) {
  border-top: 1px solid var(--surface-200);
  padding: 1rem 1.5rem 1.5rem 1.5rem;
}
</style>
