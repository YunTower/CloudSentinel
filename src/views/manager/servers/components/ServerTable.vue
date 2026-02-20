<script setup lang="ts">
import { ref, nextTick, computed, h, defineComponent } from 'vue'
import { NTag, NSpin, NButton, NEmpty, type PaginationInfo, type DataTableColumn } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
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
import { RiEditLine, RiDeleteBinLine } from '@remixicon/vue'

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

// Map PrimeVue severity to Naive UI NTag type
const severityToNaiveType = (
  severity: string,
): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  const map: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    success: 'success',
    danger: 'error',
    secondary: 'default',
    warning: 'warning',
    warn: 'warning',
    info: 'info',
  }
  return map[severity] ?? 'default'
}

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.role === 'admin')
const message = useMessage()
const dialog = useDialog()

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
    message.success('更新命令已发送，Agent 将自动更新', { duration: 3000 })
    showUpdateDialog.value = false
    selectedServerForUpdate.value = null
    emit('update-agent', server)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '更新失败'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    updatingAgentId.value = ''
  }
}

const expandedRowKeys = ref<string[]>([])
const pendingExpandServerId = ref<string>('')
const checkedRowKeys = ref<string[]>([])

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
const handleExpandChange = (keys: string[]) => {
  const newKey = keys.find((k) => !expandedRowKeys.value.includes(k))
  if (newKey) {
    if (props.expandingServerId === newKey) {
      expandedRowKeys.value = keys
      return
    }
    pendingExpandServerId.value = newKey
    emit('expand-server', newKey)
  }
  expandedRowKeys.value = keys
}

// 处理选中行变化
const handleCheckedRowsChange = (keys: string[], rows: Server[]) => {
  checkedRowKeys.value = keys
  emit('selection-change', rows)
}

// 确认展开
const confirmExpand = async (serverId: string) => {
  if (!expandedRowKeys.value.includes(serverId)) {
    expandedRowKeys.value = [...expandedRowKeys.value, serverId]
  }
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
  expandedRowKeys.value = expandedRowKeys.value.filter((k) => k !== serverId)
  pendingExpandServerId.value = ''
}

// 自动展开指定服务器详情
const autoExpandServer = (serverId: string) => {
  const server = props.servers.find((s) => s.id === serverId)
  if (server) {
    pendingExpandServerId.value = serverId
    if (!expandedRowKeys.value.includes(serverId)) {
      expandedRowKeys.value = [...expandedRowKeys.value, serverId]
    }
    emit('expand-server', serverId)
  }
}

// 确认删除
const confirmDelete = (_event: MouseEvent, server: Server) => {
  dialog.warning({
    title: '删除确认',
    content: `确定要删除服务器 "${server.name}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
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

// 展开行内容组件
const ServerExpansion = defineComponent({
  props: {
    data: { type: Object as () => Server, required: true },
    expandingServerId: { type: String, default: '' },
    metricsData: { type: Object as () => typeof metricsData.value, required: true },
    chartTimeRange: { type: Object as () => typeof chartTimeRange.value, required: true },
    chartRefs: { type: Object as () => typeof chartRefs.value, required: true },
    billingCycleOptions: {
      type: Array as () => { label: string; value: string }[],
      required: true,
    },
    trafficLimitTypeOptions: {
      type: Array as () => { label: string; value: string }[],
      required: true,
    },
    trafficResetCycleOptions: {
      type: Array as () => { label: string; value: string }[],
      required: true,
    },
  },
  emits: ['updateTimeRange'],
  setup(props, { emit }) {
    return () => {
      const data = props.data
      const isLoading = props.expandingServerId === data.id && !data._detailLoaded

      if (isLoading) {
        return h(NSpin)
      }

      const cards = [
        // 基本信息卡片
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(ServerBasicInfo, { server: data }),
        ]),
        // CPU 资源卡片
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(ServerCpuCard, { cpu: data.cpu }),
        ]),
        // 内存资源卡片
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(ServerMemoryCard, { memory: data.memory, memoryInfo: data.memoryInfo }),
        ]),
        // Swap资源卡片
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(ServerSwapCard, { swapInfo: data.swapInfo }),
        ]),
        // 磁盘资源卡片
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(ServerDiskCard, { disks: data.disks }),
        ]),
        // 网络资源卡片
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(ServerNetworkCard, { networkIO: data.networkIO, traffic: data.traffic }),
        ]),
      ]

      // GPU 资源卡片（条件渲染）
      if (data.gpuInfo) {
        cards.push(
          h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
            h(ServerGPUCard, { gpuInfo: data.gpuInfo }),
          ]),
        )
      }

      // 进程监控卡片
      cards.push(
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
          h(
            'div',
            {
              class:
                'w-full min-w-0 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow',
            },
            [
              h('div', { class: 'space-y-3' }, [
                h('div', { class: 'flex items-center gap-2 mb-3' }, [
                  h('i', { class: 'ri-server-line text-primary' }),
                  h('span', { class: 'text-sm font-semibold text-color' }, '进程监控'),
                ]),
                data.process_status && Object.keys(data.process_status).length > 0
                  ? h(
                      'div',
                      { class: 'flex flex-wrap gap-2' },
                      Object.entries(data.process_status).map(([name, status]) =>
                        h(
                          NTag,
                          {
                            key: name,
                            type: status.running ? 'success' : 'error',
                            class: 'cursor-help',
                            title: `CPU: ${status.cpu.toFixed(1)}%, Mem: ${status.memory.toFixed(1)}%`,
                          },
                          {
                            default: () => [
                              h('i', {
                                class: status.running ? 'ri-check-line mr-1' : 'ri-close-line mr-1',
                              }),
                              name,
                            ],
                          },
                        ),
                      ),
                    )
                  : h(NEmpty, { description: '暂无进程监控数据' }),
              ]),
            ],
          ),
        ]),
      )

      // 付费周期信息卡片（条件渲染）
      if (
        (data as any).show_billing_cycle &&
        (data.billing_cycle || data.price || data.expire_time)
      ) {
        cards.push(
          h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
            h(
              'div',
              {
                class:
                  'w-full min-w-0 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm',
              },
              [
                h('div', { class: 'space-y-3' }, [
                  h('div', { class: 'flex items-center gap-2 mb-3' }, [
                    h('i', { class: 'ri-calendar-line text-primary' }),
                    h('span', { class: 'text-sm font-semibold text-color' }, '付费周期'),
                  ]),
                  h('div', { class: 'space-y-2 text-sm' }, [
                    data.billing_cycle
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '周期类型'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            props.billingCycleOptions.find(
                              (opt) => opt.value === data.billing_cycle,
                            )?.label || data.billing_cycle,
                          ),
                        ])
                      : null,
                    (data as any).custom_cycle_days
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '自定义天数'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            `${(data as any).custom_cycle_days} 天`,
                          ),
                        ])
                      : null,
                    data.price !== undefined && data.price !== null
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '价格'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            `¥${data.price.toFixed(2)}`,
                          ),
                        ])
                      : null,
                    data.expire_time
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '到期时间'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            new Date(data.expire_time).toLocaleDateString('zh-CN'),
                          ),
                        ])
                      : null,
                  ]),
                ]),
              ],
            ),
          ]),
        )
      }

      // 流量限制信息卡片（条件渲染）
      if (
        (data as any).show_traffic_limit &&
        (data.traffic_limit_type || data.traffic_limit_bytes)
      ) {
        cards.push(
          h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
            h(
              'div',
              {
                class:
                  'w-full min-w-0 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm',
              },
              [
                h('div', { class: 'space-y-3' }, [
                  h('div', { class: 'flex items-center gap-2 mb-3' }, [
                    h('i', { class: 'ri-line-chart-line text-primary' }),
                    h('span', { class: 'text-sm font-semibold text-color' }, '流量限制'),
                  ]),
                  h('div', { class: 'space-y-2 text-sm' }, [
                    data.traffic_limit_type
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '限制类型'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            props.trafficLimitTypeOptions.find(
                              (opt) => opt.value === data.traffic_limit_type,
                            )?.label || data.traffic_limit_type,
                          ),
                        ])
                      : null,
                    data.traffic_limit_bytes && data.traffic_limit_bytes > 0
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '限制大小'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            `${(data.traffic_limit_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                          ),
                        ])
                      : null,
                  ]),
                ]),
              ],
            ),
          ]),
        )
      }

      // 流量重置周期信息卡片（条件渲染）
      if ((data as any).show_traffic_reset_cycle && data.traffic_reset_cycle) {
        cards.push(
          h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0' }, [
            h(
              'div',
              {
                class:
                  'w-full min-w-0 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm',
              },
              [
                h('div', { class: 'space-y-3' }, [
                  h('div', { class: 'flex items-center gap-2 mb-3' }, [
                    h('i', { class: 'ri-refresh-line text-primary' }),
                    h('span', { class: 'text-sm font-semibold text-color' }, '流量重置周期'),
                  ]),
                  h('div', { class: 'space-y-2 text-sm' }, [
                    h('div', { class: 'flex justify-between' }, [
                      h('span', { class: 'text-muted-color' }, '重置周期'),
                      h(
                        'span',
                        { class: 'font-medium text-color' },
                        props.trafficResetCycleOptions.find(
                          (opt) => opt.value === data.traffic_reset_cycle,
                        )?.label || data.traffic_reset_cycle,
                      ),
                    ]),
                    (data as any).traffic_custom_cycle_days
                      ? h('div', { class: 'flex justify-between' }, [
                          h('span', { class: 'text-muted-color' }, '自定义天数'),
                          h(
                            'span',
                            { class: 'font-medium text-color' },
                            `${(data as any).traffic_custom_cycle_days} 天`,
                          ),
                        ])
                      : null,
                  ]),
                ]),
              ],
            ),
          ]),
        )
      }

      // 图表 - 全宽
      const chartCards = [
        // CPU负载图表
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0 md:[column-span:all]' }, [
          h(ServerMetricsChart, {
            ref: (el: any) => {
              if (el) {
                if (!props.chartRefs[data.id]) props.chartRefs[data.id] = {}
                props.chartRefs[data.id].cpu = el
              }
            },
            serverId: data.id,
            chartType: 'cpu',
            data: props.metricsData[data.id]?.cpu || [],
            timeRange: props.chartTimeRange[data.id]?.cpu || 1,
            'onUpdate:timeRange': (value: number) => emit('updateTimeRange', data.id, 'cpu', value),
          }),
        ]),
        // 内存负载图表
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0 md:[column-span:all]' }, [
          h(ServerMetricsChart, {
            ref: (el: any) => {
              if (el) {
                if (!props.chartRefs[data.id]) props.chartRefs[data.id] = {}
                props.chartRefs[data.id].memory = el
              }
            },
            serverId: data.id,
            chartType: 'memory',
            data: props.metricsData[data.id]?.memory || [],
            timeRange: props.chartTimeRange[data.id]?.memory || 1,
            'onUpdate:timeRange': (value: number) =>
              emit('updateTimeRange', data.id, 'memory', value),
          }),
        ]),
        // 磁盘读写负载图表
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0 md:[column-span:all]' }, [
          h(ServerMetricsChart, {
            ref: (el: any) => {
              if (el) {
                if (!props.chartRefs[data.id]) props.chartRefs[data.id] = {}
                props.chartRefs[data.id].disk = el
              }
            },
            serverId: data.id,
            chartType: 'disk',
            data: props.metricsData[data.id]?.disk || [],
            timeRange: props.chartTimeRange[data.id]?.disk || 1,
            'onUpdate:timeRange': (value: number) =>
              emit('updateTimeRange', data.id, 'disk', value),
          }),
        ]),
        // 网络IO负载图表
        h('div', { class: 'break-inside-avoid mb-2 w-full min-w-0 md:[column-span:all]' }, [
          h(ServerMetricsChart, {
            ref: (el: any) => {
              if (el) {
                if (!props.chartRefs[data.id]) props.chartRefs[data.id] = {}
                props.chartRefs[data.id].network = el
              }
            },
            serverId: data.id,
            chartType: 'network',
            data: props.metricsData[data.id]?.network || [],
            timeRange: props.chartTimeRange[data.id]?.network || 1,
            'onUpdate:timeRange': (value: number) =>
              emit('updateTimeRange', data.id, 'network', value),
          }),
        ]),
      ]

      return h('div', { class: 'w-full min-w-0' }, [
        h(
          'div',
          {
            class:
              'w-full columns-1 sm:columns-1 md:columns-1 lg:columns-2 xl:columns-2 gap-2',
          },
          [...cards, ...chartCards],
        ),
      ])
    }
  },
})

// 列定义
const columns = computed(() => {
  const cols: DataTableColumn<Server>[] = [
    {
      type: 'selection',
    },
    {
      type: 'expand',
      expandable: () => true,
      renderExpand: (rowData: Server) =>
        h(ServerExpansion, {
          data: rowData,
          expandingServerId: props.expandingServerId || '',
          metricsData: metricsData.value,
          chartTimeRange: chartTimeRange.value,
          chartRefs: chartRefs.value,
          billingCycleOptions,
          trafficLimitTypeOptions,
          trafficResetCycleOptions,
          onUpdateTimeRange: (
            serverId: string,
            type: 'cpu' | 'memory' | 'disk' | 'network',
            hours: number,
          ) => updateChartTimeRange(serverId, type, hours),
        }),
    },
    {
      key: 'name',
      title: '服务器名称',
      sorter: 'default',
      minWidth: 200,
      render: (row: Server) =>
        h('div', { class: 'flex items-center gap-3' }, [
          h('p', { class: 'flex-1 min-w-0 space-x-1' }, [
            h('span', { class: 'font-medium text-color' }, row.name || '-'),
            h('span', { class: 'text-muted-color' }, ` (${row.ip || '-'})`),
          ]),
        ]),
    },
    {
      key: 'status',
      title: '状态',
      sorter: 'default',
      minWidth: 100,
      render: (row: Server) =>
        h(
          NTag,
          {
            type: severityToNaiveType(getStatusSeverity(row.status)),
            size: 'small',
          },
          { default: () => getStatusText(row.status) },
        ),
    },
    {
      key: 'group',
      title: '分组',
      sorter: 'default',
      minWidth: 120,
      render: (row: Server) => {
        if (row.group) {
          return h('div', { class: 'flex items-center gap-2' }, [
            row.group.color
              ? h('span', {
                  class: 'w-3 h-3 rounded-full',
                  style: { backgroundColor: row.group.color },
                })
              : null,
            h('span', { class: 'text-sm' }, row.group.name),
          ])
        }
        return h('span', { class: 'text-sm text-muted-color' }, '-')
      },
    },
    {
      key: 'uptime',
      title: '运行时间',
      sorter: 'default',
      minWidth: 120,
      render: (row: Server) =>
        h('div', { class: 'text-left' }, [
          h('div', { class: 'text-sm font-medium text-color' }, row.uptime || '-'),
        ]),
    },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      render: (row: Server) =>
        h('div', { class: 'flex items-center gap-2' }, [
          h(
            NButton,
            {
              size: 'small',
              text: true,
              onClick: () => emit('edit-server', row),
            },
            { default: () => h(RiEditLine, { size: '14px' }) },
          ),
          h(
            NButton,
            {
              size: 'small',
              text: true,
              type: 'error',
              loading: props.deletingServerId === row.id,
              title: '删除',
              onClick: (e: MouseEvent) => confirmDelete(e, row),
            },
            { default: () => h(RiDeleteBinLine, { size: '14px' }) },
          ),
        ]),
    },
  ]

  // Agent版本列（仅管理员可见）
  if (isAdmin.value) {
    cols.splice(4, 0, {
      key: 'agent_version',
      title: '版本',
      sorter: 'default',
      minWidth: 150,
      render: (row: Server) =>
        h('div', { class: 'text-left flex gap-2 items-center' }, [
          h('div', { class: 'text-sm font-medium text-color' }, row.agent_version || '-'),
          needsUpdate(row)
            ? h(
                NTag,
                {
                  type: 'info',
                  size: 'small',
                  round: true,
                  bordered: true,
                  class: 'cursor-pointer',
                  title: '有新版本可用，点击升级',
                  onClick: () => showUpdateAgentDialog(row),
                },
                {
                  default: () => [h('i', { class: 'ri-arrow-up-circle-line' })],
                },
              )
            : null,
        ]),
    })
  }

  return cols
})

defineExpose({
  autoExpandServer,
  confirmExpand,
  cancelExpand,
  addRealtimeDataPoint,
})
</script>

<template>
  <div>
    <n-data-table
      :columns="columns"
      :data="servers"
      :loading="loading"
      :pagination="{
        showSizePicker: true,
        prefix: (info: PaginationInfo) => `共 ${info.itemCount} 条`,
      }"
      :row-key="(row: Server) => row.id"
      v-model:expanded-row-keys="expandedRowKeys"
      :checked-row-keys="checkedRowKeys"
      @update:checked-row-keys="handleCheckedRowsChange"
      @update:expanded-row-keys="handleExpandChange"
      striped
      class="w-full"
    >
      <template #empty>
        <n-empty description="暂无服务器" class="py-8" />
      </template>
    </n-data-table>

    <!-- Agent 更新对话框 -->
    <n-modal v-model:show="showUpdateDialog" :mask-closable="false">
      <n-card
        style="width: 500px; max-width: 95vw"
        title="更新 Agent"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <div v-if="selectedServerForUpdate" class="flex flex-col gap-4">
          <div>
            <p class="text-sm text-muted-color mb-2">服务器信息</p>
            <p class="font-medium">
              {{ selectedServerForUpdate.name }} ({{ selectedServerForUpdate.ip }})
            </p>
          </div>

          <div>
            <p class="text-sm text-muted-color mb-2">当前版本</p>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ selectedServerForUpdate.agent_version || '-' }}</span>
              <n-tag
                v-if="selectedServerForUpdate.agent_version"
                :type="
                  severityToNaiveType(
                    getVersionTypeConfig(
                      parseVersion(selectedServerForUpdate.agent_version).versionType,
                    ).severity,
                  )
                "
                size="small"
              >
                {{
                  getVersionTypeConfig(
                    parseVersion(selectedServerForUpdate.agent_version).versionType,
                  ).label
                }}
              </n-tag>
            </div>
          </div>

          <div>
            <p class="text-sm text-muted-color mb-2">最新版本</p>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ latestAgentVersion || '-' }}</span>
              <n-tag
                v-if="latestAgentVersionType"
                :type="severityToNaiveType(getVersionTypeConfig(latestAgentVersionType).severity)"
                size="small"
              >
                {{ getVersionTypeConfig(latestAgentVersionType).label }}
              </n-tag>
            </div>
            <div
              v-if="latestAgentVersionType && latestAgentVersionType !== 'release'"
              class="flex items-center gap-2 text-orange-500 text-sm mt-1"
            >
              <i class="ri-error-warning-line"></i>
              <span>此版本为非正式版，可能包含实验性功能或大量缺陷，请谨慎更新</span>
            </div>
          </div>

          <div class="mt-2">
            <p class="text-sm text-muted-color">
              确认后，系统将向 Agent 发送更新指令，Agent 将自动下载并安装新版本。
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button text @click="showUpdateDialog = false" :disabled="updatingAgentId !== ''">
              取消
            </n-button>
            <n-button type="primary" :loading="updatingAgentId !== ''" @click="confirmUpdateAgent">
              <template #icon><i class="ri-check-line" /></template>
              确认更新
            </n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
/* 固定操作列在右侧 */
:deep(.n-data-table-th:last-child),
:deep(.n-data-table-td:last-child) {
  position: sticky;
  right: 0;
  z-index: 10;
}

/* 展开行内容与表格同宽 */
:deep(.n-data-table-expanded-row .n-data-table-td) {
  width: 100%;
  padding: 0;
}
:deep(.n-data-table-expanded-row .n-data-table-td .n-data-table-td__ellipsis) {
  width: 100%;
  padding: 12px 16px;
}
</style>
