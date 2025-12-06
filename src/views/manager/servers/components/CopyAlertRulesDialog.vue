<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import { Loading } from '@/components/Loading'
import type { Server, ServerAlertRules } from '@/types/manager/servers'
import serversApi from '@/apis/servers'

interface Props {
  visible: boolean
  sourceServers: Server[]
  allServers: Server[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const toast = useToast()
const loading = ref(false)
const saving = ref(false)

// 源服务器
const sourceServer = computed(() => props.sourceServers[0])
// 目标服务器
const targetServers = computed(() => {
  if (!sourceServer.value) return []
  return props.allServers.filter((server) => server.id !== sourceServer.value.id)
})

// 源服务器的告警规则
const sourceAlertRules = ref<ServerAlertRules | null>(null)
const enabledRuleTypes = ref<string[]>([]) // 已启用的规则类型
const selectedRuleTypes = ref<string[]>([]) // 用户选择的规则类型
const selectedTargetServerIds = ref<string[]>([]) // 选中的目标服务器ID

// 规则类型标签映射
const ruleTypeLabels: Record<string, string> = {
  cpu: 'CPU 使用率',
  memory: '内存使用率',
  disk: '磁盘使用率',
  bandwidth: '带宽峰值',
  traffic: '流量耗尽',
  expiration: '服务器到期',
}

// 加载源服务器的告警规则
const loadSourceAlertRules = async () => {
  if (!sourceServer.value) return

  loading.value = true
  try {
    const response = await serversApi.getServerAlertRules(sourceServer.value.id)
    if (response.status && response.data) {
      sourceAlertRules.value = response.data
      // 提取已启用的规则类型
      enabledRuleTypes.value = []
      if (response.data.cpu?.enabled) enabledRuleTypes.value.push('cpu')
      if (response.data.memory?.enabled) enabledRuleTypes.value.push('memory')
      if (response.data.disk?.enabled) enabledRuleTypes.value.push('disk')
      if (response.data.bandwidth?.enabled) enabledRuleTypes.value.push('bandwidth')
      if (response.data.traffic?.enabled) enabledRuleTypes.value.push('traffic')
      if (response.data.expiration?.enabled) enabledRuleTypes.value.push('expiration')
      // 默认选中所有已启用的规则
      selectedRuleTypes.value = [...enabledRuleTypes.value]
    } else {
      sourceAlertRules.value = null
      enabledRuleTypes.value = []
      selectedRuleTypes.value = []
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '加载告警规则失败'
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: errorMessage,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// 获取规则显示文本
const getRuleDisplayText = (ruleType: string): string => {
  if (!sourceAlertRules.value) return ''
  const rule = sourceAlertRules.value[ruleType as keyof ServerAlertRules]
  if (!rule || typeof rule !== 'object' || !('enabled' in rule)) return ''

  const ruleObj = rule as Record<string, unknown>

  switch (ruleType) {
    case 'cpu':
    case 'memory':
    case 'disk':
      return `警告: ${ruleObj.warning}%, 严重: ${ruleObj.critical}%`
    case 'bandwidth':
      return `阈值: ${ruleObj.threshold} Mbps`
    case 'traffic':
      return `阈值: ${ruleObj.threshold_percent}%`
    case 'expiration':
      return `提前 ${ruleObj.alert_days} 天告警`
    default:
      return ''
  }
}

// 确认复制
const handleConfirm = async () => {
  if (selectedRuleTypes.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: '请选择规则',
      detail: '请至少选择一个告警规则',
      life: 3000,
    })
    return
  }

  if (selectedTargetServerIds.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: '请选择目标服务器',
      detail: '请至少选择一个目标服务器',
      life: 3000,
    })
    return
  }

  saving.value = true
  try {
    await serversApi.copyAlertRules(
      sourceServer.value.id,
      selectedTargetServerIds.value,
      selectedRuleTypes.value,
    )

    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: '告警规则已成功复制到目标服务器',
      life: 3000,
    })

    emit('update:visible', false)
    emit('success')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '复制告警规则失败'
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: errorMessage,
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

// 监听对话框显示状态
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      // 重置选择
      selectedRuleTypes.value = []
      selectedTargetServerIds.value = []
      // 加载源服务器规则
      loadSourceAlertRules()
    }
  },
)

// 监听 enabledRuleTypes 变化，自动选中所有已启用的规则
watch(
  enabledRuleTypes,
  (newValue) => {
    selectedRuleTypes.value = [...newValue]
  },
  { immediate: true },
)
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    header="复制告警规则"
    :style="{ width: '800px' }"
    :draggable="false"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <Loading :loading="loading" text="加载告警规则中..." :overlay="false" />

    <template v-if="!loading">
      <div v-if="!sourceServer" class="py-8 text-center text-muted-color">
        请先选择一个源服务器
      </div>

      <div v-else-if="enabledRuleTypes.length === 0" class="py-8 text-center">
        <p class="text-muted-color mb-2">源服务器 "{{ sourceServer.name }}" 没有配置告警规则</p>
        <p class="text-sm text-muted-color">请先为该服务器配置告警规则后再进行复制</p>
      </div>

      <div v-else class="space-y-6">
      <!-- 源服务器信息 -->
      <div class="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
        <p class="text-sm font-medium text-color mb-1">源服务器</p>
        <p class="text-lg font-semibold text-color">
          {{ sourceServer.name }} ({{ sourceServer.ip }})
        </p>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <!-- 左侧：选择规则 -->
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-color mb-3">选择要复制的规则</p>
            <div class="space-y-2">
              <div
                v-for="ruleType in enabledRuleTypes"
                :key="ruleType"
                class="flex items-start gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                <Checkbox
                  :inputId="`rule-${ruleType}`"
                  v-model="selectedRuleTypes"
                  :value="ruleType"
                  :binary="false"
                />
                <label :for="`rule-${ruleType}`" class="flex-1 cursor-pointer">
                  <div class="font-medium text-color">{{ ruleTypeLabels[ruleType] }}</div>
                  <div class="text-sm text-muted-color mt-1">
                    {{ getRuleDisplayText(ruleType) }}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：选择目标服务器 -->
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-color mb-3">选择目标服务器</p>
            <div v-if="targetServers.length === 0" class="text-sm text-muted-color py-4">
              没有可用的目标服务器
            </div>
            <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
              <div
                v-for="server in targetServers"
                :key="server.id"
                class="flex items-center gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                <Checkbox
                  :inputId="`target-${server.id}`"
                  v-model="selectedTargetServerIds"
                  :value="server.id"
                  :binary="false"
                />
                <label :for="`target-${server.id}`" class="flex-1 cursor-pointer">
                  <div class="font-medium text-color">{{ server.name }}</div>
                  <div class="text-sm text-muted-color">{{ server.ip }}</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="取消"
          text
          @click="emit('update:visible', false)"
          :disabled="saving"
        />
        <Button
          label="确认复制"
          icon="pi pi-check"
          @click="handleConfirm"
          :loading="saving"
          :disabled="enabledRuleTypes.length === 0 || targetServers.length === 0"
        />
      </div>
    </template>
  </Dialog>
</template>

