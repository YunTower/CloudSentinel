<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/types/server'
import type {
  PublicPageV1,
  PublicPageBlockV1,
  PublicBlockHeroV1,
  PublicBlockMarkdownV1,
  PublicBlockStatsV1,
  PublicBlockServerListV1,
  PublicBlockServiceStatusV1,
  PublicBlockIncidentsV1,
  PublicBlockLinksV1,
  PublicStatItemV1,
} from '@/types/settings/public-pages'
import type { PublicDisplayFieldsV1 } from '@/types/settings/public-display'
import type { PublicIncident, PublicIncidentEvent } from '@/types/incidents'
import type { PublicServiceMonitor, ServiceMonitorHistoryEntry } from '@/apis/service-monitors'
import { renderMarkdownSafe } from '@/utils/safeMarkdown'
import { isSafeLinkHref } from '@/utils/safeLink'
import ServerCard from '@/views/overview/components/ServerCard.vue'
import ServerTable from '@/views/overview/components/ServerTable.vue'
import GroupHeader from '@/views/overview/components/GroupHeader.vue'
import { getStatusText, formatOS } from '@/views/overview/utils'

interface Props {
  page: PublicPageV1
  servers: ServerItem[]
  displayFields?: PublicDisplayFieldsV1
  incidents?: PublicIncident[]
  serviceMonitors?: PublicServiceMonitor[]
}

const props = defineProps<Props>()

type ParsedBlock =
  | { type: 'hero'; data: PublicBlockHeroV1 }
  | { type: 'markdown'; data: PublicBlockMarkdownV1 }
  | { type: 'stats'; data: PublicBlockStatsV1 }
  | { type: 'serverList'; data: PublicBlockServerListV1 }
  | { type: 'serviceStatus'; data: PublicBlockServiceStatusV1 }
  | { type: 'incidents'; data: PublicBlockIncidentsV1 }
  | { type: 'links'; data: PublicBlockLinksV1 }
  | { type: 'unknown'; raw: PublicPageBlockV1 }

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const parseBlock = (block: PublicPageBlockV1): ParsedBlock => {
  const obj = asObject(block.data) || {}

  if (block.type === 'hero') {
    return {
      type: 'hero',
      data: {
        title: String(obj.title ?? ''),
        subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : '',
        badge: typeof obj.badge === 'string' ? obj.badge : '',
      },
    }
  }
  if (block.type === 'markdown') {
    return { type: 'markdown', data: { markdown: String(obj.markdown ?? '') } }
  }
  if (block.type === 'stats') {
    const items = Array.isArray(obj.items) ? (obj.items as unknown[]) : []
    return {
      type: 'stats',
      data: {
        items: items.filter(
          (x): x is PublicStatItemV1 => typeof x === 'string',
        ) as PublicStatItemV1[],
      },
    }
  }
  if (block.type === 'serverList') {
    const view = obj.view === 'card' ? 'card' : 'table'
    const groupByRaw = String(obj.groupBy ?? 'none')
    const groupBy: PublicBlockServerListV1['groupBy'] =
      groupByRaw === 'status' || groupByRaw === 'location' || groupByRaw === 'os'
        ? groupByRaw
        : 'none'
    const limit = typeof obj.limit === 'number' ? obj.limit : 0
    const showToolbar = obj.showToolbar !== false
    return { type: 'serverList', data: { view, groupBy, limit, showToolbar } }
  }
  if (block.type === 'serviceStatus') {
    const monitorIdsRaw = Array.isArray(obj.monitorIds) ? (obj.monitorIds as unknown[]) : []
    const monitorIds = monitorIdsRaw
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0)
    const groupByRaw = String(obj.groupBy ?? 'group')
    const groupBy: PublicBlockServiceStatusV1['groupBy'] = groupByRaw === 'none' ? 'none' : 'group'
    const limit = typeof obj.limit === 'number' ? obj.limit : 0
    const showUptime = obj.showUptime !== false
    return { type: 'serviceStatus', data: { monitorIds, groupBy, limit, showUptime } }
  }
  if (block.type === 'incidents') {
    const sourceTypesRaw = Array.isArray(obj.sourceTypes) ? (obj.sourceTypes as unknown[]) : []
    const sourceTypes = sourceTypesRaw.filter(
      (x): x is 'server' | 'service_monitor' => x === 'server' || x === 'service_monitor',
    )
    const limit = typeof obj.limit === 'number' ? obj.limit : 10
    const showResolved = obj.showResolved !== false
    return { type: 'incidents', data: { limit, showResolved, sourceTypes } }
  }
  if (block.type === 'links') {
    const linksRaw = Array.isArray(obj.links) ? (obj.links as unknown[]) : []
    const links = linksRaw
      .map((x) => asObject(x))
      .filter(Boolean)
      .map((o) => ({ label: String(o!.label ?? ''), href: String(o!.href ?? '') }))
      .filter((l) => l.label && l.href)
    return { type: 'links', data: { links } }
  }
  return { type: 'unknown', raw: block }
}

const parsedBlocks = computed(() => props.page.blocks.map(parseBlock))

const statusLabel = (status: ServerItem['status']) => getStatusText(status)

const groupedServers = (servers: ServerItem[], groupBy: PublicBlockServerListV1['groupBy']) => {
  if (groupBy === 'none') return { 全部: servers }
  const grouped: Record<string, ServerItem[]> = {}
  for (const s of servers) {
    let key = '全部'
    if (groupBy === 'status') key = statusLabel(s.status)
    if (groupBy === 'location') key = s.location || '未知地域'
    if (groupBy === 'os') key = formatOS(s.os) || '未知系统'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }
  return grouped
}

const stats = computed(() => {
  const total = props.servers.length
  const online = props.servers.filter((s) => s.status === 'online').length
  const offline = props.servers.filter((s) => s.status !== 'online').length

  const avg = (values: number[]) => {
    if (!values.length) return 0
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  }

  const cpu = avg(props.servers.map((s) => s.cpuUsage))
  const mem = avg(props.servers.map((s) => s.memoryUsage))
  const disk = avg(props.servers.map((s) => s.diskUsage))

  return { total, online, offline, cpu, mem, disk }
})

const statCard = (item: PublicStatItemV1) => {
  const s = stats.value
  switch (item) {
    case 'onlineCount':
      return { label: '在线', value: String(s.online) }
    case 'offlineCount':
      return { label: '离线/异常', value: String(s.offline) }
    case 'totalCount':
      return { label: '总数', value: String(s.total) }
    case 'avgCpu':
      return { label: '平均 CPU', value: `${s.cpu}%` }
    case 'avgMemory':
      return { label: '平均 内存', value: `${s.mem}%` }
    case 'avgDisk':
      return { label: '平均 磁盘', value: `${s.disk}%` }
    default:
      return { label: item, value: '-' }
  }
}

const applyLimit = (servers: ServerItem[], limit?: number) => {
  const n = typeof limit === 'number' ? limit : 0
  if (!n || n <= 0) return servers
  return servers.slice(0, n)
}

const formatTime = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const incidentStatusLabel = (status: string) => {
  if (status === 'active') return '进行中'
  if (status === 'resolved') return '已恢复'
  return status || '未知'
}

const impactLabel = (impact: string) => {
  if (impact === 'outage') return '故障'
  if (impact === 'degraded') return '性能下降'
  if (impact === 'maintenance') return '维护'
  return impact || '未知'
}

const sourceLabel = (sourceType: string) => {
  if (sourceType === 'server') return '服务器'
  if (sourceType === 'service_monitor') return '服务'
  if (sourceType === 'maintenance') return '维护公告'
  return sourceType || '未知来源'
}

const incidentTagType = (incident: PublicIncident) => {
  if (incident.status === 'resolved') return 'success'
  if (incident.impact === 'maintenance') return 'info'
  if (incident.impact === 'degraded') return 'warning'
  return 'error'
}

const eventLineType = (event: PublicIncidentEvent) => {
  if (event.event_type === 'resolved' || event.status === 'up' || event.status === 'online')
    return 'success'
  if (event.status === 'maintenance') return 'info'
  if (event.status === 'slow') return 'warning'
  return 'error'
}

const sortedEvents = (events?: PublicIncidentEvent[]) =>
  [...(events || [])].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )

const filteredIncidents = (cfg: PublicBlockIncidentsV1) => {
  const sourceTypes = new Set(cfg.sourceTypes || [])
  const limit = typeof cfg.limit === 'number' && cfg.limit > 0 ? cfg.limit : 10
  return [...(props.incidents || [])]
    .filter((incident) => {
      if (cfg.showResolved === false && incident.status !== 'active') return false
      if (
        sourceTypes.size > 0 &&
        !sourceTypes.has(incident.source_type as 'server' | 'service_monitor' | 'maintenance')
      )
        return false
      return true
    })
    .sort((a, b) => new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime())
    .slice(0, limit)
}

const monitorStatusLabel = (status: string) => {
  if (status === 'up') return '正常'
  if (status === 'slow') return '性能下降'
  if (status === 'down') return '故障'
  return '未知'
}

const serviceStatusTag = (status: string) => {
  if (status === 'up') return 'success'
  if (status === 'slow') return 'warning'
  if (status === 'down') return 'error'
  return 'default'
}

const serviceHistoryColor = (entry: ServiceMonitorHistoryEntry | null) => {
  if (!entry) return 'bg-slate-200 dark:bg-zinc-700'
  if (entry.status === 'up') return 'bg-emerald-500'
  if (entry.status === 'slow') return 'bg-yellow-400'
  return 'bg-red-500'
}

const serviceHistoryTooltip = (entry: ServiceMonitorHistoryEntry | null) => {
  if (!entry) return '暂无数据'
  return `${monitorStatusLabel(entry.status)} · ${entry.response_time}ms · ${formatTime(entry.checked_at)}`
}

const serviceUptime = (monitor: PublicServiceMonitor, key: '24h' | '7d' | '30d') => {
  const stat = monitor.uptime?.[key]
  if (!stat || stat.total_checks === 0) return '-'
  return `${stat.uptime_rate.toFixed(stat.uptime_rate >= 99.99 ? 3 : 2)}%`
}

const filteredServiceMonitors = (cfg: PublicBlockServiceStatusV1) => {
  const selected = new Set((cfg.monitorIds || []).filter((id) => id > 0))
  const limit = typeof cfg.limit === 'number' && cfg.limit > 0 ? cfg.limit : 0
  const items = [...(props.serviceMonitors || [])].filter((monitor) => {
    if (selected.size === 0) return true
    return selected.has(monitor.id)
  })
  return limit > 0 ? items.slice(0, limit) : items
}

const groupedServiceMonitors = (monitors: PublicServiceMonitor[], groupBy?: 'none' | 'group') => {
  if (groupBy === 'none') return { 全部服务: monitors }
  const groups: Record<string, PublicServiceMonitor[]> = {}
  for (const monitor of monitors) {
    const key = monitor.group_name || '未分组'
    if (!groups[key]) groups[key] = []
    groups[key].push(monitor)
  }
  return groups
}
</script>

<template>
  <div class="space-y-4">
    <template v-for="(block, idx) in parsedBlocks" :key="idx">
      <!-- HERO -->
      <n-card size="small" v-if="block.type === 'hero'">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="text-3xl font-bold text-color tracking-tight">{{ block.data.title }}</div>
            <div v-if="block.data.subtitle" class="text-muted-color">{{ block.data.subtitle }}</div>
          </div>
          <n-tag v-if="block.data.badge" size="small" type="info">{{ block.data.badge }}</n-tag>
        </div>
      </n-card>

      <!-- MARKDOWN -->
      <n-alert v-else-if="block.type === 'markdown'">
        <div
          v-html="renderMarkdownSafe(block.data.markdown || '')"
          class="prose prose-sm dark:prose-invert max-w-none"
        ></div>
      </n-alert>

      <!-- STATS -->
      <div v-else-if="block.type === 'stats'">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <n-card size="small" v-for="it in block.data.items" :key="it">
            <n-statistic :label="statCard(it).label">
              <template #default>
                <div class="font-bold">{{ statCard(it).value }}</div>
              </template>
            </n-statistic>
          </n-card>
        </div>
      </div>

      <!-- SERVER LIST -->
      <div v-else-if="block.type === 'serverList'">
        <div class="space-y-4">
          <div v-if="block.data.showToolbar !== false" class="flex items-center justify-between">
            <div class="text-sm text-muted-color">服务器</div>
            <n-tag size="small" type="default">{{ props.servers.length }} 台</n-tag>
          </div>

          <template v-if="block.data.view === 'table'">
            <template v-if="(block.data.groupBy || 'none') === 'none'">
              <ServerTable
                :servers="applyLimit(props.servers, block.data.limit)"
                :display-fields="props.displayFields"
              />
            </template>
            <template v-else>
              <div
                v-for="(groupServers, groupName) in groupedServers(
                  applyLimit(props.servers, block.data.limit),
                  block.data.groupBy,
                )"
                :key="groupName"
                class="space-y-2"
              >
                <GroupHeader :group-name="groupName" :count="groupServers.length" />
                <ServerTable :servers="groupServers" :display-fields="props.displayFields" />
              </div>
            </template>
          </template>

          <template v-else>
            <template v-if="(block.data.groupBy || 'none') === 'none'">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <ServerCard
                  v-for="s in applyLimit(props.servers, block.data.limit)"
                  :key="s.id"
                  v-bind="s"
                  :display-fields="props.displayFields"
                />
              </div>
            </template>
            <template v-else>
              <div
                v-for="(groupServers, groupName) in groupedServers(
                  applyLimit(props.servers, block.data.limit),
                  block.data.groupBy,
                )"
                :key="groupName"
                class="space-y-3"
              >
                <GroupHeader :group-name="groupName" :count="groupServers.length" />
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <ServerCard
                    v-for="s in groupServers"
                    :key="s.id"
                    v-bind="s"
                    :display-fields="props.displayFields"
                  />
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>

      <!-- SERVICE STATUS -->
      <div v-else-if="block.type === 'serviceStatus'">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-color">服务状态</div>
              <div class="text-xs text-muted-color">公开服务可用性与近期检测结果</div>
            </div>
            <n-tag size="small" type="default">
              {{ filteredServiceMonitors(block.data).length }} 项
            </n-tag>
          </div>

          <n-empty
            v-if="filteredServiceMonitors(block.data).length === 0"
            description="暂无公开服务"
            class="py-8"
          />
          <div v-else class="space-y-4">
            <div
              v-for="(groupMonitors, groupName) in groupedServiceMonitors(
                filteredServiceMonitors(block.data),
                block.data.groupBy,
              )"
              :key="groupName"
              class="space-y-2"
            >
              <GroupHeader :group-name="groupName" :count="groupMonitors.length" />
              <div class="overflow-hidden rounded border border-[var(--n-border-color)]">
                <div
                  v-for="monitor in groupMonitors"
                  :key="monitor.id"
                  class="grid grid-cols-1 gap-2 border-b border-[var(--n-border-color)] p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div class="min-w-0 space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <n-tag :type="serviceStatusTag(monitor.status)" size="small">
                        {{ monitorStatusLabel(monitor.status) }}
                      </n-tag>
                      <span class="font-medium text-color break-words">{{ monitor.name }}</span>
                      <n-tag size="tiny" :bordered="false">{{ monitor.type.toUpperCase() }}</n-tag>
                    </div>
                    <div class="flex flex-wrap gap-3 text-xs text-muted-color">
                      <span>{{ monitor.response_time }}ms</span>
                      <span v-if="monitor.last_check_at">最近 {{ formatTime(monitor.last_check_at) }}</span>
                    </div>
                    <div class="flex gap-0.5">
                      <n-tooltip
                        v-for="(entry, idx) in (monitor.history || []).slice(-36)"
                        :key="idx"
                        placement="top"
                      >
                        <template #trigger>
                          <div
                            class="h-4 w-1.5 flex-shrink-0 cursor-default transition-opacity hover:opacity-75"
                            :class="serviceHistoryColor(entry)"
                          />
                        </template>
                        {{ serviceHistoryTooltip(entry) }}
                      </n-tooltip>
                    </div>
                  </div>
                  <div
                    v-if="block.data.showUptime !== false"
                    class="grid grid-cols-3 gap-2 md:min-w-[220px]"
                  >
                    <div v-for="key in (['24h', '7d', '30d'] as const)" :key="key">
                      <div class="text-[11px] leading-4 text-muted-color">{{ key }}</div>
                      <div class="text-sm font-semibold text-color">
                        {{ serviceUptime(monitor, key) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- INCIDENTS -->
      <div v-else-if="block.type === 'incidents'">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-color">事件时间线</div>
              <div class="text-xs text-muted-color">故障、响应慢、离线与恢复记录</div>
            </div>
            <n-tag size="small" type="default">
              {{ filteredIncidents(block.data).length }} 条
            </n-tag>
          </div>

          <n-empty
            v-if="filteredIncidents(block.data).length === 0"
            description="暂无公开事件"
            class="py-8"
          />
          <div v-else class="space-y-3">
            <n-card
              v-for="incident in filteredIncidents(block.data)"
              :key="incident.id"
              size="small"
            >
              <div class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-medium text-color break-words">{{ incident.title }}</div>
                    <div class="mt-1 text-xs text-muted-color">
                      {{ sourceLabel(incident.source_type) }} · 开始于
                      {{ formatTime(incident.started_at) }}
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <n-tag :type="incidentTagType(incident)" size="small">
                      {{ incidentStatusLabel(incident.status) }}
                    </n-tag>
                    <n-tag size="small" :bordered="false">
                      {{ impactLabel(incident.impact) }}
                    </n-tag>
                  </div>
                </div>

                <n-timeline size="small">
                  <n-timeline-item
                    v-for="event in sortedEvents(incident.events)"
                    :key="event.id"
                    :type="eventLineType(event)"
                    :time="formatTime(event.occurred_at)"
                  >
                    <div class="text-sm text-color break-words">{{ event.message }}</div>
                  </n-timeline-item>
                </n-timeline>
              </div>
            </n-card>
          </div>
        </div>
      </div>

      <!-- LINKS -->
      <n-card size="small" v-else-if="block.type === 'links'">
        <div class="flex flex-wrap gap-2">
          <n-button
            v-for="(l, i) in block.data.links"
            tag="a"
            type="primary"
            :key="i"
            :href="isSafeLinkHref(l.href) ? l.href : undefined"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {{ l.label }}
          </n-button>
        </div>
      </n-card>
    </template>
  </div>
</template>
