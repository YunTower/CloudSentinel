<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useNotifications } from '@/composables/useNotifications'
import { useAuthStore } from '@/stores/auth'
import type { Server, MetricsData } from '@/types/manager/servers'
import serversApi from '@/apis/servers'
import ServerBasicInfo from './ServerBasicInfo.vue'
import ServerCpuCard from './ServerCpuCard.vue'
import ServerMemoryCard from './ServerMemoryCard.vue'
import ServerSwapCard from './ServerSwapCard.vue'
import ServerDiskCard from './ServerDiskCard.vue'
import ServerNetworkCard from './ServerNetworkCard.vue'
import ServerGPUCard from './ServerGPUCard.vue'
import ServerMetricsChart from './ServerMetricsChart.vue'
import {
  getStatusText,
  getStatusSeverity,
  hasAgentUpdate,
  getVersionTypeConfig,
  parseVersion,
} from '@/utils/version.ts'
import type { VersionType } from '@/utils/version.ts'

// 计算到期天数
const getExpireDays = (expireTime?: string): number | null => {
  if (!expireTime) return null
  const expire = new Date(expireTime)
  const now = new Date()
  const diff = expire.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// 获取到期状态颜色
const getExpireStatus = (expireTime?: string): { severity: string; label: string } | null => {
  const days = getExpireDays(expireTime)
  if (days === null) return null
  if (days < 0) return { severity: 'danger', label: '已过期' }
  if (days <= 1) return { severity: 'danger', label: '即将过期' }
  if (days <= 3) return { severity: 'warning', label: '3天内到期' }
  if (days <= 7) return { severity: 'warning', label: '7天内到期' }
  return { severity: 'success', label: `${days}天后到期` }
}

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.role === 'admin')
const { toast, confirm } = useNotifications()

// 付费周期选项
const billingCycleOptions = [
  { label: '月付', value: 'monthly' },
  { label: '季付', value: 'quarterly' },
  { label: '年付', value: 'yearly' },
  { label: '一次性', value: 'one_time' },
  { label: '自定义', value: 'custom' },
]

// 流量限制类型选项
const trafficLimitTypeOptions = [
  { label: '无限制', value: 'unlimited' },
  { label: '周期', value: 'periodic' },
]

// 流量重置周期选项
const trafficResetCycleOptions = [
  { label: '每月', value: 'monthly' },
  { label: '每季度', value: 'quarterly' },
  { label: '每年', value: 'yearly' },
  { label: '自定义', value: 'custom' },
]

interface Props {
  servers: Server[]
  loading?: boolean
  deletingServerId?: string
  restartingServerId?: string
  expandingServerId?: string
  latestAgentVersion?: string
  latestAgentVersionType?: VersionType
  selectedServers?: Server[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'view-install-info': [server: Server]
  'delete-server': [server: Server]
  'edit-server': [server: Server]
  'restart-server': [server: Server]
  'expand-server': [serverId: string]
  'update-agent': [server: Server]
  'selection-change': [servers: Server[]]
}>()

// 版本更新相关
const showUpdateDialog = ref(false)
const selectedServerForUpdate = ref<Server | null>(null)
const updatingAgentId = ref<string>('')

// 检查是否需要更新
const needsUpdate = (server: Server): boolean => {
  if (!props.latestAgentVersion || !server.agent_version) return false
  return hasAgentUpdate(
    server.agent_version,
    props.latestAgentVersion,
    props.latestAgentVersionType,
  )
}

// 显示更新对话框
const showUpdateAgentDialog = (server: Server) => {
  selectedServerForUpdate.value = server
  showUpdateDialog.value = true
}

// 确认更新
const confirmUpdateAgent = async () => {
  if (!selectedServerForUpdate.value) return

  const server = selectedServerForUpdate.value
  updatingAgentId.value = server.id

  try {
    await serversApi.updateAgent(server.id)
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '更新命令已发送，Agent 将自动更新',
      life: 3000,
    })
    showUpdateDialog.value = false
    selectedServerForUpdate.value = null
    emit('update-agent', server)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '更新失败'
    toast.add({
      severity: 'error',
      summary: '更新失败',
      detail: errorMessage,
      life: 5000,
    })
  } finally {
    updatingAgentId.value = ''
  }
}

const expandedRows = ref<{ [key: string]: boolean }>({})
const pendingExpandServerId = ref<string>('')
const selectedServers = computed({
  get: () => props.selectedServers || [],
  set: (value) => emit('selection-change', value),
})
const metricsData = ref<{
  [key: string]: {
    cpu?: MetricsData[]
    memory?: MetricsData[]
    disk?: MetricsData[]
    network?: MetricsData[]
  }
}>({}) // 性能指标数据
const chartTimeRange = ref<{
  [key: string]: { cpu: number; memory: number; disk: number; network: number }
}>({}) // 图表时间范围（小时）
const chartRefs = ref<{
  [key: string]: {
    cpu?: InstanceType<typeof ServerMetricsChart>
    memory?: InstanceType<typeof ServerMetricsChart>
    disk?: InstanceType<typeof ServerMetricsChart>
    network?: InstanceType<typeof ServerMetricsChart>
  }
}>({})

// 处理行展开事件
const onRowExpand = (event: { data: Server }) => {
  const serverId = event.data.id

  if (props.expandingServerId === serverId) {
    return
  }

  expandedRows.value[serverId] = true
  pendingExpandServerId.value = serverId
  emit('expand-server', serverId)
}

// 确认展开
const confirmExpand = async (serverId: string) => {
  expandedRows.value[serverId] = true
  pendingExpandServerId.value = ''

  // 初始化图表时间范围
  initChartTimeRange(serverId)

  // 加载所有图表数据
  const hours = chartTimeRange.value[serverId]?.cpu || 1

  try {
    // 并行加载所有图表数据
    await Promise.all([
      loadMetrics(serverId, 'cpu', hours),
      loadMetrics(serverId, 'memory', hours),
      loadMetrics(serverId, 'disk', hours),
      loadMetrics(serverId, 'network', hours),
    ])

    await nextTick()
  } catch (error) {
    console.error(`加载服务器 ${serverId} 的图表数据失败:`, error)
  }
}

// 取消展开
const cancelExpand = (serverId: string) => {
  expandedRows.value[serverId] = false
  pendingExpandServerId.value = ''
}

// 自动展开指定服务器详情
const autoExpandServer = (serverId: string) => {
  const server = props.servers.find((s) => s.id === serverId)
  if (server) {
    // 总是先展开，然后触发数据加载
    pendingExpandServerId.value = serverId
    expandedRows.value[serverId] = true
    emit('expand-server', serverId)
  }
}

// 确认删除
const confirmDelete = (event: Event, server: Server) => {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `确定要删除服务器 "${server.name}" 吗？`,
    header: '删除确认',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '删除',
      severity: 'danger',
    },
    accept: () => {
      emit('delete-server', server)
    },
  })
}

// 初始化图表时间范围
const initChartTimeRange = (serverId: string) => {
  if (!chartTimeRange.value[serverId]) {
    chartTimeRange.value[serverId] = {
      cpu: 1,
      memory: 1,
      disk: 1,
      network: 1,
    }
  }
}

// 加载性能指标数据
const loadMetrics = async (
  serverId: string,
  type: 'cpu' | 'memory' | 'disk' | 'network',
  hours: number = 24,
) => {
  try {
    // 计算开始和结束时间戳
    const endTime = Math.floor(Date.now() / 1000)
    const startTime = endTime - hours * 60 * 60

    let response: {
      status: boolean
      data?: Array<{ timestamp: number; [key: string]: number }>
    } | null = null

    switch (type) {
      case 'cpu':
        response = (await serversApi.getServerMetricsCPU(
          serverId,
          startTime.toString(),
          endTime.toString(),
        )) as {
          status: boolean
          data?: Array<{ timestamp: number; cpu_usage: number }>
        }
        break
      case 'memory':
        response = (await serversApi.getServerMetricsMemory(
          serverId,
          startTime.toString(),
          endTime.toString(),
        )) as {
          status: boolean
          data?: Array<{ timestamp: number; memory_usage: number }>
        }
        break
      case 'disk':
        response = (await serversApi.getServerMetricsDisk(
          serverId,
          startTime.toString(),
          endTime.toString(),
        )) as {
          status: boolean
          data?: Array<{ timestamp: number; disk_read: number; disk_write: number }>
        }
        break
      case 'network':
        response = (await serversApi.getServerMetricsNetwork(
          serverId,
          startTime.toString(),
          endTime.toString(),
        )) as {
          status: boolean
          data?: Array<{ timestamp: number; network_upload: number; network_download: number }>
        }
        break
    }

    if (response?.status && response.data) {
      const convertedData: MetricsData[] = response.data.map((item) => {
        let timestamp: number
        if (typeof item.timestamp === 'string') {
          timestamp = Math.floor(new Date(item.timestamp).getTime() / 1000)
        } else if (typeof item.timestamp === 'number') {
          timestamp = item.timestamp
        } else {
          // 默认使用当前时间
          timestamp = Math.floor(Date.now() / 1000)
        }

        return {
          timestamp,
          cpu_usage: 'cpu_usage' in item ? item.cpu_usage : 0,
          memory_usage: 'memory_usage' in item ? item.memory_usage : 0,
          disk_usage: 'disk_usage' in item ? item.disk_usage : 0,
          disk_read: 'disk_read' in item ? item.disk_read : 0,
          disk_write: 'disk_write' in item ? item.disk_write : 0,
          network_upload: 'network_upload' in item ? item.network_upload : 0,
          network_download: 'network_download' in item ? item.network_download : 0,
        }
      })

      // 为每个类型存储独立的数据
      if (!metricsData.value[serverId]) {
        metricsData.value[serverId] = {}
      }
      metricsData.value[serverId][type] = convertedData
    } else {
      // 即使没有数据也初始化空数组
      if (!metricsData.value[serverId]) {
        metricsData.value[serverId] = {}
      }
      metricsData.value[serverId][type] = []
    }
  } catch (error) {
    console.error(`加载${type}指标失败:`, error)
    // 错误时也初始化空数组
    if (!metricsData.value[serverId]) {
      metricsData.value[serverId] = {}
    }
    metricsData.value[serverId][type] = []
  }
}

// 更新图表时间范围
const updateChartTimeRange = async (
  serverId: string,
  type: 'cpu' | 'memory' | 'disk' | 'network',
  hours: number,
) => {
  initChartTimeRange(serverId)
  chartTimeRange.value[serverId][type] = hours

  await loadMetrics(serverId, type, hours)
  await nextTick()
}

// 添加实时数据点到图表
const addRealtimeDataPoint = (
  serverId: string,
  dataPoint: {
    timestamp: number
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    disk_read?: number
    disk_write?: number
    network_upload?: number
    network_download?: number
  },
) => {
  if (chartRefs.value[serverId]) {
    // CPU图表
    if (dataPoint.cpu_usage !== undefined && chartRefs.value[serverId].cpu) {
      chartRefs.value[serverId].cpu?.addDataPoint(dataPoint)
    }
    // 内存图表
    if (dataPoint.memory_usage !== undefined && chartRefs.value[serverId].memory) {
      chartRefs.value[serverId].memory?.addDataPoint(dataPoint)
    }
    // 磁盘图表
    if (
      (dataPoint.disk_read !== undefined || dataPoint.disk_write !== undefined) &&
      chartRefs.value[serverId].disk
    ) {
      chartRefs.value[serverId].disk?.addDataPoint(dataPoint)
    }
    // 网络图表
    if (
      (dataPoint.network_upload !== undefined || dataPoint.network_download !== undefined) &&
      chartRefs.value[serverId].network
    ) {
      chartRefs.value[serverId].network?.addDataPoint(dataPoint)
    }
  }
}

defineExpose({
  autoExpandServer,
  confirmExpand,
  cancelExpand,
  addRealtimeDataPoint,
})
</script>
<template>
  <div>
    <Card class="border border-[var(--p-select-border-color)]">
      <template #content>
        <DataTable
          :value="servers"
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
          v-model:selection="selectedServers"
          dataKey="id"
          @row-expand="onRowExpand"
          @selection-change="(e: { data: Server[] }) => emit('selection-change', e.data)"
          :pt="{
            root: { class: 'rounded-lg' },
            header: { class: 'bg-surface-50 dark:bg-surface-800' },
            tbody: { class: 'bg-surface-0 dark:bg-surface-900' },
            row: { class: 'hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors' },
          }"
        >
          <!-- 空数据占位 -->
          <template #empty>
            <div class="flex flex-col items-center justify-center py-12 px-4">
              <p class="text-lg font-medium text-color mb-2">暂无服务器数据</p>
              <p class="text-sm text-muted-color text-center max-w-md">
                {{
                  loading
                    ? '正在加载服务器列表...'
                    : '点击右上角"添加服务器"按钮来添加您的第一台服务器'
                }}
              </p>
            </div>
          </template>

          <!-- 选择列 -->
          <Column selectionMode="multiple" headerStyle="width: 3rem" style="width: 3rem" />

          <!-- 展开列 -->
          <Column expander style="width: 3rem" />

          <!-- 服务器名称列 -->
          <Column field="name" header="服务器名称" sortable style="min-width: 200px">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <p class="flex-1 min-w-0 space-x-1">
                  <span class="font-medium text-color">{{ data.name || '-' }}</span>
                  <span class="text-muted-color"> ({{ data.ip || '-' }}) </span>
                </p>
              </div>
            </template>
          </Column>

          <!-- 状态列 -->
          <Column field="status" header="状态" sortable style="min-width: 100px">
            <template #body="{ data }">
              <Tag
                :value="getStatusText(data.status)"
                :severity="getStatusSeverity(data.status)"
                class="text-xs"
              />
            </template>
          </Column>

          <!-- 分组列 -->
          <Column field="group" header="分组" sortable style="min-width: 120px">
            <template #body="{ data }">
              <div v-if="data.group" class="flex items-center gap-2">
                <span
                  v-if="data.group.color"
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: data.group.color }"
                />
                <span class="text-sm">{{ data.group.name }}</span>
              </div>
              <span v-else class="text-sm text-muted-color">-</span>
            </template>
          </Column>

          <!-- Agent版本列 -->
          <Column
            v-if="isAdmin"
            field="agent_version"
            header="版本"
            sortable
            style="min-width: 150px"
          >
            <template #body="{ data }">
              <div class="text-left flex gap-2 items-center">
                <div class="text-sm font-medium text-color">{{ data.agent_version || '-' }}</div>
                <Tag
                  v-if="needsUpdate(data)"
                  v-tooltip.top="'有新版本可用，点击升级'"
                  class="cursor-pointer"
                  icon="pi pi-arrow-circle-up"
                  size="small"
                  severity="info"
                  rounded
                  variant="outlined"
                  @click="showUpdateAgentDialog(data)"
                  aria-label="升级Agent版本"
                />
              </div>
            </template>
          </Column>

          <!-- 运行时间列 -->
          <Column field="uptime" header="运行时间" sortable style="min-width: 120px">
            <template #body="{ data }">
              <div class="text-left">
                <div class="text-sm font-medium text-color">{{ data.uptime || '-' }}</div>
              </div>
            </template>
          </Column>

          <!-- 操作列 -->
          <Column header="操作" style="width: 120px">
            <template #body="{ data }">
              <div class="flex items-center gap-1">
                <Button
                  icon="pi pi-pen-to-square"
                  size="small"
                  text
                  @click="emit('edit-server', data)"
                  class="hover:bg-red-50"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  severity="danger"
                  @click="confirmDelete($event, data)"
                  v-tooltip.top="'删除'"
                  :loading="props.deletingServerId === data.id"
                  class="hover:bg-red-50"
                />
              </div>
            </template>
          </Column>

          <!-- 展开行内容 -->
          <template #expansion="{ data }">
            <div
              class="p-6 bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700"
            >
              <div
                v-if="props.expandingServerId === data.id && !data._detailLoaded"
                class="flex items-center justify-center py-8"
              >
                <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
              </div>
              <div
                v-else
                class="columns-1 sm:columns-1 md:columns-2 lg:columns-2 xl:columns-3 gap-2"
              >
                <!-- 基本信息卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerBasicInfo :server="data" />
                </div>

                <!-- CPU 资源卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerCpuCard :cpu="data.cpu" />
                </div>

                <!-- 内存资源卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerMemoryCard :memory="data.memory" :memory-info="data.memoryInfo" />
                </div>

                <!-- Swap资源卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerSwapCard :swap-info="data.swapInfo" />
                </div>

                <!-- 磁盘资源卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerDiskCard :disks="data.disks" />
                </div>

                <!-- 网络资源卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerNetworkCard :networkIO="data.networkIO" :traffic="data.traffic" />
                </div>

                <!-- GPU 资源卡片 -->
                <div v-if="data.gpuInfo" class="break-inside-avoid mb-2 w-full inline-block">
                  <ServerGPUCard :gpu-info="data.gpuInfo" />
                </div>

                <!-- 进程监控卡片 -->
                <div class="break-inside-avoid mb-2 w-full inline-block">
                  <div
                    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div class="space-y-3">
                      <div class="flex items-center gap-2 mb-3">
                        <i class="pi pi-server text-primary"></i>
                        <span class="text-sm font-semibold text-color">进程监控</span>
                      </div>
                      <div
                        v-if="data.process_status && Object.keys(data.process_status).length > 0"
                        class="flex flex-wrap gap-2"
                      >
                        <Tag
                          v-for="(status, name) in data.process_status"
                          :key="name"
                          :value="name"
                          :severity="status.running ? 'success' : 'danger'"
                          :icon="status.running ? 'pi pi-check-circle' : 'pi pi-times-circle'"
                          class="cursor-help"
                          v-tooltip.top="
                            `CPU: ${status.cpu.toFixed(1)}%, Mem: ${status.memory.toFixed(1)}%`
                          "
                        />
                      </div>
                      <div v-else class="text-sm text-muted-color text-center">暂无进程监控数据</div>
                    </div>
                  </div>
                </div>

                <!-- 付费周期信息卡片 -->
                <div
                  v-if="
                    data.show_billing_cycle &&
                    (data.billing_cycle || data.price || data.expire_time)
                  "
                  class="break-inside-avoid mb-2 w-full inline-block"
                >
                  <Card>
                    <template #content>
                      <div class="space-y-3">
                        <div class="flex items-center gap-2 mb-3">
                          <i class="pi pi-calendar text-primary"></i>
                          <span class="text-sm font-semibold text-color">付费周期</span>
                        </div>
                        <div class="space-y-2 text-sm">
                          <div v-if="data.billing_cycle" class="flex justify-between">
                            <span class="text-muted-color">周期类型</span>
                            <span class="font-medium text-color">{{
                              billingCycleOptions.find((opt) => opt.value === data.billing_cycle)
                                ?.label || data.billing_cycle
                            }}</span>
                          </div>
                          <div v-if="data.custom_cycle_days" class="flex justify-between">
                            <span class="text-muted-color">自定义天数</span>
                            <span class="font-medium text-color"
                              >{{ data.custom_cycle_days }} 天</span
                            >
                          </div>
                          <div
                            v-if="data.price !== undefined && data.price !== null"
                            class="flex justify-between"
                          >
                            <span class="text-muted-color">价格</span>
                            <span class="font-medium text-color">¥{{ data.price.toFixed(2) }}</span>
                          </div>
                          <div v-if="data.expire_time" class="flex justify-between">
                            <span class="text-muted-color">到期时间</span>
                            <span class="font-medium text-color">{{
                              new Date(data.expire_time).toLocaleDateString('zh-CN')
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>

                <!-- 流量限制信息卡片 -->
                <div
                  v-if="
                    data.show_traffic_limit && (data.traffic_limit_type || data.traffic_limit_bytes)
                  "
                  class="break-inside-avoid mb-2 w-full inline-block"
                >
                  <Card>
                    <template #content>
                      <div class="space-y-3">
                        <div class="flex items-center gap-2 mb-3">
                          <i class="pi pi-chart-line text-primary"></i>
                          <span class="text-sm font-semibold text-color">流量限制</span>
                        </div>
                        <div class="space-y-2 text-sm">
                          <div v-if="data.traffic_limit_type" class="flex justify-between">
                            <span class="text-muted-color">限制类型</span>
                            <span class="font-medium text-color">{{
                              trafficLimitTypeOptions.find(
                                (opt) => opt.value === data.traffic_limit_type,
                              )?.label || data.traffic_limit_type
                            }}</span>
                          </div>
                          <div
                            v-if="data.traffic_limit_bytes && data.traffic_limit_bytes > 0"
                            class="flex justify-between"
                          >
                            <span class="text-muted-color">限制大小</span>
                            <span class="font-medium text-color"
                              >{{
                                (data.traffic_limit_bytes / (1024 * 1024 * 1024)).toFixed(2)
                              }}
                              GB</span
                            >
                          </div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>

                <!-- 流量重置周期信息卡片 -->
                <div
                  v-if="data.show_traffic_reset_cycle && data.traffic_reset_cycle"
                  class="break-inside-avoid mb-2 w-full inline-block"
                >
                  <Card>
                    <template #content>
                      <div class="space-y-3">
                        <div class="flex items-center gap-2 mb-3">
                          <i class="pi pi-refresh text-primary"></i>
                          <span class="text-sm font-semibold text-color">流量重置周期</span>
                        </div>
                        <div class="space-y-2 text-sm">
                          <div class="flex justify-between">
                            <span class="text-muted-color">重置周期</span>
                            <span class="font-medium text-color">{{
                              trafficResetCycleOptions.find(
                                (opt) => opt.value === data.traffic_reset_cycle,
                              )?.label || data.traffic_reset_cycle
                            }}</span>
                          </div>
                          <div v-if="data.traffic_custom_cycle_days" class="flex justify-between">
                            <span class="text-muted-color">自定义天数</span>
                            <span class="font-medium text-color"
                              >{{ data.traffic_custom_cycle_days }} 天</span
                            >
                          </div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>

                <!-- CPU负载图表 -->
                <div class="break-inside-avoid mb-2 w-full inline-block md:[column-span:all]">
                  <ServerMetricsChart
                    :ref="
                      (el) => {
                        if (el) {
                          if (!chartRefs[data.id]) {
                            chartRefs[data.id] = {}
                          }
                          chartRefs[data.id].cpu = el as InstanceType<typeof ServerMetricsChart>
                        }
                      }
                    "
                    :server-id="data.id"
                    chart-type="cpu"
                    :data="metricsData[data.id]?.cpu || []"
                    :time-range="chartTimeRange[data.id]?.cpu || 1"
                    @update:time-range="(value) => updateChartTimeRange(data.id, 'cpu', value)"
                  />
                </div>

                <!-- 内存负载图表 -->
                <div class="break-inside-avoid mb-2 w-full inline-block md:[column-span:all]">
                  <ServerMetricsChart
                    :ref="
                      (el) => {
                        if (el) {
                          if (!chartRefs[data.id]) {
                            chartRefs[data.id] = {}
                          }
                          chartRefs[data.id].memory = el as InstanceType<typeof ServerMetricsChart>
                        }
                      }
                    "
                    :server-id="data.id"
                    chart-type="memory"
                    :data="metricsData[data.id]?.memory || []"
                    :time-range="chartTimeRange[data.id]?.memory || 1"
                    @update:time-range="(value) => updateChartTimeRange(data.id, 'memory', value)"
                  />
                </div>

                <!-- 磁盘读写负载图表 -->
                <div class="break-inside-avoid mb-2 w-full inline-block md:[column-span:all]">
                  <ServerMetricsChart
                    :ref="
                      (el) => {
                        if (el) {
                          if (!chartRefs[data.id]) {
                            chartRefs[data.id] = {}
                          }
                          chartRefs[data.id].disk = el as InstanceType<typeof ServerMetricsChart>
                        }
                      }
                    "
                    :server-id="data.id"
                    chart-type="disk"
                    :data="metricsData[data.id]?.disk || []"
                    :time-range="chartTimeRange[data.id]?.disk || 1"
                    @update:time-range="(value) => updateChartTimeRange(data.id, 'disk', value)"
                  />
                </div>

                <!-- 网络IO负载图表 -->
                <div class="break-inside-avoid mb-2 w-full inline-block md:[column-span:all]">
                  <ServerMetricsChart
                    :ref="
                      (el) => {
                        if (el) {
                          if (!chartRefs[data.id]) {
                            chartRefs[data.id] = {}
                          }
                          chartRefs[data.id].network = el as InstanceType<typeof ServerMetricsChart>
                        }
                      }
                    "
                    :server-id="data.id"
                    chart-type="network"
                    :data="metricsData[data.id]?.network || []"
                    :time-range="chartTimeRange[data.id]?.network || 1"
                    @update:time-range="(value) => updateChartTimeRange(data.id, 'network', value)"
                  />
                </div>
              </div>
            </div>
          </template>
        </DataTable>
      </template>
    </Card>
    <ConfirmPopup />

    <!-- Agent 更新对话框 -->
    <Dialog
      v-model:visible="showUpdateDialog"
      modal
      header="更新 Agent"
      :style="{ width: '500px' }"
      :draggable="false"
    >
      <div v-if="selectedServerForUpdate" class="flex flex-col gap-4">
        <div>
          <p class="text-sm text-color-secondary mb-2">服务器信息</p>
          <p class="font-medium">
            {{ selectedServerForUpdate.name }} ({{ selectedServerForUpdate.ip }})
          </p>
        </div>

        <div>
          <p class="text-sm text-color-secondary mb-2">当前版本</p>
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ selectedServerForUpdate.agent_version || '-' }}</span>
            <Tag
              v-if="selectedServerForUpdate.agent_version"
              :value="
                getVersionTypeConfig(
                  parseVersion(selectedServerForUpdate.agent_version).versionType,
                ).label
              "
              :severity="
                getVersionTypeConfig(
                  parseVersion(selectedServerForUpdate.agent_version).versionType,
                ).severity
              "
              size="small"
            />
          </div>
        </div>

        <div>
          <p class="text-sm text-color-secondary mb-2">最新版本</p>
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ latestAgentVersion || '-' }}</span>
            <Tag
              v-if="latestAgentVersionType"
              :value="getVersionTypeConfig(latestAgentVersionType).label"
              :severity="getVersionTypeConfig(latestAgentVersionType).severity"
              size="small"
            />
          </div>
          <div
            v-if="latestAgentVersionType && latestAgentVersionType !== 'release'"
            class="flex items-center gap-2 text-orange-500 text-sm mt-1"
          >
            <i class="pi pi-exclamation-triangle"></i>
            <span>此版本为非正式版，可能包含实验性功能或大量缺陷，请谨慎更新</span>
          </div>
        </div>

        <div class="mt-2">
          <p class="text-sm text-color-secondary">
            确认后，系统将向 Agent 发送更新指令，Agent 将自动下载并安装新版本。
          </p>
        </div>
      </div>

      <template #footer>
        <Button
          label="取消"
          text
          @click="showUpdateDialog = false"
          :disabled="updatingAgentId !== ''"
        />
        <Button
          label="确认更新"
          icon="pi pi-check"
          @click="confirmUpdateAgent"
          :loading="updatingAgentId !== ''"
        />
      </template>
    </Dialog>
  </div>
</template>
<style scoped>
/* 固定操作列在右侧 */
:deep(.p-datatable-scrollable) {
  position: relative;
}

:deep(.p-datatable-scrollable-header table thead tr th:last-child),
:deep(.p-datatable-scrollable-body table tbody tr td:last-child) {
  position: sticky !important;
  right: 0 !important;
  z-index: 10;
}

:deep(.p-datatable-scrollable-header table thead tr th:last-child) {
  z-index: 20;
}
</style>
