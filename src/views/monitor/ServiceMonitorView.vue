<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import serviceMonitorsApi, {
  type ServiceMonitor,
  type ServiceMonitorForm,
} from '@/apis/service-monitors'
import serversApi from '@/apis/servers'
import websocketManager from '@/services/websocket-manager'
import { useAuthStore } from '@/stores/auth'
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

const defaultForm = (): ServiceMonitorForm => ({
  name: '',
  type: 'http',
  target: '',
  port: 0,
  interval: 60,
  timeout: 10,
  enabled: true,
  server_ids: [],
  expect_status: 0,
  expect_body: '',
})

const form = ref<ServiceMonitorForm>(defaultForm())

const load = async () => {
  loading.value = true
  try {
    const res = await serviceMonitorsApi.getAll()
    if (res.status) monitors.value = res.data || []
  } finally {
    loading.value = false
  }
}

const loadServers = async () => {
  const res = await serversApi.getServers()
  if (res.status && res.data) {
    servers.value = (res.data as { id: string; name: string }[]).map((s) => ({
      id: s.id,
      name: s.name,
    }))
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
    type: m.type,
    target: m.target,
    port: m.port,
    interval: m.interval,
    timeout: m.timeout,
    enabled: m.enabled,
    server_ids: m.server_ids || [],
    expect_status: m.expect_status || 0,
    expect_body: m.expect_body || '',
  }
  showDialog.value = true
}

const save = async () => {
  if (!form.value.name || !form.value.target) {
    message.error('名称和目标地址不能为空')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      const res = await serviceMonitorsApi.update(editingId.value, form.value)
      if (res.status) {
        const idx = monitors.value.findIndex((m) => m.id === editingId.value)
        if (idx !== -1 && res.data) monitors.value[idx] = res.data
        message.success('已更新')
      }
    } else {
      const res = await serviceMonitorsApi.create(form.value)
      if (res.status && res.data) {
        monitors.value.unshift(res.data)
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
  const res = await serviceMonitorsApi.delete(m.id)
  if (res.status) {
    monitors.value = monitors.value.filter((x) => x.id !== m.id)
    message.success('已删除')
  }
}

let unregister: (() => void) | null = null
onMounted(async () => {
  await Promise.all([load(), loadServers()])
  const token = authStore.getToken()
  if (token) {
    websocketManager.connect(token)
    unregister = websocketManager.registerMessageHandler((msg) => {
      if (msg.type === 'service_monitor_update' && msg.data) {
        const d = msg.data as {
          id: number
          status: string
          response_time: number
          last_check_at: string
          history_entry?: { status: string; response_time: number; checked_at: string }
        }
        const m = monitors.value.find((x) => x.id === d.id)
        if (m) {
          m.status = d.status
          m.response_time = d.response_time
          m.last_check_at = d.last_check_at
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
  <div>
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">服务监测</h1>
        <p class="text-muted-color">监测 HTTP/HTTPS/TCP/UDP 在线服务状态</p>
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
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <service-monitor-card
          v-for="m in monitors"
          :key="m.id"
          :monitor="m"
          @edit="openEdit"
          @remove="remove"
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
  </div>
</template>
