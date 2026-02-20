<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useNotifications } from '@/composables/useNotifications'
import ServerGroupSelector from './ServerGroupSelector.vue'
import InstallInfo from './InstallInfo.vue'
import serversApi from '@/apis/servers'
import type {
  Server,
  ServerForm,
  RestartServiceResponse,
  ServerDetailResponse,
  ExtendedServerDetailData,
  ServerAlertRules,
  ServerAlertRulesInput,
  ServerFormWithAlertRules,
  ServerNotificationChannels,
} from '@/types/manager/servers'
import alertsApi from '@/apis/settings/alerts'
import {
  RiAddLine,
  RiCalculatorLine,
  RiCalendarCloseLine,
  RiCalendarLine,
  RiCheckLine,
  RiDatabaseLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiFolderLine,
  RiGlobalLine,
  RiHeartLine,
  RiInformationLine,
  RiKey2Line,
  RiLineChartLine,
  RiMapPinLine,
  RiMoneyCnyBoxLine,
  RiMoneyCnyCircleLine,
  RiNotificationLine,
  RiPriceTag3Line,
  RiPriceTagFill,
  RiRefreshLine,
  RiSendPlaneLine,
  RiServerLine,
  RiTimeLine,
  RiWifiLine,
} from '@remixicon/vue'

interface Props {
  visible: boolean
  editingServer?: Server | null
  saving?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [form: ServerForm]
  cancel: []
  'restart-server': [server: Server]
  'save-success': []
}>()

const { toast, confirm } = useNotifications()
const activeTab = ref('0')
const restarting = ref(false)
const resettingKey = ref(false)
const loadingDetail = ref(false)
const serverDetail = ref<ExtendedServerDetailData | null>(null)
const loadingAlertRules = ref(false)
const savingAlertRules = ref(false)
const alertRules = ref<ServerAlertRules | null>(null)
const notificationChannels = ref<ServerNotificationChannels>({})
const globalNotificationChannels = ref<{ email: boolean; webhook: boolean }>({
  email: false,
  webhook: false,
})

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const isEditing = computed(() => !!props.editingServer)

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

// 时区选项
const timezoneOptions = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Shanghai (中国标准时间)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo (日本标准时间)', value: 'Asia/Tokyo' },
  { label: 'Asia/Hong_Kong (香港标准时间)', value: 'Asia/Hong_Kong' },
  { label: 'Asia/Singapore (新加坡标准时间)', value: 'Asia/Singapore' },
  { label: 'America/New_York (美国东部时间)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (美国西部时间)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (英国标准时间)', value: 'Europe/London' },
  { label: 'Europe/Paris (中欧时间)', value: 'Europe/Paris' },
  { label: 'Australia/Sydney (澳大利亚东部时间)', value: 'Australia/Sydney' },
]

const showCustomCycleDays = computed(() => form.value.billing_cycle === 'custom')
const showTrafficCustomCycleDays = computed(() => form.value.traffic_reset_cycle === 'custom')
const showTrafficLimitBytes = computed(() => form.value.traffic_limit_type === 'periodic')

const showTrafficResetCycle = computed(() => true)

// 到期时间的 timestamp 转换 (n-date-picker uses ms timestamps)
const expireTimestamp = computed({
  get: () => {
    if (!form.value.expire_time) return null
    return new Date(form.value.expire_time).getTime()
  },
  set: (val: number | null) => {
    form.value.expire_time = val ? new Date(val).toISOString() : undefined
  },
})

// 流量GB到bytes的转换
const trafficLimitGB = computed({
  get: () => {
    if (!form.value.traffic_limit_bytes || form.value.traffic_limit_bytes === 0) return null
    // bytes转GB: bytes / (1024 * 1024 * 1024)
    return form.value.traffic_limit_bytes / (1024 * 1024 * 1024)
  },
  set: (value: number | null) => {
    if (value === null || value === 0) {
      form.value.traffic_limit_bytes = 0
    } else {
      // GB转bytes: GB * (1024 * 1024 * 1024)
      form.value.traffic_limit_bytes = Math.round(value * 1024 * 1024 * 1024)
    }
  },
})

const form = defineModel<ServerForm>('form', {
  default: () => ({
    name: '',
    ip: '',
    status: 'online' as const,
    location: '',
    os: '',
    architecture: '',
    kernel: '',
    hostname: '',
    group_id: undefined,
    billing_cycle: undefined,
    custom_cycle_days: undefined,
    price: undefined,
    expire_time: undefined,
    bandwidth_mbps: 0,
    traffic_limit_type: undefined,
    traffic_limit_bytes: 0,
    traffic_reset_cycle: undefined,
    traffic_custom_cycle_days: undefined,
    // Agent配置字段
    agent_timezone: 'Asia/Shanghai',
    agent_metrics_interval: undefined,
    agent_detail_interval: undefined,
    agent_system_interval: undefined,
    agent_heartbeat_interval: undefined,
    agent_log_path: undefined,
    // 显示开关字段
    show_billing_cycle: false,
    show_traffic_limit: false,
    show_traffic_reset_cycle: false,
    monitored_services: [],
  }),
})

// 加载服务器详情
const loadServerDetail = async () => {
  if (!props.editingServer) {
    serverDetail.value = null
    return
  }

  loadingDetail.value = true
  try {
    const response = (await serversApi.getServerDetail(
      props.editingServer.id,
    )) as ServerDetailResponse

    if (response.status && response.data) {
      serverDetail.value = response.data
      const detail = response.data
      form.value = {
        name: detail.name,
        ip: detail.ip,
        status: detail.status,
        location: detail.location,
        os: detail.os || '',
        architecture: detail.architecture || '',
        kernel: detail.kernel || '',
        hostname: detail.hostname || '',
        group_id: detail.group_id,
        billing_cycle: detail.billing_cycle,
        custom_cycle_days: detail.custom_cycle_days,
        price: detail.price,
        expire_time: detail.expire_time,
        bandwidth_mbps: detail.bandwidth_mbps || 0,
        traffic_limit_type: detail.traffic_limit_type,
        traffic_limit_bytes: detail.traffic_limit_bytes || 0,
        traffic_reset_cycle: detail.traffic_reset_cycle,
        traffic_custom_cycle_days: detail.traffic_custom_cycle_days,
        // Agent配置字段
        agent_timezone: detail.agent_timezone,
        agent_metrics_interval: detail.agent_metrics_interval,
        agent_detail_interval: detail.agent_detail_interval,
        agent_system_interval: detail.agent_system_interval,
        agent_heartbeat_interval: detail.agent_heartbeat_interval,
        agent_log_path: detail.agent_log_path,
        monitored_services: detail.monitored_services || [],
        show_billing_cycle: detail.show_billing_cycle || false,
        show_traffic_limit: detail.show_traffic_limit ?? false,
        show_traffic_reset_cycle: detail.show_traffic_reset_cycle ?? false,
      }
      // 从服务器详情中获取告警规则
      if (detail.alert_rules) {
        alertRules.value = detail.alert_rules
      } else {
        // 如果没有告警规则，初始化为禁用状态
        alertRules.value = {
          cpu: { enabled: false, warning: 80, critical: 90 },
          memory: { enabled: false, warning: 85, critical: 95 },
          disk: { enabled: false, warning: 85, critical: 95 },
        }
      }

      // 从服务器详情中获取通知渠道配置
      if (detail.notification_channels) {
        notificationChannels.value = detail.notification_channels
      } else {
        notificationChannels.value = {}
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取服务器详情失败'
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: errorMessage,
      life: 3000,
    })
    if (props.editingServer) {
      form.value = {
        name: props.editingServer.name,
        ip: props.editingServer.ip,
        status: props.editingServer.status,
        location: props.editingServer.location,
        os: props.editingServer.os,
        architecture: props.editingServer.architecture || '',
        kernel: props.editingServer.kernel || '',
        hostname: props.editingServer.hostname || '',
        group_id: props.editingServer.group_id,
        billing_cycle: props.editingServer.billing_cycle,
        custom_cycle_days: props.editingServer.custom_cycle_days,
        price: props.editingServer.price,
        expire_time: props.editingServer.expire_time,
        bandwidth_mbps: props.editingServer.bandwidth_mbps || 0,
        traffic_limit_type: props.editingServer.traffic_limit_type,
        traffic_limit_bytes: props.editingServer.traffic_limit_bytes || 0,
        traffic_reset_cycle: props.editingServer.traffic_reset_cycle,
        traffic_custom_cycle_days: props.editingServer.traffic_custom_cycle_days,
        // Agent配置字段
        agent_timezone: props.editingServer.agent_timezone,
        agent_metrics_interval: props.editingServer.agent_metrics_interval,
        agent_detail_interval: props.editingServer.agent_detail_interval,
        agent_system_interval: props.editingServer.agent_system_interval,
        agent_heartbeat_interval: props.editingServer.agent_heartbeat_interval,
        agent_log_path: props.editingServer.agent_log_path,
        // 显示开关字段
        show_billing_cycle: props.editingServer.show_billing_cycle ?? false,
        show_traffic_limit: props.editingServer.show_traffic_limit ?? false,
        show_traffic_reset_cycle: props.editingServer.show_traffic_reset_cycle ?? false,
      }
    }
  } finally {
    loadingDetail.value = false
  }
}

// 加载全局通知渠道配置
const loadGlobalNotificationChannels = async () => {
  try {
    const res = await alertsApi.getAlertsSettings()
    if (res?.status && res?.data?.notifications) {
      const notifications = res.data.notifications
      // 检查邮件通知是否已配置且启用
      globalNotificationChannels.value.email =
        notifications.email?.enabled === true &&
        !!notifications.email?.smtp &&
        !!notifications.email?.from &&
        !!notifications.email?.to
      // 检查Webhook通知是否已配置且启用
      globalNotificationChannels.value.webhook =
        notifications.webhook?.enabled === true &&
        !!notifications.webhook?.webhook &&
        (notifications.webhook.webhook.startsWith('http://') ||
          notifications.webhook.webhook.startsWith('https://'))
    }
  } catch (error) {
    console.error('加载全局通知渠道配置失败:', error)
  }
}

// 监听对话框显示状态
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.editingServer) {
      loadingDetail.value = true
      loadServerDetail()
      loadGlobalNotificationChannels()
    } else {
      serverDetail.value = null
      alertRules.value = null
      notificationChannels.value = {}
      loadingDetail.value = false
      loadingAlertRules.value = false
      activeTab.value = '0'
    }
  },
)

watch(
  () => props.editingServer,
  (server, oldServer) => {
    // 如果对话框打开且服务器ID变化，重新加载详情
    if (server && props.visible && oldServer && server.id !== oldServer.id) {
      loadServerDetail()
      loadGlobalNotificationChannels()
    } else if (server && !props.visible) {
      form.value = {
        name: server.name,
        ip: server.ip,
        status: server.status,
        location: server.location,
        os: server.os,
        architecture: server.architecture || '',
        kernel: server.kernel || '',
        hostname: server.hostname || '',
        group_id: server.group_id,
        billing_cycle: server.billing_cycle,
        custom_cycle_days: server.custom_cycle_days,
        price: server.price,
        expire_time: server.expire_time,
        bandwidth_mbps: server.bandwidth_mbps || 0,
        traffic_limit_type: server.traffic_limit_type,
        traffic_limit_bytes: server.traffic_limit_bytes || 0,
        traffic_reset_cycle: server.traffic_reset_cycle,
        traffic_custom_cycle_days: server.traffic_custom_cycle_days,
        // Agent配置字段
        agent_timezone: server.agent_timezone,
        agent_metrics_interval: server.agent_metrics_interval,
        agent_detail_interval: server.agent_detail_interval,
        agent_system_interval: server.agent_system_interval,
        agent_heartbeat_interval: server.agent_heartbeat_interval,
        agent_log_path: server.agent_log_path,
        // 显示开关字段
        show_billing_cycle: server.show_billing_cycle ?? false,
        show_traffic_limit: server.show_traffic_limit ?? false,
        show_traffic_reset_cycle: server.show_traffic_reset_cycle ?? false,
      }
    }
  },
  { immediate: true },
)

const handleSave = async () => {
  // 验证必填字段
  if (!form.value.name || !form.value.ip) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '请填写服务器名称和IP地址',
      life: 3000,
    })
    return
  }

  // 验证IP格式（简单验证）
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  if (!ipPattern.test(form.value.ip)) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '请输入有效的IP地址',
      life: 3000,
    })
    return
  }

  const submitForm: ServerFormWithAlertRules = { ...form.value }

  // 如果是编辑模式且有告警规则，将告警规则一起提交
  if (isEditing.value && props.editingServer && alertRules.value) {
    const rulesInput: ServerAlertRulesInput = {
      cpu: alertRules.value.cpu,
      memory: alertRules.value.memory,
      disk: alertRules.value.disk,
    }

    if (alertRules.value.bandwidth) {
      rulesInput.bandwidth = alertRules.value.bandwidth
    }
    if (alertRules.value.traffic) {
      rulesInput.traffic = alertRules.value.traffic
    }
    if (alertRules.value.expiration) {
      rulesInput.expiration = alertRules.value.expiration
    }

    submitForm.alert_rules = rulesInput
  }

  // 添加通知渠道配置
  if (isEditing.value && props.editingServer) {
    submitForm.notification_channels = notificationChannels.value
  }

  emit('save', submitForm)
}

const handleCancel = () => {
  emit('cancel')
}

// 处理重启服务
const handleRestartService = () => {
  if (!props.editingServer) return

  confirm.require({
    message: `确定要重启 "${props.editingServer.name}" 的Agent服务吗？`,
    header: '重启确认',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '重启',
      severity: 'warn',
    },
    accept: async () => {
      restarting.value = true
      try {
        const response = (await serversApi.restartService(
          props.editingServer!.id,
        )) as RestartServiceResponse

        if (response.status) {
          toast.add({
            severity: 'success',
            summary: '重启成功',
            detail: `服务器 "${props.editingServer!.name}" 的重启命令已发送`,
            life: 3000,
          })
          emit('restart-server', props.editingServer!)
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
        restarting.value = false
      }
    },
  })
}

// 处理重置通信密钥
const handleResetAgentKey = () => {
  if (!props.editingServer) return

  confirm.require({
    message: `确定要重置 "${props.editingServer.name}" 的通信密钥和指纹吗？重置后Agent需要使用新密钥重新连接面板，并重新绑定指纹`,
    header: '重置通信密钥确认',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '重置',
      severity: 'warn',
    },
    accept: async () => {
      resettingKey.value = true
      try {
        const response = await serversApi.resetAgentKey(props.editingServer!.id)

        if (response.status && response.data) {
          toast.add({
            severity: 'success',
            summary: '重置成功',
            detail: `服务器 "${props.editingServer!.name}" 的通信密钥和指纹已重置。`,
            life: 5000,
          })
          // 重新加载服务器详情
          if (props.editingServer) {
            await loadServerDetail()
          }
        } else {
          throw new Error(response.message || '重置失败')
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '请稍后重试'
        toast.add({
          severity: 'error',
          summary: '重置失败',
          detail: errorMessage,
          life: 3000,
        })
      } finally {
        resettingKey.value = false
      }
    },
  })
}

// 监控服务相关逻辑
const newServiceName = ref('')

const monitoredServicesList = computed(() => {
  return (form.value.monitored_services || []).map((serviceName) => {
    // 尝试从编辑的服务器对象中获取实时状态
    const status = props.editingServer?.process_status?.[serviceName]
    return {
      name: serviceName,
      status: status,
      running: status?.running ?? false,
      cpu: status?.cpu ?? 0,
      memory: status?.memory ?? 0,
    }
  })
})

const addMonitoredService = () => {
  const name = newServiceName.value.trim()
  if (!name) return

  if (!form.value.monitored_services) {
    form.value.monitored_services = []
  }

  if (form.value.monitored_services.includes(name)) {
    toast.add({
      severity: 'warn',
      summary: '提示',
      detail: '该服务已在监控列表中',
      life: 3000,
    })
    return
  }

  form.value.monitored_services.push(name)
  newServiceName.value = ''
}

const removeMonitoredService = (name: string) => {
  if (!form.value.monitored_services) return
  form.value.monitored_services = form.value.monitored_services.filter((s) => s !== name)
}

// n-data-table columns for monitored services
const serviceColumns = [
  {
    title: '服务名称',
    key: 'name',
  },
  {
    title: '状态',
    key: 'status',
    render(row: { status: unknown; running: boolean }) {
      if (row.status) {
        return h(
          'n-tag',
          { type: row.running ? 'success' : 'error' },
          { default: () => (row.running ? '运行中' : '已停止') },
        )
      }
      return h('n-tag', { type: 'default' }, { default: () => '未知' })
    },
  },
  {
    title: '资源占用',
    key: 'resources',
    render(row: { status: unknown; cpu: number; memory: number }) {
      if (row.status) {
        return h('div', { class: 'text-sm' }, [
          h('div', {}, `CPU: ${row.cpu.toFixed(1)}%`),
          h('div', {}, `MEM: ${row.memory.toFixed(1)}%`),
        ])
      }
      return h('span', { class: 'text-muted-color' }, '-')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row: { name: string }) {
      return h(
        'n-button',
        {
          text: true,
          type: 'error',
          onClick: () => removeMonitoredService(row.name),
        },
        { default: () => RiDeleteBinLine },
      )
    },
  },
]
</script>
<template>
  <n-modal
    :title="isEditing ? `编辑服务器 - ${props.editingServer?.name}` : '添加服务器'"
    v-model:show="isVisible"
    :mask-closable="false"
    preset="card"
    style="max-width: 900px; width: 100%"
  >
    <div v-if="isEditing && loadingDetail" class="flex flex-col items-center justify-center py-20">
      <n-spin size="large" />
      <p class="mt-4 text-muted-color">加载服务器详情中...</p>
    </div>
    <form v-else @submit.prevent="handleSave" class="space-y-6">
      <n-tabs v-model:value="activeTab" type="line">
        <!-- 基础信息 Tab -->
        <n-tab-pane name="0" tab="基础">
          <div class="space-y-4 pt-4">
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-price-tag3-line size="14px" />
                  服务器名称
                  <span class="text-red-500">*</span>
                </label>
                <n-input v-model:value="form.name" placeholder="输入服务器名称" class="w-full" />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-global-line size="14px" />
                  IP地址
                  <span class="text-red-500">*</span>
                </label>
                <n-input v-model:value="form.ip" placeholder="192.168.1.100" class="w-full" />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-map-pin-line size="14px" />
                  地域
                </label>
                <n-input
                  v-model:value="form.location"
                  placeholder="留空则自动获取"
                  class="w-full"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-folder-line size="14px" />
                  分组
                </label>
                <ServerGroupSelector v-model="form.group_id" placeholder="请选择分组（可选）" />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 计费信息 Tab -->
        <n-tab-pane name="1" tab="计费">
          <div class="space-y-4 pt-4">
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-calendar-line size="14px" />
                  付费周期
                </label>
                <n-select
                  v-model:value="form.billing_cycle"
                  :options="billingCycleOptions"
                  placeholder="请选择付费周期"
                  class="w-full"
                />
              </div>

              <div v-if="showCustomCycleDays" class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-time-line size="14px" />
                  自定义周期天数
                </label>
                <n-input-number
                  v-model:value="form.custom_cycle_days"
                  :min="1"
                  placeholder="请输入天数"
                  class="w-full"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-money-cny-circle-line size="14px" />
                  价格
                </label>
                <n-input-number
                  v-model:value="form.price"
                  :min="0"
                  :precision="2"
                  placeholder="请输入价格"
                  class="w-full"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-calendar-close-line size="14px" />
                  到期时间
                </label>
                <n-date-picker
                  v-model:value="expireTimestamp"
                  type="datetime"
                  clearable
                  class="w-full"
                  placeholder="请选择到期时间"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-eye-line size="14px" />
                  显示付费周期
                </label>
                <n-card>
                  <div class="flex gap-2">
                    <span class="text-sm text-muted-color flex-1"
                      >在概览和详情中显示付费周期信息</span
                    >
                    <n-switch v-model:value="form.show_billing_cycle" />
                  </div>
                </n-card>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 网络信息 Tab -->
        <n-tab-pane name="2" tab="网络">
          <div class="space-y-4 pt-4">
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-wifi-line size="14px" />
                  带宽大小
                </label>
                <n-input-number
                  v-model:value="form.bandwidth_mbps"
                  :min="0"
                  placeholder="0表示无限制"
                  class="w-full"
                >
                  <template #suffix>Mbps</template>
                </n-input-number>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-line-chart-line size="14px" />
                  流量限制类型
                </label>
                <n-select
                  v-model:value="form.traffic_limit_type"
                  :options="trafficLimitTypeOptions"
                  placeholder="请选择流量限制类型"
                  class="w-full"
                />
              </div>

              <div v-if="showTrafficLimitBytes" class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-database-line size="14px" />
                  流量限制大小
                </label>
                <n-input-number
                  v-model:value="trafficLimitGB"
                  :min="0"
                  :precision="2"
                  placeholder="0表示无限制"
                  class="w-full"
                >
                  <template #suffix>GB</template>
                </n-input-number>
              </div>

              <div v-if="showTrafficResetCycle" class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-refresh-line size="14px" />
                  流量重置周期
                </label>
                <n-select
                  v-model:value="form.traffic_reset_cycle"
                  :options="trafficResetCycleOptions"
                  placeholder="请选择重置周期"
                  class="w-full"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-eye-line size="14px" />
                  显示流量限制
                </label>
                <n-card>
                  <div class="flex gap-2">
                    <span class="text-sm text-muted-color flex-1"
                      >在概览和详情中显示流量限制信息</span
                    >
                    <n-switch v-model:value="form.show_traffic_limit" />
                  </div>
                </n-card>
              </div>

              <div v-if="showTrafficResetCycle" class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-eye-line size="14px" />
                  显示流量重置周期
                </label>
                <n-card>
                  <div class="flex gap-2">
                    <span class="text-sm text-muted-color flex-1"
                      >在概览和详情中显示流量重置周期信息</span
                    >
                    <n-switch v-model:value="form.show_traffic_reset_cycle" />
                  </div>
                </n-card>
              </div>

              <div v-if="showTrafficCustomCycleDays" class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-time-line size="14px" />
                  自定义重置周期天数
                </label>
                <n-input-number
                  v-model:value="form.traffic_custom_cycle_days"
                  :min="1"
                  placeholder="请输入天数"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 告警配置 Tab -->
        <n-tab-pane v-if="isEditing" name="3" tab="告警">
          <div class="space-y-4 pt-4">
            <div v-if="loadingAlertRules" class="flex flex-col items-center justify-center py-10">
              <n-spin size="large" />
              <p class="mt-3 text-sm text-muted-color">加载告警规则中...</p>
            </div>
            <div v-else-if="alertRules" class="space-y-6">
              <!-- 基础资源告警 -->
              <div class="space-y-4">
                <h3 class="text-base font-semibold text-color flex items-center gap-2">
                  <ri-server-line size="14px" />
                  基础资源告警
                </h3>
                <div class="grid grid-cols-3 gap-4 items-start">
                  <!-- CPU 告警 -->
                  <n-card class="p-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-color">CPU 使用率</label>
                      <n-switch v-model:value="alertRules.cpu.enabled" />
                    </div>
                    <div v-if="alertRules.cpu.enabled" class="space-y-2">
                      <div>
                        <label class="text-xs text-muted-color">警告阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.cpu.warning"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.cpu.enabled"
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="text-xs text-muted-color">严重阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.cpu.critical"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.cpu.enabled"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </n-card>

                  <!-- 内存告警 -->
                  <n-card class="p-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-color">内存使用率</label>
                      <n-switch v-model:value="alertRules.memory.enabled" />
                    </div>
                    <div v-if="alertRules.memory.enabled" class="space-y-2">
                      <div>
                        <label class="text-xs text-muted-color">警告阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.memory.warning"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.memory.enabled"
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="text-xs text-muted-color">严重阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.memory.critical"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.memory.enabled"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </n-card>

                  <!-- 磁盘告警 -->
                  <n-card class="p-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-color">磁盘使用率</label>
                      <n-switch v-model:value="alertRules.disk.enabled" />
                    </div>
                    <div v-if="alertRules.disk.enabled" class="space-y-2">
                      <div>
                        <label class="text-xs text-muted-color">警告阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.disk.warning"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.disk.enabled"
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="text-xs text-muted-color">严重阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.disk.critical"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.disk.enabled"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </n-card>
                </div>
              </div>

              <!-- 网络资源告警 -->
              <div class="space-y-4">
                <h3 class="text-base font-semibold text-color flex items-center gap-2">
                  <ri-wifi-line size="14px" />
                  网络资源告警
                </h3>
                <div class="grid grid-cols-2 gap-4 items-start">
                  <!-- 带宽峰值告警 -->
                  <n-card class="p-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-color">带宽峰值</label>
                      <n-switch
                        :value="alertRules?.bandwidth?.enabled ?? false"
                        @update:value="
                          (val: boolean) => {
                            if (!alertRules) return
                            if (!alertRules.bandwidth) {
                              alertRules.bandwidth = { enabled: val, threshold: 100 }
                            } else {
                              alertRules.bandwidth.enabled = val
                            }
                          }
                        "
                      />
                    </div>
                    <div v-if="alertRules && alertRules.bandwidth?.enabled" class="space-y-2">
                      <div>
                        <label class="text-xs text-muted-color">峰值阈值 (Mbps)</label>
                        <n-input-number
                          v-model:value="alertRules.bandwidth!.threshold"
                          :min="0"
                          :disabled="!alertRules.bandwidth?.enabled"
                          class="w-full"
                        >
                          <template #suffix>Mbps</template>
                        </n-input-number>
                      </div>
                    </div>
                  </n-card>

                  <!-- 流量耗尽告警 -->
                  <n-card class="p-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-color">流量耗尽</label>
                      <n-switch
                        :value="alertRules?.traffic?.enabled ?? false"
                        @update:value="
                          (val: boolean) => {
                            if (!alertRules) return
                            if (!alertRules.traffic) {
                              alertRules.traffic = { enabled: val, threshold_percent: 80 }
                            } else {
                              alertRules.traffic.enabled = val
                            }
                          }
                        "
                      />
                    </div>
                    <div v-if="alertRules && alertRules.traffic?.enabled" class="space-y-2">
                      <div>
                        <label class="text-xs text-muted-color">告警阈值 (%)</label>
                        <n-input-number
                          v-model:value="alertRules.traffic!.threshold_percent"
                          :min="0"
                          :max="100"
                          :disabled="!alertRules.traffic?.enabled"
                          class="w-full"
                        >
                          <template #suffix>%</template>
                        </n-input-number>
                      </div>
                    </div>
                  </n-card>
                </div>
              </div>

              <!-- 其他告警 -->
              <div class="space-y-4">
                <h3 class="text-base font-semibold text-color flex items-center gap-2">
                  <ri-notification-line size="14px" />
                  其他告警
                </h3>
                <div class="grid grid-cols-1 gap-4">
                  <!-- 到期提醒 -->
                  <n-card class="p-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-color">服务器到期提醒</label>
                      <n-switch
                        :value="alertRules?.expiration?.enabled ?? false"
                        @update:value="
                          (val: boolean) => {
                            if (!alertRules) return
                            if (!alertRules.expiration) {
                              alertRules.expiration = { enabled: val, alert_days: 7 }
                            } else {
                              alertRules.expiration.enabled = val
                            }
                          }
                        "
                      />
                    </div>
                    <div v-if="alertRules && alertRules.expiration?.enabled" class="space-y-2">
                      <div>
                        <label class="text-xs text-muted-color">提前提醒天数</label>
                        <n-input-number
                          v-model:value="alertRules.expiration!.alert_days"
                          :min="1"
                          :disabled="!alertRules.expiration?.enabled"
                          class="w-full"
                        >
                          <template #suffix>天</template>
                        </n-input-number>
                      </div>
                    </div>
                  </n-card>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-muted-color">无法加载告警规则</div>

            <!-- 通知渠道配置 -->
            <div class="mt-6 space-y-4">
              <h3 class="text-base font-semibold text-color flex items-center gap-2">
                <ri-send-plane-line size="14px" />
                通知渠道
              </h3>
              <p class="text-sm text-muted-color">
                选择此服务器告警时使用的通知方式。只有全局已配置的通知方式才能在此启用。
              </p>
              <div class="grid grid-cols-2 gap-4">
                <!-- 邮件通知 -->
                <n-card class="p-2">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-color">邮件通知</label>
                    <n-switch
                      v-model:value="notificationChannels.email"
                      :disabled="!globalNotificationChannels.email"
                    />
                  </div>
                  <p v-if="!globalNotificationChannels.email" class="text-xs text-muted-color">
                    全局邮件通知未配置
                  </p>
                  <p v-else class="text-xs text-muted-color">邮件通知可用</p>
                </n-card>

                <!-- Webhook 通知 -->
                <n-card class="p-2">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-color">Webhook 通知</label>
                    <n-switch
                      v-model:value="notificationChannels.webhook"
                      :disabled="!globalNotificationChannels.webhook"
                    />
                  </div>
                  <p v-if="!globalNotificationChannels.webhook" class="text-xs text-muted-color">
                    全局 Webhook 通知未配置
                  </p>
                  <p v-else class="text-xs text-muted-color">Webhook通知可用</p>
                </n-card>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- Agent配置 Tab -->
        <n-tab-pane v-if="isEditing" name="4" tab="被控配置">
          <div class="space-y-4 pt-4">
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-global-line size="14px" />
                  时区
                </label>
                <n-select
                  v-model:value="form.agent_timezone"
                  :options="timezoneOptions"
                  placeholder="请选择时区（留空使用默认）"
                  class="w-full"
                />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-line-chart-line size="14px" />
                  性能指标上报间隔
                </label>
                <n-input-number
                  v-model:value="form.agent_metrics_interval"
                  :min="1"
                  placeholder="秒（默认30）"
                  class="w-full"
                >
                  <template #suffix>秒</template>
                </n-input-number>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-information-line size="14px" />
                  详细信息上报间隔
                </label>
                <n-input-number
                  v-model:value="form.agent_detail_interval"
                  :min="1"
                  placeholder="秒（默认30）"
                  class="w-full"
                >
                  <template #suffix>秒</template>
                </n-input-number>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-server-line size="14px" />
                  系统信息上报间隔
                </label>
                <n-input-number
                  v-model:value="form.agent_system_interval"
                  :min="1"
                  placeholder="秒（默认30）"
                  class="w-full"
                >
                  <template #suffix>秒</template>
                </n-input-number>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-heart-line size="14px" />
                  心跳间隔
                </label>
                <n-input-number
                  v-model:value="form.agent_heartbeat_interval"
                  :min="1"
                  placeholder="秒（默认20）"
                  class="w-full"
                >
                  <template #suffix>秒</template>
                </n-input-number>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-folder-line size="14px" />
                  日志路径
                </label>
                <n-input
                  v-model:value="form.agent_log_path"
                  placeholder="logs（默认）"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 进程监控 Tab -->
        <n-tab-pane name="5" tab="进程监控">
          <div class="space-y-2 pt-4">
            <div class="flex gap-2">
              <n-input
                v-model:value="newServiceName"
                placeholder="输入服务名称，如: nginx, mysql"
                class="flex-1"
                @keydown.enter.prevent="addMonitoredService"
              />
              <n-button
                type="primary"
                :disabled="!newServiceName.trim()"
                @click="addMonitoredService"
              >
                <template #icon>
                  <ri-add-line />
                </template>
                添加服务
              </n-button>
            </div>

            <n-data-table
              :columns="serviceColumns"
              :data="monitoredServicesList"
              :max-height="400"
              striped
            >
              <template #empty>
                <n-empty description="暂无数据" class="py-4" />
              </template>
            </n-data-table>
          </div>
        </n-tab-pane>

        <!-- 操作 Tab -->
        <n-tab-pane v-if="isEditing" name="6" tab="操作">
          <div class="space-y-4 pt-4">
            <!-- 服务器操作 -->
            <div class="flex flex-row gap-2">
              <n-button
                secondary
                type="warning"
                :loading="restarting"
                @click="handleRestartService"
                class="justify-start"
              >
                <template #icon>
                  <ri-refresh-line />
                </template>
                重启服务
              </n-button>
              <n-button
                secondary
                :loading="resettingKey"
                @click="handleResetAgentKey"
                class="justify-start"
              >
                <template #icon>
                  <ri-key2-line />
                </template>
                重置通信密钥
              </n-button>
            </div>
            <n-divider />
            <!-- 安装信息 -->
            <InstallInfo
              v-if="serverDetail"
              :server="{
                ...props.editingServer!,
                agent_key: serverDetail.agent_key,
              }"
            />
            <div v-else class="text-center py-8 text-muted-color">无法加载服务器详情</div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2 mt-2">
        <n-button type="default" @click="handleCancel" tertiary>取消</n-button>
        <n-button type="primary" @click="handleSave" :loading="props.saving || savingAlertRules">
          <template #icon>
            <ri-check-line v-if="isEditing" />
            <ri-add-line v-else />
          </template>
          {{ isEditing ? '更新配置' : '添加服务器' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>
<style scoped>
:deep(.n-card__content) {
  padding: 8px !important;
}
</style>
