<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ProgressSpinner from 'primevue/progressspinner'
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
} from '@/types/manager/servers'

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
}>()

const toast = useToast()
const confirm = useConfirm()
const activeTab = ref('0')
const restarting = ref(false)
const loadingDetail = ref(false)
const serverDetail = ref<ExtendedServerDetailData | null>(null)
const loadingAlertRules = ref(false)
const savingAlertRules = ref(false)
const alertRules = ref<ServerAlertRules | null>(null)

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

const showCustomCycleDays = computed(() => form.value.billing_cycle === 'custom')
const showTrafficCustomCycleDays = computed(() => form.value.traffic_reset_cycle === 'custom')
const showTrafficLimitBytes = computed(() => form.value.traffic_limit_type === 'periodic')

const showTrafficResetCycle = computed(() => true)

// 到期时间的 Date 对象
const expireTimeDate = computed({
  get: () => {
    if (!form.value.expire_time) return null
    if (typeof form.value.expire_time === 'string') {
      return new Date(form.value.expire_time)
    }
    return form.value.expire_time as Date | null
  },
  set: (value: Date | null) => {
    if (value) {
      form.value.expire_time = value.toISOString()
    } else {
      form.value.expire_time = undefined
    }
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
    port: 22,
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
        port: detail.port || 22,
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
      }
      // 从服务器详情中获取告警规则
      if (detail.alert_rules) {
        alertRules.value = detail.alert_rules
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
        port: props.editingServer.port,
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
      }
    }
  } finally {
    loadingDetail.value = false
  }
}


// 保存告警规则
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.editingServer) {
      loadingDetail.value = true
      loadServerDetail()
      // 告警规则现在从服务器详情中获取，不需要单独调用 loadAlertRules
    } else {
      serverDetail.value = null
      alertRules.value = null
      loadingDetail.value = false
      loadingAlertRules.value = false
      activeTab.value = '0'
    }
  },
)

watch(
  () => props.editingServer,
  (server) => {
    if (server && !props.visible) {
      form.value = {
        name: server.name,
        ip: server.ip,
        port: server.port,
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

  // 验证通信端口范围
  if (form.value.port && (form.value.port < 1 || form.value.port > 65535)) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '通信端口号必须在1-65535之间',
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
</script>
<template>
  <Dialog
    v-model:visible="isVisible"
    :header="isEditing ? `编辑服务器 - ${props.editingServer?.name}` : '添加服务器'"
    :block-scroll="false"
    :draggable="false"
    modal
    class="w-3xl"
    :pt="{
      root: 'rounded-xl border-0 shadow-2xl',
      header:
        'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-b border-primary-200 dark:border-primary-700 rounded-t-xl',
      content: 'p-0',
      footer:
        '!p-5 bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 rounded-b-xl',
    }"
  >
    <div v-if="isEditing && loadingDetail" class="flex flex-col items-center justify-center py-20">
      <ProgressSpinner
        style="width: 50px; height: 50px"
        strokeWidth="4"
        fill="transparent"
        animationDuration="0.5s"
      />
      <p class="mt-4 text-muted-color">加载服务器详情中...</p>
    </div>
    <form v-else @submit.prevent="handleSave" class="space-y-6">
      <Tabs :value="activeTab" @update:value="(val: string | number) => (activeTab = String(val))">
        <TabList>
          <Tab value="0">基础</Tab>
          <Tab value="1">计费</Tab>
          <Tab value="2">网络</Tab>
          <Tab v-if="isEditing" value="4">告警</Tab>
          <Tab v-if="isEditing" value="3">操作</Tab>
        </TabList>
        <TabPanels>
          <!-- 基础信息 Tab -->
          <TabPanel value="0">
            <div class="space-y-4 pt-4">
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-tag text-primary text-xs"></i>
                    服务器名称
                    <span class="text-red-500">*</span>
                  </label>
                  <InputText
                    v-model="form.name"
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
                    v-model="form.ip"
                    placeholder="192.168.1.100"
                    required
                    class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-sitemap text-primary text-xs"></i>
                    通信端口
                    <span class="text-red-500">*</span>
                  </label>
                  <InputNumber
                    v-model="form.port"
                    placeholder="22"
                    :min="1"
                    :max="65535"
                    :use-grouping="false"
                    class="w-full"
                  />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-map-marker text-primary text-xs"></i>
                    地域
                  </label>
                  <InputText
                    v-model="form.location"
                    placeholder="留空则自动获取"
                    class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-folder text-primary text-xs"></i>
                    分组
                  </label>
                  <ServerGroupSelector v-model="form.group_id" placeholder="请选择分组（可选）" />
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- 计费信息 Tab -->
          <TabPanel value="1">
            <div class="space-y-4 pt-4">
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-calendar text-primary text-xs"></i>
                    付费周期
                  </label>
                  <Select
                    v-model="form.billing_cycle"
                    :options="billingCycleOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="请选择付费周期"
                    class="w-full"
                  />
                </div>

                <div v-if="showCustomCycleDays" class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-clock text-primary text-xs"></i>
                    自定义周期天数
                  </label>
                  <InputNumber
                    v-model="form.custom_cycle_days"
                    :min="1"
                    placeholder="请输入天数"
                    class="w-full"
                  />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-dollar text-primary text-xs"></i>
                    价格
                  </label>
                  <InputNumber
                    v-model="form.price"
                    :min="0"
                    mode="decimal"
                    :min-fraction-digits="2"
                    :max-fraction-digits="2"
                    placeholder="请输入价格"
                    class="w-full"
                  />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-calendar-times text-primary text-xs"></i>
                    到期时间
                  </label>
                  <Calendar
                    v-model="expireTimeDate"
                    date-format="yy-mm-dd"
                    show-time
                    hour-format="24"
                    placeholder="请选择到期时间"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- 网络信息 Tab -->
          <TabPanel value="2">
            <div class="space-y-4 pt-4">
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-wifi text-primary text-xs"></i>
                    带宽大小
                  </label>
                  <InputNumber
                    v-model="form.bandwidth_mbps"
                    :min="0"
                    placeholder="0表示无限制"
                    suffix=" Mbps"
                    class="w-full"
                  />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-chart-line text-primary text-xs"></i>
                    流量限制类型
                  </label>
                  <Select
                    v-model="form.traffic_limit_type"
                    :options="trafficLimitTypeOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="请选择流量限制类型"
                    class="w-full"
                  />
                </div>

                <div v-if="showTrafficLimitBytes" class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-database text-primary text-xs"></i>
                    流量限制大小
                  </label>
                  <InputNumber
                    v-model="trafficLimitGB"
                    :min="0"
                    placeholder="0表示无限制"
                    suffix=" GB"
                    :min-fraction-digits="2"
                    :max-fraction-digits="2"
                    class="w-full"
                  />
                </div>

                <div v-if="showTrafficResetCycle" class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-refresh text-primary text-xs"></i>
                    流量重置周期
                  </label>
                  <Select
                    v-model="form.traffic_reset_cycle"
                    :options="trafficResetCycleOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="请选择重置周期"
                    class="w-full"
                  />
                </div>

                <div v-if="showTrafficCustomCycleDays" class="space-y-3">
                  <label class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-clock text-primary text-xs"></i>
                    自定义重置周期天数
                  </label>
                  <InputNumber
                    v-model="form.traffic_custom_cycle_days"
                    :min="1"
                    placeholder="请输入天数"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- 操作 Tab -->
          <TabPanel v-if="isEditing" value="3">
            <div class="space-y-4 pt-4">
              <!-- 服务器操作 -->
              <div class="flex flex-row gap-3">
                <Button
                  label="重启服务"
                  icon="pi pi-refresh"
                  outlined
                  severity="warn"
                  :loading="restarting"
                  @click="handleRestartService"
                  class="justify-start"
                />
                <Button
                  label="重置通信密钥"
                  outlined
                  :loading="restarting"
                  @click="handleRestartService"
                  class="justify-start"
                />
              </div>
              <Divider />
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
          </TabPanel>

          <!-- 告警配置 Tab -->
          <TabPanel v-if="isEditing" value="4">
            <div class="space-y-4 pt-4">
              <div v-if="loadingAlertRules" class="flex flex-col items-center justify-center py-10">
                <ProgressSpinner
                  style="width: 40px; height: 40px"
                  strokeWidth="4"
                  fill="transparent"
                  animationDuration="0.5s"
                />
                <p class="mt-3 text-sm text-muted-color">加载告警规则中...</p>
              </div>
              <div v-else-if="alertRules" class="space-y-6">
                <!-- 基础资源告警 -->
                <div class="space-y-4">
                  <h3 class="text-base font-semibold text-color flex items-center gap-2">
                    <i class="pi pi-server text-primary"></i>
                    基础资源告警
                  </h3>
                  <div class="grid grid-cols-3 gap-4 items-start">
                    <!-- CPU 告警 -->
                    <div class="space-y-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-color">CPU 使用率</label>
                        <InputSwitch v-model="alertRules.cpu.enabled" />
                      </div>
                      <div v-if="alertRules.cpu.enabled" class="space-y-2">
                        <div>
                          <label class="text-xs text-muted-color">警告阈值 (%)</label>
                          <InputNumber
                            v-model="alertRules.cpu.warning"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.cpu.enabled"
                            class="w-full"
                          />
                        </div>
                        <div>
                          <label class="text-xs text-muted-color">严重阈值 (%)</label>
                          <InputNumber
                            v-model="alertRules.cpu.critical"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.cpu.enabled"
                            class="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- 内存告警 -->
                    <div class="space-y-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-color">内存使用率</label>
                        <InputSwitch v-model="alertRules.memory.enabled" />
                      </div>
                      <div v-if="alertRules.memory.enabled" class="space-y-2">
                        <div>
                          <label class="text-xs text-muted-color">警告阈值 (%)</label>
                          <InputNumber
                            v-model="alertRules.memory.warning"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.memory.enabled"
                            class="w-full"
                          />
                        </div>
                        <div>
                          <label class="text-xs text-muted-color">严重阈值 (%)</label>
                          <InputNumber
                            v-model="alertRules.memory.critical"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.memory.enabled"
                            class="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- 磁盘告警 -->
                    <div class="space-y-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-color">磁盘使用率</label>
                        <InputSwitch v-model="alertRules.disk.enabled" />
                      </div>
                      <div v-if="alertRules.disk.enabled" class="space-y-2">
                        <div>
                          <label class="text-xs text-muted-color">警告阈值 (%)</label>
                          <InputNumber
                            v-model="alertRules.disk.warning"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.disk.enabled"
                            class="w-full"
                          />
                        </div>
                        <div>
                          <label class="text-xs text-muted-color">严重阈值 (%)</label>
                          <InputNumber
                            v-model="alertRules.disk.critical"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.disk.enabled"
                            class="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 网络资源告警 -->
                <div class="space-y-4">
                  <h3 class="text-base font-semibold text-color flex items-center gap-2">
                    <i class="pi pi-wifi text-primary"></i>
                    网络资源告警
                  </h3>
                  <div class="grid grid-cols-2 gap-4 items-start">
                    <!-- 带宽峰值告警 -->
                    <div class="space-y-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-color">带宽峰值</label>
                        <InputSwitch
                          :model-value="alertRules?.bandwidth?.enabled ?? false"
                          @update:model-value="
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
                          <InputNumber
                            v-model="alertRules.bandwidth!.threshold"
                            :min="0"
                            :disabled="!alertRules.bandwidth?.enabled"
                            suffix=" Mbps"
                            class="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- 流量耗尽告警 -->
                    <div class="space-y-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-color">流量耗尽</label>
                        <InputSwitch
                          :model-value="alertRules?.traffic?.enabled ?? false"
                          @update:model-value="
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
                          <InputNumber
                            v-model="alertRules.traffic!.threshold_percent"
                            :min="0"
                            :max="100"
                            :disabled="!alertRules.traffic?.enabled"
                            suffix=" %"
                            class="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 其他告警 -->
                <div class="space-y-4">
                  <h3 class="text-base font-semibold text-color flex items-center gap-2">
                    <i class="pi pi-bell text-primary"></i>
                    其他告警
                  </h3>
                  <div class="grid grid-cols-1 gap-4">
                    <!-- 到期提醒 -->
                    <div class="space-y-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-color">服务器到期提醒</label>
                        <InputSwitch
                          :model-value="alertRules?.expiration?.enabled ?? false"
                          @update:model-value="
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
                          <InputNumber
                            v-model="alertRules.expiration!.alert_days"
                            :min="1"
                            :disabled="!alertRules.expiration?.enabled"
                            suffix=" 天"
                            class="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              <div v-else class="text-center py-8 text-muted-color">无法加载告警规则</div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </form>

    <template #footer>
      <div class="flex gap-3">
        <Button label="取消" text @click="handleCancel" class="px-6 py-2" />
        <Button
          :label="isEditing ? '更新配置' : '添加服务器'"
          :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
          @click="handleSave"
          :loading="props.saving || savingAlertRules"
          class="px-6 py-2 font-medium"
        />
      </div>
    </template>
    <ConfirmPopup />
  </Dialog>
</template>
