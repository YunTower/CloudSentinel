<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  PublicServiceMonitor,
  ServiceMonitorHistoryEntry,
} from '@/shared/types/service-monitor'
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiAlertFill,
  RiArrowDownSLine,
} from '@remixicon/vue'
import { publicStatusTone } from '@/shared/public-page/statusTone'

interface Props {
  monitors: PublicServiceMonitor[]
  showUptime?: boolean
  groupBy?: 'none' | 'group'
}

const props = withDefaults(defineProps<Props>(), {
  showUptime: true,
  groupBy: 'group',
})

const BAR_COUNT = 90

/** 折叠的分组 key；默认全部展开 */
const collapsed = ref<Set<string>>(new Set())
const selectedHistory = ref<Record<number, string>>({})

const statusLabel = (status: string) => {
  if (status === 'up') return '正常'
  if (status === 'slow') return '缓慢'
  if (status === 'down') return '故障'
  return '无数据'
}

const statusIconColor = (status: string) => {
  if (status === 'up') return '#18a058'
  if (status === 'slow') return '#f0a020'
  if (status === 'down') return '#f0a020'
  return '#a1a1aa'
}

const historyColor = (entry: ServiceMonitorHistoryEntry | null | undefined) => {
  if (!entry || !entry.status) return 'bg-zinc-950/12 dark:bg-white/12'
  if (entry.status === 'up') return 'bg-emerald-500'
  if (entry.status === 'slow') return 'bg-amber-400'
  if (entry.status === 'down') return 'bg-amber-500'
  return 'bg-zinc-950/12 dark:bg-white/12'
}

const historyTip = (entry: ServiceMonitorHistoryEntry | null | undefined) => {
  if (!entry || !entry.checked_at) return '暂无数据'
  const formatDate = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
  const day = formatDate(entry.checked_at)
  if (!entry.status) return `${day} · 暂无数据`
  const rt = entry.response_time > 0 ? ` · ${entry.response_time}ms` : ''
  return `${day} · ${statusLabel(entry.status)}${rt}`
}

const uptimeText = (monitor: PublicServiceMonitor) => {
  const stat = monitor.uptime?.['30d'] || monitor.uptime?.['24h']
  if (!stat || stat.total_checks === 0) return null
  const rate =
    stat.uptime_rate >= 99.995 ? '100' : stat.uptime_rate.toFixed(stat.uptime_rate >= 99.9 ? 3 : 2)
  return `${rate}% 可用率`
}

const uptimeColor = (monitor: PublicServiceMonitor) => {
  if (monitor.status === 'down') return 'text-amber-700 dark:text-amber-300'
  if (monitor.status === 'slow') return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

/** 证书剩余天数文案（仅开启检测时展示） */
const certExpiryText = (monitor: PublicServiceMonitor) => {
  if (!monitor.check_cert_expiry || monitor.cert_days_left == null) return null
  const days = monitor.cert_days_left
  if (days < 0) return `证书已过期 ${Math.abs(days)} 天`
  if (days === 0) return '证书今日到期'
  return `证书剩余 ${days} 天`
}

const certExpiryTagType = (monitor: PublicServiceMonitor) => {
  const days = monitor.cert_days_left
  if (days == null) return 'default'
  if (days < 0 || days <= 7) return 'error'
  if (days <= 30) return 'warning'
  return 'success'
}

const aiFormatLabel = (format?: string) => {
  if (format === 'anthropic_messages') return 'Anthropic Messages'
  if (format === 'responses') return 'Responses'
  if (format === 'chat_completions') return 'Chat Completions'
  return format || ''
}

const monitorDetail = (monitor: PublicServiceMonitor) => {
  if (monitor.type === 'ai_model') {
    return [monitor.ai_model, aiFormatLabel(monitor.ai_api_format)].filter(Boolean).join(' · ')
  }
  const metadata = monitor.last_metadata
  if (!['up', 'slow'].includes(monitor.status) || metadata?.kind !== 'minecraft') return ''
  const edition = metadata.edition === 'bedrock' ? 'Bedrock' : 'Java'
  const players =
    metadata.players_online != null && metadata.players_max != null
      ? `${metadata.players_online}/${metadata.players_max} 玩家`
      : ''
  return [edition, metadata.version_name, players, metadata.game_mode].filter(Boolean).join(' · ')
}

const monitorSubtitle = (monitor: PublicServiceMonitor) => {
  if (!['up', 'slow'].includes(monitor.status)) return ''
  if (monitor.last_metadata?.kind !== 'minecraft') return ''
  return monitor.last_metadata.motd || ''
}

const minecraftPlayers = (monitor: PublicServiceMonitor) => {
  const metadata = monitor.last_metadata
  if (metadata?.kind !== 'minecraft') return ''
  if (metadata.players_online == null || metadata.players_max == null) return ''
  return `${metadata.players_online}/${metadata.players_max} 玩家`
}

const emptyEntry = (offsetDays: number): ServiceMonitorHistoryEntry => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return { status: '', response_time: 0, checked_at: d.toISOString() }
}

const visibleHistory = (monitor: PublicServiceMonitor): ServiceMonitorHistoryEntry[] => {
  const history = monitor.history || []
  const slice =
    history.length > BAR_COUNT ? history.slice(history.length - BAR_COUNT) : [...history]
  if (slice.length >= BAR_COUNT) return slice
  const missing = BAR_COUNT - slice.length
  const pad = Array.from({ length: missing }, (_, i) => emptyEntry(BAR_COUNT - 1 - i))
  return [...pad, ...slice]
}

const selectHistory = (monitorId: number, entry: ServiceMonitorHistoryEntry) => {
  selectedHistory.value = {
    ...selectedHistory.value,
    [monitorId]: historyTip(entry),
  }
}

const groupOperational = (items: PublicServiceMonitor[]) => {
  if (items.some((m) => m.status === 'down')) {
    return {
      label: '异常',
      ...publicStatusTone.warning,
    }
  }
  if (items.some((m) => m.status === 'slow')) {
    return { label: '降级', ...publicStatusTone.warning }
  }
  if (items.every((m) => m.status === 'up')) {
    return { label: '正常', ...publicStatusTone.success }
  }
  return { label: '未知', ...publicStatusTone.neutral }
}

const groups = computed(() => {
  if (props.groupBy === 'none') return [{ key: 'all', name: '服务', items: props.monitors }]
  const map = new Map<string, PublicServiceMonitor[]>()
  for (const m of props.monitors) {
    const key = m.group_name || '其他'
    const list = map.get(key) || []
    list.push(m)
    map.set(key, list)
  }
  return [...map.entries()].map(([name, items]) => ({ key: name, name, items }))
})

watch(
  groups,
  (list) => {
    const keys = new Set(list.map((g) => g.key))
    const next = new Set<string>()
    for (const k of collapsed.value) {
      if (keys.has(k)) next.add(k)
    }
    collapsed.value = next
  },
  { immediate: true },
)

const isCollapsed = (key: string) => collapsed.value.has(key)

const toggleGroup = (key: string) => {
  const next = new Set(collapsed.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsed.value = next
}
</script>

<template>
  <div v-if="monitors.length === 0" class="py-12 text-center text-sm text-[var(--surface-500)]">
    暂无服务
  </div>
  <div v-else class="space-y-4">
    <div
      v-for="group in groups"
      :key="group.key"
      class="overflow-hidden rounded-[1.25rem] bg-zinc-950/[0.035] p-2 dark:bg-white/[0.055]"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-[0.875rem] px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500 sm:px-4"
        :aria-expanded="!isCollapsed(group.key)"
        @click="toggleGroup(group.key)"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <RiArrowDownSLine
            class="size-5 shrink-0 text-[var(--surface-400)] transition-transform duration-200 ease-[var(--ease-public-out)]"
            :class="isCollapsed(group.key) ? '-rotate-90' : undefined"
          />
          <span class="truncate text-base font-semibold tracking-tight text-[var(--surface-900)]">
            {{ group.name }}
          </span>
          <span class="text-sm tabular-nums text-[var(--surface-400)]">
            {{ group.items.length }}
          </span>
        </span>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-sm"
          :class="groupOperational(group.items).pill"
        >
          <span class="size-2 rounded-full" :class="groupOperational(group.items).dot" />
          {{ groupOperational(group.items).label }}
        </span>
      </button>

      <Transition name="public-collapse">
        <div v-show="!isCollapsed(group.key)">
          <div class="public-collapse__inner space-y-1">
            <div
              v-for="monitor in group.items"
              :key="monitor.id"
              class="rounded-[0.875rem] bg-white px-3 py-5 dark:bg-zinc-950/45 sm:px-4"
            >
              <div
                class="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <RiCheckboxCircleFill
                    v-if="monitor.status === 'up'"
                    class="size-5 shrink-0"
                    :style="{ color: statusIconColor(monitor.status) }"
                  />
                  <RiAlertFill
                    v-else-if="monitor.status === 'slow'"
                    class="size-5 shrink-0"
                    :style="{ color: statusIconColor(monitor.status) }"
                  />
                  <RiErrorWarningFill
                    v-else
                    class="size-5 shrink-0"
                    :style="{ color: statusIconColor(monitor.status) }"
                  />
                  <span
                    class="min-w-0 flex-1 break-words text-[0.9375rem] font-medium text-[var(--surface-900)] sm:truncate"
                  >
                    {{ monitor.name }}
                  </span>
                  <span
                    v-if="minecraftPlayers(monitor)"
                    class="shrink-0 text-sm tabular-nums text-[var(--surface-500)]"
                  >
                    {{ minecraftPlayers(monitor) }}
                  </span>
                  <n-tag
                    v-if="certExpiryText(monitor)"
                    size="small"
                    :type="certExpiryTagType(monitor)"
                    :bordered="false"
                    class="shrink-0"
                    :title="
                      monitor.cert_expires_at
                        ? `到期时间 ${new Date(monitor.cert_expires_at).toLocaleString()}`
                        : undefined
                    "
                  >
                    {{ certExpiryText(monitor) }}
                  </n-tag>
                </div>
                <span
                  v-if="showUptime && uptimeText(monitor)"
                  class="self-end shrink-0 text-sm tabular-nums sm:self-auto"
                  :class="uptimeColor(monitor)"
                >
                  {{ uptimeText(monitor) }}
                </span>
              </div>

              <div
                v-if="monitorDetail(monitor) || monitorSubtitle(monitor)"
                class="mb-3 ml-7 min-w-0"
              >
                <p
                  v-if="monitorDetail(monitor)"
                  class="text-sm leading-5 text-[var(--surface-500)]"
                >
                  {{ monitorDetail(monitor) }}
                </p>
                <p
                  v-if="monitorSubtitle(monitor)"
                  class="mt-0.5 line-clamp-2 text-sm leading-5 text-[var(--surface-600)]"
                >
                  {{ monitorSubtitle(monitor) }}
                </p>
              </div>

              <div class="history-range">
                <div class="history-grid h-7 w-full gap-px">
                  <div
                    v-for="(entry, idx) in visibleHistory(monitor)"
                    :key="idx"
                    class="history-cell min-w-0"
                  >
                    <n-tooltip placement="top">
                      <template #trigger>
                        <button
                          type="button"
                          class="h-7 w-full rounded-[2px] transition-opacity duration-150 hover:opacity-70 active:opacity-70 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--surface-900)]"
                          :class="historyColor(entry)"
                          :aria-label="historyTip(entry)"
                          :title="historyTip(entry)"
                          @click="selectHistory(monitor.id, entry)"
                          @focus="selectHistory(monitor.id, entry)"
                        />
                      </template>
                      {{ historyTip(entry) }}
                    </n-tooltip>
                  </div>
                </div>

                <div class="mt-1.5 flex justify-between text-sm text-[var(--surface-500)]">
                  <span class="history-range-label history-range-label--15">15 天前</span>
                  <span class="history-range-label history-range-label--30">30 天前</span>
                  <span class="history-range-label history-range-label--60">60 天前</span>
                  <span class="history-range-label history-range-label--90">90 天前</span>
                  <span>今天</span>
                </div>
              </div>
              <p
                v-if="selectedHistory[monitor.id]"
                class="mt-2 text-sm tabular-nums text-[var(--surface-600)] sm:hidden"
                aria-live="polite"
              >
                {{ selectedHistory[monitor.id] }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.history-range {
  container-type: inline-size;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(15, minmax(0, 1fr));
}

.history-cell {
  display: none;
}

.history-range-label {
  display: none;
}

.history-cell:nth-last-child(-n + 15),
.history-range-label--15 {
  display: block;
}

@container (min-width: 20rem) {
  .history-grid {
    grid-template-columns: repeat(30, minmax(0, 1fr));
  }

  .history-cell:nth-last-child(-n + 30),
  .history-range-label--30 {
    display: block;
  }

  .history-range-label--15 {
    display: none;
  }
}

@container (min-width: 30rem) {
  .history-grid {
    grid-template-columns: repeat(60, minmax(0, 1fr));
  }

  .history-cell:nth-last-child(-n + 60),
  .history-range-label--60 {
    display: block;
  }

  .history-range-label--30 {
    display: none;
  }
}

@container (min-width: 40rem) {
  .history-grid {
    grid-template-columns: repeat(90, minmax(0, 1fr));
  }

  .history-cell,
  .history-range-label--90 {
    display: block;
  }

  .history-range-label--60 {
    display: none;
  }
}
</style>
