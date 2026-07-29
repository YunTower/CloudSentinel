<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMessage, type SelectOption } from 'naive-ui'
import incidentsApi from '@/admin/apis/incidents'
import publicPagesApi from '@/admin/apis/settings/public-pages'
import type { Incident, IncidentEvent } from '@/shared/types/incidents'
import type { PublicPagesConfigV1, PublicPageV1 } from '@/shared/types/settings/public-pages'
import type { ApiResponse } from '@/shared/types/settings/api'
import { normalizeBoundPublicPages } from '@/shared/public-page/ensureIncidentsSeparated'
import { isIncidentsOnlyPage } from '@/shared/public-page/filterPublicIncidents'
import { RiAddLine, RiCheckLine, RiEdit2Line, RiRefreshLine } from '@remixicon/vue'

type ManualImpact = 'outage' | 'degraded' | 'maintenance'

const message = useMessage()
const incidents = ref<Incident[]>([])
const loading = ref(false)
const statusFilter = ref<'all' | 'active' | 'resolved'>('all')
const sourceFilter = ref<'all' | 'service_monitor' | 'server' | 'maintenance'>('all')
const createDialog = ref(false)
const createSaving = ref(false)
const createForm = ref<{
  title: string
  message: string
  impact: ManualImpact
  page_ids: string[]
}>({
  title: '',
  message: '',
  impact: 'maintenance',
  page_ids: [],
})
const updateDialog = ref(false)
const updateSaving = ref(false)
const selectedIncident = ref<Incident | null>(null)
const updateMessage = ref('')
const publicPages = ref<PublicPageV1[]>([])

const impactOptions: SelectOption[] = [
  { label: '服务中断', value: 'outage' },
  { label: '性能下降', value: 'degraded' },
  { label: '维护', value: 'maintenance' },
]

/** 绑定页列表（排除历史独立事件页） */
const pageOptions = computed(() =>
  publicPages.value
    .filter((p) => !isIncidentsOnlyPage(p))
    .map((p) => ({
      label: `${p.title || p.id}（${p.path}）`,
      value: p.id,
    })),
)

const pageTitleById = computed(() => {
  const map = new Map<string, string>()
  for (const p of publicPages.value) {
    map.set(p.id, p.title || p.id)
  }
  return map
})

const activeIncidents = computed(() => incidents.value.filter((item) => item.status === 'active'))
const resolvedIncidents = computed(() => incidents.value.filter((item) => item.status !== 'active'))
const visibleIncidents = computed(() =>
  incidents.value.filter((item) => {
    if (statusFilter.value !== 'all') {
      if (statusFilter.value === 'active' && item.status !== 'active') return false
      if (statusFilter.value === 'resolved' && item.status === 'active') return false
    }
    if (sourceFilter.value !== 'all' && item.source_type !== sourceFilter.value) return false
    return true
  }),
)

const loadPages = async () => {
  try {
    const res = await publicPagesApi.getPublicPagesSettings()
    const data = res as ApiResponse<PublicPagesConfigV1>
    if (data.status && data.data?.pages) {
      publicPages.value = normalizeBoundPublicPages(data.data).pages
    }
  } catch (err) {
    console.warn('加载公开页面失败:', err)
  }
}

const load = async () => {
  loading.value = true
  try {
    const res = await incidentsApi.getAll()
    if (res.status) {
      incidents.value = res.data || []
    } else {
      message.error(res.message || '加载事件失败')
    }
  } catch (err) {
    console.error('Failed to load incidents:', err)
    message.error('加载事件失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const durationText = (incident: Incident) => {
  const started = new Date(incident.started_at).getTime()
  const ended = incident.resolved_at ? new Date(incident.resolved_at).getTime() : Date.now()
  if (Number.isNaN(started) || Number.isNaN(ended) || ended < started) return '-'
  const minutes = Math.max(1, Math.floor((ended - started) / 60000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return `${hours} 小时 ${rest} 分钟`
  const days = Math.floor(hours / 24)
  return `${days} 天 ${hours % 24} 小时`
}

const impactLabel = (impact: string) => {
  if (impact === 'degraded') return '性能下降'
  if (impact === 'outage') return '服务中断'
  if (impact === 'maintenance') return '维护'
  return impact || '未知'
}

const impactTag = (impact: string) => {
  if (impact === 'degraded') return 'warning'
  if (impact === 'outage') return 'error'
  if (impact === 'maintenance') return 'info'
  return 'default'
}

const statusLabel = (status: string) => {
  if (status === 'active') return '处理中'
  if (status === 'resolved') return '已恢复'
  return status || '未知'
}

const statusTag = (status: string) => (status === 'active' ? 'error' : 'success')

const sourceLabel = (sourceType: string) => {
  if (sourceType === 'service_monitor') return '服务监测'
  if (sourceType === 'server') return '服务器'
  if (sourceType === 'maintenance') return '手动事件'
  return sourceType || '未知'
}

const pageScopeText = (incident: Incident) => {
  if (incident.source_type !== 'maintenance') return '-'
  const ids = incident.page_ids || []
  if (ids.length === 0) return '全部公开页'
  return ids.map((id) => pageTitleById.value.get(id) || id).join('、')
}

const eventTypeLabel = (event: IncidentEvent) => {
  if (event.event_type === 'opened') return '发生'
  if (event.event_type === 'resolved') return '恢复'
  if (event.event_type === 'update') return '更新'
  return event.event_type
}

const timelineType = (event: IncidentEvent) => {
  if (event.event_type === 'resolved' || event.status === 'up') return 'success'
  if (event.status === 'maintenance') return 'info'
  if (event.status === 'slow' || event.status === 'degraded') return 'warning'
  if (event.status === 'down' || event.status === 'outage') return 'error'
  return 'default'
}

/** 事件时间轴：从晚到早 */
const sortedEvents = (events?: IncidentEvent[]) =>
  [...(events || [])].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )

const openCreateDialog = async () => {
  createForm.value = { title: '', message: '', impact: 'maintenance', page_ids: [] }
  if (publicPages.value.length === 0) await loadPages()
  createDialog.value = true
}

const createIncident = async () => {
  if (!createForm.value.title.trim() || !createForm.value.message.trim()) {
    message.error('标题和内容不能为空')
    return
  }
  createSaving.value = true
  try {
    const res = await incidentsApi.createMaintenance({
      title: createForm.value.title.trim(),
      message: createForm.value.message.trim(),
      impact: createForm.value.impact,
      page_ids: createForm.value.page_ids,
    })
    if (res.status) {
      message.success('事件已创建')
      createDialog.value = false
      await load()
    } else {
      message.error(res.message || '创建失败')
    }
  } finally {
    createSaving.value = false
  }
}

const openUpdateDialog = (incident: Incident) => {
  selectedIncident.value = incident
  updateMessage.value = ''
  updateDialog.value = true
}

const addIncidentUpdate = async () => {
  if (!selectedIncident.value || !updateMessage.value.trim()) return
  updateSaving.value = true
  try {
    const res = await incidentsApi.addMaintenanceUpdate(selectedIncident.value.id, {
      message: updateMessage.value.trim(),
    })
    if (res.status) {
      message.success('更新已添加')
      updateDialog.value = false
      await load()
    } else {
      message.error(res.message || '添加失败')
    }
  } finally {
    updateSaving.value = false
  }
}

const resolveIncident = async (incident: Incident) => {
  const res = await incidentsApi.resolveMaintenance(incident.id, { message: '事件已结束。' })
  if (res.status) {
    message.success('事件已结束')
    await load()
  } else {
    message.error(res.message || '操作失败')
  }
}

onMounted(async () => {
  await Promise.all([load(), loadPages()])
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h1 class="text-3xl font-bold text-color mb-1">事件</h1>
        <p class="text-muted-color">服务异常、响应慢与恢复事件时间线</p>
      </div>
      <div class="flex gap-2">
        <n-button secondary @click="openCreateDialog">
          <template #icon><ri-add-line /></template>
          创建事件
        </n-button>
        <n-button secondary :loading="loading" @click="load">
          <template #icon><ri-refresh-line /></template>
          刷新
        </n-button>
      </div>
    </div>

    <n-spin :show="loading">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <n-card size="small">
          <div class="text-sm text-muted-color">进行中事件</div>
          <div class="mt-1 text-2xl font-semibold text-color">{{ activeIncidents.length }}</div>
        </n-card>
        <n-card size="small">
          <div class="text-sm text-muted-color">已恢复事件</div>
          <div class="mt-1 text-2xl font-semibold text-color">{{ resolvedIncidents.length }}</div>
        </n-card>
        <n-card size="small">
          <div class="text-sm text-muted-color">总事件数</div>
          <div class="mt-1 text-2xl font-semibold text-color">{{ incidents.length }}</div>
        </n-card>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <n-radio-group v-model:value="statusFilter" size="small">
          <n-radio-button value="all">全部</n-radio-button>
          <n-radio-button value="active">进行中</n-radio-button>
          <n-radio-button value="resolved">已恢复</n-radio-button>
        </n-radio-group>
        <n-radio-group v-model:value="sourceFilter" size="small">
          <n-radio-button value="all">全部来源</n-radio-button>
          <n-radio-button value="service_monitor">服务监测</n-radio-button>
          <n-radio-button value="server">服务器</n-radio-button>
          <n-radio-button value="maintenance">手动事件</n-radio-button>
        </n-radio-group>
      </div>

      <n-empty
        v-if="!loading && incidents.length === 0"
        description="暂无事件。服务出现故障或恢复后会自动记录，也可手动创建事件。"
        class="py-16"
      />
      <n-empty
        v-else-if="!loading && visibleIncidents.length === 0"
        description="当前筛选条件下暂无事件"
        class="py-16"
      />

      <div v-else class="space-y-3 mt-4">
        <n-card v-for="incident in visibleIncidents" :key="incident.id" size="small">
          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <n-tag :type="statusTag(incident.status)" size="small">
                  {{ statusLabel(incident.status) }}
                </n-tag>
                <n-tag :type="impactTag(incident.impact)" size="small">
                  {{ impactLabel(incident.impact) }}
                </n-tag>
                <span class="font-semibold text-color truncate">{{ incident.title }}</span>
              </div>
              <div
                v-if="incident.source_type === 'maintenance' && incident.status === 'active'"
                class="mt-3 flex flex-wrap gap-2"
              >
                <n-button size="small" secondary @click="openUpdateDialog(incident)">
                  <template #icon><ri-edit2-line /></template>
                  添加更新
                </n-button>
                <n-popconfirm @positive-click="resolveIncident(incident)">
                  <template #trigger>
                    <n-button size="small" type="success" secondary>
                      <template #icon><ri-check-line /></template>
                      结束事件
                    </n-button>
                  </template>
                  确认结束此事件？
                </n-popconfirm>
              </div>

              <div class="mt-3">
                <n-timeline>
                  <n-timeline-item
                    v-for="event in sortedEvents(incident.events)"
                    :key="event.id"
                    :type="timelineType(event)"
                    :title="eventTypeLabel(event)"
                    :content="event.message"
                    :time="formatTime(event.occurred_at)"
                  />
                </n-timeline>
              </div>
            </div>

            <div class="incident-meta">
              <div>
                <div class="meta-label">来源</div>
                <div class="meta-value">{{ sourceLabel(incident.source_type) }} #{{ incident.source_id }}</div>
              </div>
              <div v-if="incident.source_type === 'maintenance'">
                <div class="meta-label">展示页面</div>
                <div class="meta-value">{{ pageScopeText(incident) }}</div>
              </div>
              <div>
                <div class="meta-label">开始时间</div>
                <div class="meta-value">{{ formatTime(incident.started_at) }}</div>
              </div>
              <div>
                <div class="meta-label">恢复时间</div>
                <div class="meta-value">{{ formatTime(incident.resolved_at) }}</div>
              </div>
              <div>
                <div class="meta-label">持续时间</div>
                <div class="meta-value">{{ durationText(incident) }}</div>
              </div>
            </div>
          </div>
        </n-card>
      </div>
    </n-spin>

    <n-modal v-model:show="createDialog" preset="card" title="创建事件" class="max-w-xl">
      <n-form label-placement="top">
        <n-form-item label="标题" required>
          <n-input v-model:value="createForm.title" placeholder="例如：数据库维护 / API 异常" />
        </n-form-item>
        <n-form-item label="影响类型" required>
          <n-select v-model:value="createForm.impact" :options="impactOptions" />
        </n-form-item>
        <n-form-item label="展示页面">
          <n-select
            v-model:value="createForm.page_ids"
            multiple
            clearable
            filterable
            :options="pageOptions"
            :placeholder="
              pageOptions.length ? '留空则在全部公开页展示' : '暂无公开页面，请先在公开配置中创建'
            "
            :disabled="pageOptions.length === 0"
          />
        </n-form-item>
        <n-form-item label="内容" required>
          <n-input
            v-model:value="createForm.message"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            placeholder="说明影响范围、预计时间或当前进展"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="createDialog = false">取消</n-button>
          <n-button type="primary" :loading="createSaving" @click="createIncident">
            创建
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal v-model:show="updateDialog" preset="card" title="添加更新" class="max-w-xl">
      <n-input
        v-model:value="updateMessage"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 8 }"
        placeholder="输入本次进展"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="updateDialog = false">取消</n-button>
          <n-button type="primary" :loading="updateSaving" @click="addIncidentUpdate">
            添加
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.incident-meta {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 12px;
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  background: var(--surface-50);
}

.meta-label {
  font-size: 12px;
  color: var(--text-muted-color);
}

.meta-value {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-color);
  word-break: break-word;
}
</style>
