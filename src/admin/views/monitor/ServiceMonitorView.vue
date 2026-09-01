<script setup lang="ts">
import { h, ref, onMounted, onUnmounted } from 'vue'
import { NTag, useMessage, type DataTableColumns } from 'naive-ui'
import serviceMonitorsApi, {
  type ServiceMonitor,
  type ServiceMonitorForm,
  type ServiceMonitorResult,
} from '@/admin/apis/service-monitors'
import serversApi from '@/admin/apis/servers'
import type { GetServersResponse } from '@/shared/types/manager/servers'
import websocketManager from '@/admin/services/websocket-manager'
import { useAuthStore } from '@/admin/stores/auth'
import { RiAddLine } from '@remixicon/vue'
import ServiceMonitorCard from './components/ServiceMonitorCard.vue'
import ServiceMonitorFormModal from './components/ServiceMonitorFormModal.vue'

const message = useMessage()
const authStore = useAuthStore()

const monitors = ref<ServiceMonitor[]>([])
const servers = ref<{ id: string; name: string }[]>([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const resultsLoading = ref(false)
const resultsDialog = ref(false)
const selectedMonitor = ref<ServiceMonitor | null>(null)
const monitorResults = ref<ServiceMonitorResult[]>([])

const defaultForm = (): ServiceMonitorForm => ({
  name: '',
  group_name: '',
  type: 'http',
  target: '',
  port: 0,
  interval: 60,
  timeout: 10,
  enabled: true,
  server_ids: [],
  expect_status: 200,
  expect_body: '',
  http_method: 'GET',
  http_headers: '',
  http_body: '',
  failure_threshold: 1,
  recovery_threshold: 1,
  check_cert_expiry: false,
  ai_api_format: 'chat_completions',
  ai_model: '',
  ai_models: [],
  ai_api_key: '',
})

const form = ref<ServiceMonitorForm>(defaultForm())

const load = async () => {
  loading.value = true
  try {
    const res = (await serviceMonitorsApi.getAll()) as { status: boolean; data?: ServiceMonitor[] }
    if (res.status) monitors.value = res.data || []
  } catch (e) {
    console.error('加载服务监测列表失败:', e)
    message.error((e as { message?: string }).message || '加载监测列表失败')
  } finally {
    loading.value = false
  }
}

const loadServers = async () => {
  try {
    const res = (await serversApi.getServers()) as GetServersResponse
    if (res.status && res.data) {
      servers.value = res.data.map((s) => ({
        id: s.id,
        name: s.name,
      }))
    }
  } catch (e) {
    console.error('加载服务器列表失败:', e)
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = defaultForm()
  showDialog.value = true
}

const openEdit = (m: ServiceMonitor) => {
  editingId.value = m.id
  form.value = {
    name: m.name,
    group_name: m.group_name || '',
    type: m.type,
    target: m.target,
    port: m.port,
    interval: m.interval,
    timeout: m.timeout,
    enabled: m.enabled,
    server_ids: m.server_ids || [],
    expect_status: m.expect_status || 0,
    expect_body: m.expect_body || '',
    http_method: m.http_method || 'GET',
    http_headers: m.http_headers || '',
    http_body: m.http_body || '',
    failure_threshold: m.failure_threshold || 1,
    recovery_threshold: m.recovery_threshold || 1,
    check_cert_expiry: m.type === 'https' && !!m.check_cert_expiry,
    ai_api_format: m.ai_api_format || 'chat_completions',
    ai_model: m.ai_model || '',
    ai_models: m.ai_model ? [m.ai_model] : [],
    ai_api_key: '',
  }
  showDialog.value = true
}

const save = async () => {
  const isAICreate = form.value.type === 'ai_model' && !editingId.value
  if ((!isAICreate && !form.value.name) || !form.value.target) {
    message.error(isAICreate ? '接口地址不能为空' : '名称和目标地址不能为空')
    return
  }
  // http_headers 必须是 JSON 对象（后端会解析），前置校验给出即时反馈
  if ((form.value.type === 'http' || form.value.type === 'https') && form.value.http_headers) {
    try {
      const parsed = JSON.parse(form.value.http_headers)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not an object')
      }
    } catch {
      message.error('请求头必须是 JSON 对象，例如 {"X-Token":"abc"}')
      return
    }
  }
  if (form.value.type === 'ai_model') {
    const hasModel = editingId.value
      ? !!form.value.ai_model.trim()
      : form.value.ai_models.length > 0
    if (!hasModel) {
      message.error('请至少填写一个模型')
      return
    }
    if (!editingId.value && !form.value.ai_api_key.trim()) {
      message.error('API Key 不能为空')
      return
    }
  }
  saving.value = true
  try {
    if (editingId.value) {
      const res = await serviceMonitorsApi.update(editingId.value, form.value)
      if (res.status) {
        const idx = monitors.value.findIndex((m) => m.id === editingId.value)
        // Update 响应不含 history/uptime（虚拟字段），合并保留，避免状态条被清空
        if (idx !== -1 && res.data) {
          const prev = monitors.value[idx]
          monitors.value[idx] = {
            ...res.data,
            history: prev.history ?? [],
            uptime: res.data.uptime ?? prev.uptime,
          }
        }
        message.success('已更新')
      } else {
        message.error(res.message || '更新失败')
        return
      }
    } else if (isAICreate) {
      const res = await serviceMonitorsApi.createAIModels(form.value)
      if (res.status && res.data) {
        const created = res.data.map((monitor) => ({
          ...monitor,
          history: monitor.history ?? [],
        }))
        monitors.value.unshift(...created)
        message.success(`已创建 ${res.created_count} 个模型监测任务`)
      } else {
        message.error(res.message || '创建失败')
        return
      }
    } else {
      const res = await serviceMonitorsApi.create(form.value)
      if (res.status && res.data) {
        monitors.value.unshift({
          ...res.data,
          history: res.data.history ?? [],
          uptime: res.data.uptime,
        })
        message.success('已创建')
      }
    }
    showDialog.value = false
  } catch {
    message.error('操作失败')
  } finally {
    saving.value = false
  }
}

const remove = async (m: ServiceMonitor) => {
  try {
    const res = (await serviceMonitorsApi.delete(m.id)) as { status: boolean; message?: string }
    if (res.status) {
      monitors.value = monitors.value.filter((x) => x.id !== m.id)
      message.success('已删除')
    } else {
      message.error(res.message || '删除失败')
    }
  } catch (e) {
    message.error((e as { message?: string }).message || '删除失败')
  }
}

const statusLabel = (s: string) =>
  s === 'up' ? '正常' : s === 'down' ? '故障' : s === 'slow' ? '慢响应' : '未知'

const statusTag = (s: string) =>
  s === 'up' ? 'success' : s === 'down' ? 'error' : s === 'slow' ? 'warning' : 'default'

const resultColumns: DataTableColumns<ServiceMonitorResult> = [
  {
    title: '时间',
    key: 'checked_at',
    width: 170,
    render(row) {
      return new Date(row.checked_at).toLocaleString()
    },
  },
  {
    title: '来源',
    key: 'probe_type',
    width: 90,
    render(row) {
      return row.probe_type === 'agent' ? 'Agent' : 'Panel'
    },
  },
  {
    title: '探测点',
    key: 'probe_name',
    minWidth: 160,
    render(row) {
      return row.probe_name || row.probe_id || '-'
    },
  },
  {
    title: '地域',
    key: 'probe_location',
    width: 130,
    render(row) {
      return row.probe_location || '-'
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row) {
      return h(NTag, { size: 'small', type: statusTag(row.status) }, () => statusLabel(row.status))
    },
  },
  {
    title: '响应',
    key: 'response_time',
    width: 90,
    render(row) {
      return `${row.response_time}ms`
    },
  },
  {
    title: '错误',
    key: 'error',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render(row) {
      return row.error || '-'
    },
  },
]

const openResults = async (m: ServiceMonitor) => {
  selectedMonitor.value = m
  resultsDialog.value = true
  resultsLoading.value = true
  try {
    const res = await serviceMonitorsApi.getResults(m.id, 200)
    if (res.status) {
      monitorResults.value = res.data || []
    } else {
      message.error(res.message || '加载监测结果失败')
    }
  } catch {
    message.error('加载监测结果失败')
  } finally {
    resultsLoading.value = false
  }
}

let unregister: (() => void) | null = null
onMounted(async () => {
  await Promise.all([load(), loadServers()])
  if (authStore.isAuthenticated) {
    websocketManager.connect()
    unregister = websocketManager.registerMessageHandler((msg) => {
      if (msg.type === 'service_monitor_update' && msg.data) {
        const d = msg.data as {
          id: number
          status: string
          response_time: number
          last_check_at: string
          last_metadata?: ServiceMonitor['last_metadata']
          metadata_checked_at?: string
          history_entry?: { status: string; response_time: number; checked_at: string }
        }
        const m = monitors.value.find((x) => x.id === d.id)
        if (m) {
          m.status = d.status
          m.response_time = d.response_time
          m.last_check_at = d.last_check_at
          m.last_metadata = d.last_metadata
          m.metadata_checked_at = d.metadata_checked_at
          if (d.history_entry) {
            if (!m.history) m.history = []
            m.history.push(d.history_entry)
            if (m.history.length > 60) m.history.shift()
          }
        }
      }
    })
  }
})

onUnmounted(() => {
  unregister?.()
})
</script>

<template>
  <div class="service-monitor-view min-w-0 overflow-x-hidden">
    <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <n-h1 class="!mb-1">服务监测</n-h1>
        <n-text depth="3">监测网络服务、Minecraft 服务器与 AI 模型接口状态</n-text>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon><ri-add-line /></template>
        添加监测任务
      </n-button>
    </div>

    <n-spin :show="loading">
      <n-empty
        v-if="!loading && monitors.length === 0"
        description="暂无监测项，点击右上角添加"
        class="py-16"
      />
      <div v-else class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <service-monitor-card
          v-for="m in monitors"
          :key="m.id"
          :monitor="m"
          @edit="openEdit"
          @remove="remove"
          @view-results="openResults"
        />
      </div>
    </n-spin>

    <service-monitor-form-modal
      v-model:show="showDialog"
      v-model:form="form"
      :editing-id="editingId"
      :servers="servers"
      :saving="saving"
      @save="save"
    />

    <n-modal v-model:show="resultsDialog" preset="card" class="max-w-5xl" :bordered="false">
      <template #header>
        <span>监测结果 - {{ selectedMonitor?.name || '-' }}</span>
      </template>
      <n-data-table
        size="small"
        :loading="resultsLoading"
        :columns="resultColumns"
        :data="monitorResults"
        :pagination="{ pageSize: 10 }"
        :scroll-x="960"
      />
    </n-modal>
  </div>
</template>

<style scoped>
.service-monitor-view {
  width: 100%;
}
</style>
