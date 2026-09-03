<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NEmpty, NButton, useMessage } from 'naive-ui'
import { RiArrowLeftLine, RiLineChartLine, RiWrenchLine } from '@remixicon/vue'
import serversApi from '@/admin/apis/servers.ts'
import { useWebSocket } from '@/admin/composables/useWebSocket'
import { serverTopic } from '@/admin/services/websocket-manager'
import type {
  Server,
  ServerForm,
  MetricsData,
  ProcessStatus,
} from '@/shared/types/manager/servers'
import type { ExtendedServerDetailData } from '@/shared/types/manager/servers'
import type { ServerDetailResponse } from '@/shared/types/manager/servers'
import type { UpdateServerResponse } from '@/shared/types/manager/servers'
import BasicInfo from './components/detail/BasicInfo.vue'
import ServerDialog from './components/ServerDialog.vue'
import CpuCard from './components/detail/CpuCard.vue'
import MemoryCard from './components/detail/MemoryCard.vue'
import SwapCard from './components/detail/SwapCard.vue'
import DiskCard from './components/detail/DiskCard.vue'
import NetworkCard from './components/detail/NetworkCard.vue'
import GPUCard from './components/detail/GPUCard.vue'
import MetricsChart from './components/detail/MetricsChart.vue'
import ProcessCard from '@/admin/views/servers/components/detail/ProcessCard.vue'
import { formatTrafficLimitGb, getTrafficCycleLabel } from '@/shared/utils/billing.ts'
import { parseMetricsTimestamp } from '@/shared/utils/metricsTimestamp.ts'

/** 将 API 详情数据转换为页面使用的 Server 类型 */
function detailToServer(detail: ExtendedServerDetailData): Server {
  const cpu = detail.cpus?.length
    ? detail.cpus.reduce((s, c) => s + c.cpu_usage, 0) / detail.cpus.length
    : 0
  const memory = detail.memory?.memory_usage_percent ?? 0
  const disk = detail.disks?.length ? Math.max(...detail.disks.map((d) => d.usage_percent)) : 0
  return {
    id: detail.id,
    name: detail.name,
    ip: detail.ip,
    status: detail.status,
    location: detail.location ?? '',
    os: detail.os ?? '',
    architecture: detail.architecture ?? '',
    kernel: detail.kernel ?? '',
    hostname: detail.hostname ?? '',
    uptime: detail.uptime ?? '',
    uptimeSeconds:
      typeof detail.uptime_seconds === 'number' && detail.uptime_seconds > 0
        ? detail.uptime_seconds
        : undefined,
    uptimeSyncedAt: Date.now(),
    cpu,
    memory,
    disk,
    networkIO: {
      upload: detail.traffic?.upload_bytes ?? 0,
      download: detail.traffic?.download_bytes ?? 0,
    },
    disks: detail.disks,
    cpus: detail.cpus,
    memoryInfo: detail.memory,
    swapInfo: detail.swap,
    traffic: detail.traffic,
    gpuInfo: detail.gpuInfo,
    group_id: detail.group_id,
    group: detail.group,
    billing: detail.billing || {},
    network: detail.network || {},
    process_status: detail.service_status ?? {},
    createdAt: detail.created_at ?? '',
    updatedAt: detail.updated_at ?? '',
    _detailLoaded: true,
  }
}

const route = useRoute()
const router = useRouter()
const message = useMessage()
const serverId = computed(() => route.params.id as string)

const server = ref<Server | null>(null)
const loading = ref(true)
const metricsLoading = ref(false)
const error = ref<string | null>(null)
const showServerDialog = ref(false)
const saving = ref(false)

const activeTab = ref<'overview' | 'resource' | 'process'>('overview')

const metricsData = ref<{
  cpu?: MetricsData[]
  memory?: MetricsData[]
  disk?: MetricsData[]
  network?: MetricsData[]
}>({})
const chartTimeRange = ref({
  cpu: 1,
  memory: 1,
  disk: 1,
  network: 1,
})

/** 追加一个实时指标点，并裁剪掉当前时间范围窗口之外的历史点 */
const appendMetricsPoint = (
  type: 'cpu' | 'memory' | 'disk' | 'network',
  point: Partial<MetricsData>,
) => {
  const nowSec = Math.floor(Date.now() / 1000)
  const arr = [...(metricsData.value[type] ?? [])]
  arr.push({
    timestamp: nowSec,
    cpu_usage: 0,
    memory_usage: 0,
    network_upload: 0,
    network_download: 0,
    ...point,
  })
  const cutoff = nowSec - chartTimeRange.value[type] * 3600
  while (arr.length > 0 && arr[0].timestamp < cutoff) arr.shift()
  metricsData.value[type] = arr
}

const websocket = useWebSocket({
  onMetricsUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (data.uptime_seconds !== undefined) {
      current.uptimeSeconds = data.uptime_seconds
      current.uptimeSyncedAt = Date.now()
    }
    if (activeTab.value === 'overview') {
      if (data.cpu_usage !== undefined) current.cpu = data.cpu_usage
      if (data.memory_usage !== undefined) current.memory = data.memory_usage
    } else if (activeTab.value === 'resource') {
      appendMetricsPoint('cpu', { cpu_usage: data.cpu_usage ?? 0 })
      appendMetricsPoint('memory', { memory_usage: data.memory_usage ?? 0 })
      appendMetricsPoint('network', {
        network_upload: data.network_upload ?? 0,
        network_download: data.network_download ?? 0,
      })
      current.networkIO = {
        upload: data.network_upload ?? 0,
        download: data.network_download ?? 0,
      }
    }
  },
  onSystemInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'overview' || !data.data) return
    if (data.data.os) current.os = data.data.os
    if (data.data.architecture) current.architecture = data.data.architecture
    if (data.data.kernel) current.kernel = data.data.kernel
    if (data.data.hostname) current.hostname = data.data.hostname
  },
  onMemoryInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'overview' || !data.memory) return
    current.memoryInfo = {
      memory_total: data.memory.memory_total ?? 0,
      memory_used: data.memory.memory_used ?? 0,
      memory_usage_percent: data.memory.memory_usage_percent ?? 0,
    }
  },
  onDiskInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'resource' || !data.disks) return
    current.disks = data.disks.map((disk) => ({
      disk_name: disk.disk_name ?? '',
      mount_point: disk.mount_point ?? '',
      total_size: disk.total_size ?? 0,
      used_size: disk.used_size ?? 0,
      free_size: disk.free_size ?? 0,
      usage_percent: disk.usage_percent ?? 0,
    }))
  },
  onDiskIOUpdate: (data) => {
    if (!server.value || data.server_id !== serverId.value) return
    if (activeTab.value !== 'resource') return
    appendMetricsPoint('disk', {
      disk_read: data.disk_io?.read_speed ?? 0,
      disk_write: data.disk_io?.write_speed ?? 0,
    })
  },
  onNetworkInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'resource' || !data.network) return
    if (data.network.upload_bytes !== undefined || data.network.download_bytes !== undefined) {
      current.traffic = {
        upload_bytes: data.network.upload_bytes ?? current.traffic?.upload_bytes ?? 0,
        download_bytes: data.network.download_bytes ?? current.traffic?.download_bytes ?? 0,
      }
    }
  },
  onSwapInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'resource' || !data.swap) return
    current.swapInfo = {
      swap_total: data.swap.swap_total ?? 0,
      swap_used: data.swap.swap_used ?? 0,
      swap_free: data.swap.swap_free ?? 0,
      swap_usage_percent: data.swap.swap_usage_percent ?? 0,
    }
  },
  onGPUInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'resource' || !data.gpuInfo) return
    current.gpuInfo = data.gpuInfo
  },
  onProcessInfoUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    if (activeTab.value !== 'process' || !data.data) return
    const status: Record<string, ProcessStatus> = {}
    for (const [name, info] of Object.entries(data.data)) {
      status[name] = {
        name,
        running: info.running,
        pids: info.pids,
        cpu: info.cpu,
        memory: info.memory,
      }
    }
    current.process_status = status
  },
  onServerStatusUpdate: (data) => {
    const current = server.value
    if (!current || data.server_id !== serverId.value) return
    current.status = data.status
  },
})

const loadMetrics = async (type: 'cpu' | 'memory' | 'disk' | 'network', hours: number = 24) => {
  const id = serverId.value
  if (!id) return
  const endTime = Math.floor(Date.now() / 1000)
  const startTime = endTime - hours * 60 * 60
  type MetricItem = {
    timestamp?: string | number
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    disk_read?: number
    disk_write?: number
    network_upload?: number
    network_download?: number
  }
  let response: { status: boolean; data?: MetricItem[] } | null = null
  try {
    switch (type) {
      case 'cpu':
        response = (await serversApi.getServerMetricsCPU(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as { status: boolean; data?: MetricItem[] }
        break
      case 'memory':
        response = (await serversApi.getServerMetricsMemory(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as { status: boolean; data?: MetricItem[] }
        break
      case 'disk':
        response = (await serversApi.getServerMetricsDisk(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as { status: boolean; data?: MetricItem[] }
        break
      case 'network':
        response = (await serversApi.getServerMetricsNetwork(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as { status: boolean; data?: MetricItem[] }
        break
    }
    if (response?.status && response.data) {
      const converted: MetricsData[] = response.data.map((item) => ({
        timestamp: parseMetricsTimestamp(item.timestamp),
        cpu_usage: item.cpu_usage ?? 0,
        memory_usage: item.memory_usage ?? 0,
        disk_usage: item.disk_usage ?? 0,
        disk_read: item.disk_read ?? 0,
        disk_write: item.disk_write ?? 0,
        network_upload: item.network_upload ?? 0,
        network_download: item.network_download ?? 0,
      }))
      metricsData.value[type] = converted
    } else {
      metricsData.value[type] = []
    }
  } catch (e) {
    console.error(`加载${type}指标失败:`, e)
    metricsData.value[type] = []
  }
}

const updateChartTimeRange = async (type: 'cpu' | 'memory' | 'disk' | 'network', hours: number) => {
  chartTimeRange.value[type] = hours
  await loadMetrics(type, hours)
}

const loadDetail = async () => {
  const id = serverId.value
  if (!id) {
    error.value = '缺少服务器 ID'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    // 详情页不索取明文 agent_key（安装命令在对话框“操作”页按需拉取）
    const response = (await serversApi.getServerDetail(id, false)) as ServerDetailResponse
    if (!response.status || !response.data) {
      throw new Error(response.message || '获取服务器详情失败')
    }
    server.value = detailToServer(response.data as ExtendedServerDetailData)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
    server.value = null
  } finally {
    loading.value = false
  }
}

const requestResourceMetrics = async () => {
  if (!server.value) return
  metricsLoading.value = true
  try {
    await Promise.all([
      loadMetrics('cpu', chartTimeRange.value.cpu),
      loadMetrics('memory', chartTimeRange.value.memory),
      loadMetrics('disk', chartTimeRange.value.disk),
      loadMetrics('network', chartTimeRange.value.network),
    ])
  } finally {
    metricsLoading.value = false
  }
}

const goBack = () => {
  router.push('/servers')
}

const openServerDialog = () => {
  if (server.value) showServerDialog.value = true
}

const handleSaveServer = async (form: ServerForm & { clear_group?: boolean }) => {
  if (!server.value) return
  saving.value = true
  try {
    const response = (await serversApi.updateServer(server.value.id, form)) as UpdateServerResponse
    if (response.status) {
      message.success('服务器信息已更新', { duration: 3000 })
      showServerDialog.value = false
      await loadDetail()
    } else {
      throw new Error(response.message || '更新失败')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '更新失败'
    message.error(msg, { duration: 3000 })
  } finally {
    saving.value = false
  }
}

const handleCancelDialog = () => {
  showServerDialog.value = false
}

// 服务器专属主题订阅：页面只接收当前这台服务器的实时推送。
// 切换服务器（serverId 变化）时先退订旧主题再订阅新主题。
let subscribedServerId: string | null = null

const updateServerSubscription = (id: string | null | undefined): void => {
  const next = id ?? null
  if (subscribedServerId === next) return
  if (subscribedServerId) {
    websocket.unsubscribe([serverTopic(subscribedServerId)])
  }
  subscribedServerId = next
  if (next) {
    websocket.subscribe([serverTopic(next)])
  }
}

onMounted(() => {
  loadDetail()
  websocket.connect()
  updateServerSubscription(serverId.value)
})

onUnmounted(() => {
  updateServerSubscription(null)
})

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'resource') {
      await loadDetail()
      await requestResourceMetrics()
      return
    }

    if (tab === 'overview' || tab === 'process') {
      await loadDetail()
    }
  },
)

watch(serverId, async (id) => {
  updateServerSubscription(id)
  if (!id) return
  await loadDetail()
  if (activeTab.value === 'resource') {
    await requestResourceMetrics()
  }
})
</script>

<template>
  <div class="server-detail-view">
    <div class="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div class="flex min-w-0 items-center gap-2">
        <n-button quaternary circle @click="goBack" title="返回列表">
          <template #icon>
            <ri-arrow-left-line />
          </template>
        </n-button>
        <div class="min-w-0">
          <n-h3 class="!mb-0 truncate">{{ server?.name || '加载中' }}</n-h3>
          <n-text v-if="server" depth="3">{{ server.ip || '-' }}</n-text>
        </div>
      </div>
      <n-button type="primary" secondary :disabled="!server" @click="openServerDialog">
        <template #icon>
          <ri-wrench-line />
        </template>
        服务器设置
      </n-button>
    </div>

    <n-spin :show="loading || metricsLoading">
      <template v-if="error">
        <n-empty :description="error" class="py-12">
          <template #extra>
            <n-button type="primary" @click="loadDetail">重试</n-button>
          </template>
        </n-empty>
      </template>

      <template v-else-if="server">
        <n-tabs v-model:value="activeTab" type="line" animated class="server-detail-tabs">
          <n-tab-pane name="overview" tab="概览">
            <div class="server-detail-overview">
              <div class="mb-2">
                <basic-info :server="server" />
              </div>
              <div class="server-detail-overview-cards">
                <cpu-card :cpu="server.cpu" />
                <memory-card :memory="server.memory" :memory-info="server.memoryInfo" />
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="resource" tab="资源" display-directive="show:lazy">
            <div class="server-detail-masonry server-detail-masonry--resource">
              <div class="server-detail-masonry-item">
                <metrics-chart
                  :server-id="server.id"
                  chart-type="cpu"
                  :data="metricsData.cpu ?? []"
                  :time-range="chartTimeRange.cpu"
                  @update:time-range="(h: number) => updateChartTimeRange('cpu', h)"
                />
              </div>
              <div class="server-detail-masonry-item">
                <metrics-chart
                  :server-id="server.id"
                  chart-type="memory"
                  :data="metricsData.memory ?? []"
                  :time-range="chartTimeRange.memory"
                  @update:time-range="(h: number) => updateChartTimeRange('memory', h)"
                />
              </div>
              <div class="server-detail-masonry-item">
                <metrics-chart
                  :server-id="server.id"
                  chart-type="disk"
                  :data="metricsData.disk ?? []"
                  :time-range="chartTimeRange.disk"
                  @update:time-range="(h: number) => updateChartTimeRange('disk', h)"
                />
              </div>
              <div class="server-detail-masonry-item">
                <metrics-chart
                  :server-id="server.id"
                  chart-type="network"
                  :data="metricsData.network ?? []"
                  :time-range="chartTimeRange.network"
                  @update:time-range="(h: number) => updateChartTimeRange('network', h)"
                />
              </div>
              <div class="server-detail-masonry-item">
                <disk-card :disks="server.disks" />
              </div>
              <div class="server-detail-masonry-item">
                <network-card :network-i-o="server.networkIO" :traffic="server.traffic" />
              </div>
              <div class="server-detail-masonry-item">
                <swap-card :swap-info="server.swapInfo" />
              </div>
              <div v-if="server.gpuInfo" class="server-detail-masonry-item">
                <g-p-u-card :gpu-info="server.gpuInfo" />
              </div>
              <div
                class="server-detail-masonry-item"
                v-if="
                  (server.billing?.traffic_limit_bytes ?? 0) > 0 ||
                  server.billing?.traffic_limit_type ||
                  server.billing?.traffic_reset_cycle
                "
              >
                <n-card size="small" :bordered="false">
                  <n-thing>
                    <template #avatar>
                      <n-icon :component="RiLineChartLine" />
                    </template>
                    <template #header>流量信息</template>
                    <n-descriptions :column="1" label-placement="left">
                      <n-descriptions-item
                        v-if="(server.billing?.traffic_limit_bytes ?? 0) > 0"
                        label="流量额度"
                      >
                        {{ formatTrafficLimitGb(server.billing?.traffic_limit_bytes) }}
                      </n-descriptions-item>
                      <n-descriptions-item
                        v-if="
                          getTrafficCycleLabel(
                            server.billing?.traffic_reset_cycle,
                            server.billing?.traffic_custom_cycle_days,
                            server.billing?.traffic_limit_type,
                          ) !== '-'
                        "
                        label="流量周期"
                      >
                        {{
                          getTrafficCycleLabel(
                            server.billing?.traffic_reset_cycle,
                            server.billing?.traffic_custom_cycle_days,
                            server.billing?.traffic_limit_type,
                          )
                        }}
                      </n-descriptions-item>
                    </n-descriptions>
                  </n-thing>
                </n-card>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="process" tab="进程">
            <process-card :process-status="server.process_status" />
          </n-tab-pane>
        </n-tabs>
      </template>
    </n-spin>

    <server-dialog
      v-model:visible="showServerDialog"
      :editing-server="server"
      :saving="saving"
      @save="handleSaveServer"
      @cancel="handleCancelDialog"
    />
  </div>
</template>

<style scoped>
.server-detail-view {
  margin: 0 auto;
  min-width: 0;
  width: 100%;
}

.server-detail-tabs :deep(.n-tab-pane) {
  padding-top: 12px;
}

.server-detail-overview-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* 对应 gap-2 */
}

.server-detail-masonry {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* 对应 gap-2 的体感间距 */
}

.server-detail-masonry-item {
  width: 100%;
  margin-bottom: 0;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

@media (min-width: 1024px) {
  .server-detail-overview-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem; /* 对应 gap-2 */
    align-items: start; /* 防止卡片被对侧高度拉伸 */
  }

  .server-detail-masonry {
    display: block;
    column-count: 2;
    column-gap: 0.5rem; /* 对应 gap-2 的体感间距 */
  }

  .server-detail-masonry-item {
    display: inline-block; /* 列布局所需的呈现方式 */
    margin-bottom: 0.5rem; /* 列内纵向间距 */
  }
}
</style>
