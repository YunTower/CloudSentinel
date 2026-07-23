<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PublicServiceMonitor, ServiceMonitorHistoryEntry } from '@/shared/types/service-monitor'
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiAlertFill,
  RiArrowDownSLine,
} from '@remixicon/vue'

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

const statusLabel = (status: string) => {
  if (status === 'up') return '正常'
  if (status === 'slow') return '缓慢'
  if (status === 'down') return '故障'
  return '无数据'
}

const statusIconColor = (status: string) => {
  if (status === 'up') return '#18a058'
  if (status === 'slow') return '#f0a020'
  if (status === 'down') return '#d03050'
  return '#a1a1aa'
}

const historyColor = (entry: ServiceMonitorHistoryEntry | null | undefined) => {
  if (!entry || !entry.status) return 'bg-zinc-950/12 dark:bg-white/12'
  if (entry.status === 'up') return 'bg-emerald-500'
  if (entry.status === 'slow') return 'bg-amber-400'
  if (entry.status === 'down') return 'bg-red-500'
  return 'bg-zinc-950/12 dark:bg-white/12'
}

const historyTip = (entry: ServiceMonitorHistoryEntry | null | undefined) => {
  if (!entry || !entry.checked_at) return '暂无数据'
  const t = new Date(entry.checked_at)
  const day = Number.isNaN(t.getTime())
    ? entry.checked_at
    : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (!entry.status) return `${day} · 暂无数据`
  const rt = entry.response_time > 0 ? ` · ${entry.response_time}ms` : ''
  return `${day} · ${statusLabel(entry.status)}${rt}`
}

const uptimeText = (monitor: PublicServiceMonitor) => {
  const stat = monitor.uptime?.['30d'] || monitor.uptime?.['24h']
  if (!stat || stat.total_checks === 0) return null
  const rate =
    stat.uptime_rate >= 99.995
      ? '100'
      : stat.uptime_rate.toFixed(stat.uptime_rate >= 99.9 ? 3 : 2)
  return `${rate}% uptime`
}

const uptimeColor = (monitor: PublicServiceMonitor) => {
  if (monitor.status === 'down') return 'text-red-600 dark:text-red-400'
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

const emptyEntry = (offsetDays: number): ServiceMonitorHistoryEntry => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return { status: '', response_time: 0, checked_at: d.toISOString() }
}

const visibleHistory = (monitor: PublicServiceMonitor) => {
  const history = monitor.history || []
  const slice = history.length > BAR_COUNT ? history.slice(history.length - BAR_COUNT) : [...history]
  if (slice.length >= BAR_COUNT) return slice
  const missing = BAR_COUNT - slice.length
  const pad = Array.from({ length: missing }, (_, i) => emptyEntry(BAR_COUNT - 1 - i))
  return [...pad, ...slice]
}

const groupOperational = (items: PublicServiceMonitor[]) => {
  if (items.some((m) => m.status === 'down')) {
    return { label: '异常', dot: 'bg-red-500', pill: 'text-red-700 bg-red-500/10' }
  }
  if (items.some((m) => m.status === 'slow')) {
    return { label: '降级', dot: 'bg-amber-400', pill: 'text-amber-800 bg-amber-500/10' }
  }
  if (items.every((m) => m.status === 'up')) {
    return { label: '正常', dot: 'bg-emerald-500', pill: 'text-emerald-700 bg-emerald-500/10' }
  }
  return { label: '未知', dot: 'bg-zinc-400', pill: 'text-zinc-600 bg-zinc-950/5' }
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
      class="overflow-hidden rounded-2xl bg-[var(--surface-0)] ring-1 ring-zinc-950/10 dark:ring-white/10"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        :class="
          isCollapsed(group.key)
            ? undefined
            : 'border-b border-zinc-950/5 dark:border-white/10'
        "
        :aria-expanded="!isCollapsed(group.key)"
        @click="toggleGroup(group.key)"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <RiArrowDownSLine
            class="size-5 shrink-0 text-[var(--surface-400)] transition-transform"
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

      <div v-show="!isCollapsed(group.key)" class="px-4 sm:px-5">
        <div
          v-for="monitor in group.items"
          :key="monitor.id"
          class="border-b border-zinc-950/5 py-5 last:border-b-0 dark:border-white/10"
        >
          <div class="mb-2.5 flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
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
              <span class="truncate text-[0.9375rem] font-medium text-[var(--surface-900)]">
                {{ monitor.name }}
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
              class="shrink-0 text-sm tabular-nums"
              :class="uptimeColor(monitor)"
            >
              {{ uptimeText(monitor) }}
            </span>
          </div>

          <div
            class="grid h-7 w-full gap-px"
            :style="{ gridTemplateColumns: `repeat(${BAR_COUNT}, minmax(0, 1fr))` }"
          >
            <div
              v-for="(entry, idx) in visibleHistory(monitor)"
              :key="idx"
              class="min-w-0"
            >
              <n-tooltip placement="top">
                <template #trigger>
                  <div
                    class="h-7 w-full rounded-[1px] hover:opacity-70"
                    :class="historyColor(entry)"
                  />
                </template>
                {{ historyTip(entry) }}
              </n-tooltip>
            </div>
          </div>

          <div class="mt-1.5 flex justify-between text-sm text-[var(--surface-500)]">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
