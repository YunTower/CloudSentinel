<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NEmpty, NButton, useMessage } from 'naive-ui'
import { RiArrowLeftLine, RiWrenchLine } from '@remixicon/vue'
import serversApi from '@/apis/servers'
import type { Server, ServerForm, MetricsData } from '@/types/manager/servers'
import type { ExtendedServerDetailData } from '@/types/manager/servers'
import type { ServerDetailResponse } from '@/types/manager/servers'
import type { UpdateServerResponse } from '@/types/manager/servers'
import BasicInfo from './components/detail/BasicInfo.vue'
import ServerDialog from './components/ServerDialog.vue'
import CpuCard from './components/detail/CpuCard.vue'
import MemoryCard from './components/detail/MemoryCard.vue'
import SwapCard from './components/detail/SwapCard.vue'
import DiskCard from './components/detail/DiskCard.vue'
import NetworkCard from './components/detail/NetworkCard.vue'
import GPUCard from './components/detail/GPUCard.vue'
import MetricsChart from './components/detail/MetricsChart.vue'
import ProcessCard from '@/views/manager/servers/components/detail/ProcessCard.vue'

/** 将 API 详情数据转换为页面使用的 Server 类型 */
function detailToServer(detail: ExtendedServerDetailData): Server {
  const cpu = detail.cpus?.length
    ? detail.cpus.reduce((s, c) => s + c.cpu_usage, 0) / detail.cpus.length
    : 0
  const memory = detail.memory?.memory_usage_percent ?? 0
  const disk = detail.disks?.length ? detail.disks[0].usage_percent : 0
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
    billing_cycle: detail.billing_cycle,
    custom_cycle_days: detail.custom_cycle_days,
    price: detail.price,
    expire_time: detail.expire_time,
    traffic_limit_type: detail.traffic_limit_type,
    traffic_limit_bytes: detail.traffic_limit_bytes,
    traffic_reset_cycle: detail.traffic_reset_cycle,
    traffic_custom_cycle_days: detail.traffic_custom_cycle_days,
    show_billing_cycle: detail.show_billing_cycle,
    show_traffic_limit: detail.show_traffic_limit,
    show_traffic_reset_cycle: detail.show_traffic_reset_cycle,
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
const error = ref<string | null>(null)
const showServerDialog = ref(false)
const saving = ref(false)

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

const billingCycleOptions = [
  { label: '月付', value: 'monthly' },
  { label: '季付', value: 'quarterly' },
  { label: '年付', value: 'yearly' },
  { label: '一次性', value: 'one_time' },
  { label: '自定义', value: 'custom' },
]
const trafficLimitTypeOptions = [
  { label: '无限制', value: 'unlimited' },
  { label: '周期', value: 'periodic' },
]
const trafficResetCycleOptions = [
  { label: '每月', value: 'monthly' },
  { label: '每季度', value: 'quarterly' },
  { label: '每年', value: 'yearly' },
  { label: '自定义', value: 'custom' },
]

const loadMetrics = async (type: 'cpu' | 'memory' | 'disk' | 'network', hours: number = 24) => {
  const id = serverId.value
  if (!id) return
  const endTime = Math.floor(Date.now() / 1000)
  const startTime = endTime - hours * 60 * 60
  type MetricItem = { timestamp: number; [key: string]: number }
  let response: { status: boolean; data?: MetricItem[] } | null = null
  try {
    switch (type) {
      case 'cpu':
        response = (await serversApi.getServerMetricsCPU(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as { status: boolean; data?: Array<{ timestamp: number; cpu_usage: number }> }
        break
      case 'memory':
        response = (await serversApi.getServerMetricsMemory(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as { status: boolean; data?: Array<{ timestamp: number; memory_usage: number }> }
        break
      case 'disk':
        response = (await serversApi.getServerMetricsDisk(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as {
          status: boolean
          data?: Array<{ timestamp: number; disk_read: number; disk_write: number }>
        }
        break
      case 'network':
        response = (await serversApi.getServerMetricsNetwork(
          id,
          startTime.toString(),
          endTime.toString(),
        )) as {
          status: boolean
          data?: Array<{ timestamp: number; network_upload: number; network_download: number }>
        }
        break
    }
    if (response?.status && response.data) {
      const converted: MetricsData[] = response.data.map((item) => {
        let timestamp: number
        if (typeof item.timestamp === 'string') {
          timestamp = Math.floor(new Date(item.timestamp).getTime() / 1000)
        } else if (typeof item.timestamp === 'number') {
          timestamp = item.timestamp
        } else {
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
    const response = (await serversApi.getServerDetail(id)) as ServerDetailResponse
    if (!response.status || !response.data) {
      throw new Error(response.message || '获取服务器详情失败')
    }
    server.value = detailToServer(response.data as ExtendedServerDetailData)
    await Promise.all([
      loadMetrics('cpu', chartTimeRange.value.cpu),
      loadMetrics('memory', chartTimeRange.value.memory),
      loadMetrics('disk', chartTimeRange.value.disk),
      loadMetrics('network', chartTimeRange.value.network),
    ])
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
    server.value = null
  } finally {
    loading.value = false
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

onMounted(() => {
  loadDetail()
})

watch(serverId, (id) => {
  if (id) loadDetail()
})
</script>

<template>
  <div class="server-detail-view">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <n-button quaternary circle @click="goBack" title="返回列表">
          <template #icon>
            <ri-arrow-left-line />
          </template>
        </n-button>
        <h1 class="text-2xl font-bold text-color">{{ server?.name || '加载中' }}</h1>
      </div>
      <n-button
        type="primary"
        secondary
        :disabled="!server"
        @click="openServerDialog"
      >
        <template #icon>
          <ri-wrench-line />
        </template>
        服务器设置
      </n-button>
    </div>

    <n-spin :show="loading">
      <template v-if="error">
        <n-empty :description="error" class="py-12">
          <template #extra>
            <n-button type="primary" @click="loadDetail">重试</n-button>
          </template>
        </n-empty>
      </template>

      <template v-else-if="server">
        <div class="w-full columns-1 md:columns-2 gap-2 space-y-2">
          <!-- 基本信息 -->
          <div class="break-inside-avoid w-full min-w-0">
            <basic-info :server="server" />
          </div>
          <div class="break-inside-avoid w-full min-w-0">
            <cpu-card :cpu="server.cpu" />
          </div>
          <div class="break-inside-avoid w-full min-w-0">
            <memory-card :memory="server.memory" :memory-info="server.memoryInfo" />
          </div>
          <div class="break-inside-avoid w-full min-w-0">
            <swap-card :swap-info="server.swapInfo" />
          </div>
          <div class="break-inside-avoid w-full min-w-0">
            <disk-card :disks="server.disks" />
          </div>
          <div class="break-inside-avoid w-full min-w-0">
            <network-card :network-i-o="server.networkIO" :traffic="server.traffic" />
          </div>

          <!-- GPU -->
          <div v-if="server.gpuInfo" class="break-inside-avoid w-full min-w-0">
            <g-p-u-card :gpu-info="server.gpuInfo" />
          </div>

          <!-- 进程监控 -->
          <div class="break-inside-avoid w-full min-w-0">
            <process-card :process-status="server.process_status" />
          </div>

          <!-- 付费周期 -->
          <div
            v-if="
              server.show_billing_cycle &&
              (server.billing_cycle || server.price != null || server.expire_time)
            "
            class="break-inside-avoid w-full min-w-0"
          >
            <div
              class="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div class="mb-3 flex items-center gap-2">
                <i class="ri-calendar-line text-primary" />
                <span class="text-sm font-semibold text-color">付费周期</span>
              </div>
              <div class="space-y-2 text-sm">
                <div v-if="server.billing_cycle" class="flex justify-between">
                  <span class="text-muted-color">周期类型</span>
                  <span class="font-medium text-color">
                    {{
                      billingCycleOptions.find((o) => o.value === server!.billing_cycle)?.label ??
                      server.billing_cycle
                    }}
                  </span>
                </div>
                <div v-if="server.price != null" class="flex justify-between">
                  <span class="text-muted-color">价格</span>
                  <span class="font-medium text-color">¥{{ server.price.toFixed(2) }}</span>
                </div>
                <div v-if="server.expire_time" class="flex justify-between">
                  <span class="text-muted-color">到期时间</span>
                  <span class="font-medium text-color">
                    {{ new Date(server.expire_time).toLocaleDateString('zh-CN') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 流量限制 -->
          <div
            v-if="
              server.show_traffic_limit &&
              (server.traffic_limit_type || (server.traffic_limit_bytes ?? 0) > 0)
            "
            class="break-inside-avoid w-full min-w-0"
          >
            <div
              class="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div class="mb-3 flex items-center gap-2">
                <i class="ri-line-chart-line text-primary" />
                <span class="text-sm font-semibold text-color">流量限制</span>
              </div>
              <div class="space-y-2 text-sm">
                <div v-if="server.traffic_limit_type" class="flex justify-between">
                  <span class="text-muted-color">限制类型</span>
                  <span class="font-medium text-color">
                    {{
                      trafficLimitTypeOptions.find((o) => o.value === server!.traffic_limit_type)
                        ?.label ?? server.traffic_limit_type
                    }}
                  </span>
                </div>
                <div
                  v-if="server.traffic_limit_bytes != null && server.traffic_limit_bytes > 0"
                  class="flex justify-between"
                >
                  <span class="text-muted-color">限制大小</span>
                  <span class="font-medium text-color">
                    {{ (server.traffic_limit_bytes / (1024 * 1024 * 1024)).toFixed(2) }}
                    GB
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 流量重置周期 -->
          <div
            v-if="server.show_traffic_reset_cycle && server.traffic_reset_cycle"
            class="break-inside-avoid w-full min-w-0"
          >
            <div
              class="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div class="mb-3 flex items-center gap-2">
                <i class="ri-refresh-line text-primary" />
                <span class="text-sm font-semibold text-color">流量重置周期</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-color">重置周期</span>
                <span class="font-medium text-color">
                  {{
                    trafficResetCycleOptions.find((o) => o.value === server?.traffic_reset_cycle)
                      ?.label ?? server?.traffic_reset_cycle
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="mt-2 grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-2">
            <metrics-chart
              :server-id="server.id"
              chart-type="cpu"
              :data="metricsData.cpu ?? []"
              :time-range="chartTimeRange.cpu"
              @update:time-range="(h: number) => updateChartTimeRange('cpu', h)"
            />
            <metrics-chart
              :server-id="server.id"
              chart-type="memory"
              :data="metricsData.memory ?? []"
              :time-range="chartTimeRange.memory"
              @update:time-range="(h: number) => updateChartTimeRange('memory', h)"
            />
          </div>
          <div class="flex flex-col gap-2">
            <metrics-chart
              :server-id="server.id"
              chart-type="disk"
              :data="metricsData.disk ?? []"
              :time-range="chartTimeRange.disk"
              @update:time-range="(h: number) => updateChartTimeRange('disk', h)"
            />
            <metrics-chart
              :server-id="server.id"
              chart-type="network"
              :data="metricsData.network ?? []"
              :time-range="chartTimeRange.network"
              @update:time-range="(h: number) => updateChartTimeRange('network', h)"
            />
          </div>
        </div>
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
}
</style>
