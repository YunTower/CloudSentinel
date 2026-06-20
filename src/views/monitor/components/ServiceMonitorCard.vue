<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RiDeleteBinLine, RiEditLine, RiPulseLine } from '@remixicon/vue'
import { type ServiceMonitor, type ServiceMonitorHistoryEntry } from '@/apis/service-monitors'

const props = defineProps<{ monitor: ServiceMonitor }>()
const emit = defineEmits<{
  edit: [monitor: ServiceMonitor]
  remove: [monitor: ServiceMonitor]
  viewResults: [monitor: ServiceMonitor]
}>()

const statusLabel = (s: string) =>
  s === 'up' ? '正常' : s === 'down' ? '故障' : s === 'slow' ? '超时' : '未知'

const statusTag = (s: string) =>
  s === 'up' ? 'success' : s === 'down' ? 'error' : s === 'slow' ? 'warning' : 'default'

const blockColorClass = (entry: ServiceMonitorHistoryEntry | null) => {
  if (!entry) return 'bg-slate-200 dark:bg-zinc-700'
  if (entry.status === 'up') return 'bg-emerald-500'
  if (entry.status === 'slow') return 'bg-yellow-400'
  return 'bg-red-500'
}

const blockTooltip = (entry: ServiceMonitorHistoryEntry | null) => {
  if (!entry) return '暂无数据'
  const time = new Date(entry.checked_at).toLocaleTimeString()
  const label = entry.status === 'up' ? '正常' : entry.status === 'slow' ? '超时' : '故障'
  return `${label} · ${entry.response_time}ms · ${time}`
}

const uptimeLabel = (key: '24h' | '7d' | '30d') => {
  const stat = props.monitor.uptime?.[key]
  if (!stat || stat.total_checks === 0) return '-'
  return `${stat.uptime_rate.toFixed(stat.uptime_rate >= 99.99 ? 3 : 2)}%`
}

const uptimeTooltip = (key: '24h' | '7d' | '30d') => {
  const stat = props.monitor.uptime?.[key]
  if (!stat || stat.total_checks === 0) return '暂无检测数据'
  return `正常 ${stat.up_checks} / 慢 ${stat.slow_checks} / 故障 ${stat.down_checks} · 平均 ${stat.avg_response_time}ms`
}

const paddedHistory = (count: number): (ServiceMonitorHistoryEntry | null)[] => {
  const hist = (props.monitor.history || []).slice(-count)
  const slots: (ServiceMonitorHistoryEntry | null)[] = Array(count).fill(null)
  const start = Math.max(0, count - hist.length)
  for (let i = 0; i < hist.length; i++) slots[start + i] = hist[i]
  return slots
}

const blockCount = ref(24)
const containerRef = ref<HTMLElement | null>(null)
let _observer: ResizeObserver | null = null

onMounted(() => {
  if (!containerRef.value) return
  _observer = new ResizeObserver(([entry]) => {
    blockCount.value = Math.max(1, Math.min(60, Math.floor((entry.contentRect.width + 2) / 10)))
  })
  _observer.observe(containerRef.value)
})

onUnmounted(() => {
  _observer?.disconnect()
  _observer = null
})
</script>

<template>
  <n-card size="small">
    <div ref="containerRef">
      <div class="flex justify-between">
        <div class="flex items-center gap-2 mb-1 min-w-0">
          <n-tag :type="statusTag(monitor.status)" size="small">
            {{ statusLabel(monitor.status) }}
          </n-tag>
          <span class="font-medium truncate">{{ monitor.name }}</span>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <n-button size="tiny" quaternary @click="emit('viewResults', monitor)">
            <template #icon><ri-pulse-line /></template>
          </n-button>
          <n-button size="tiny" quaternary @click="emit('edit', monitor)">
            <template #icon><ri-edit-line /></template>
          </n-button>
          <n-popconfirm @positive-click="emit('remove', monitor)">
            <template #trigger>
              <n-button size="tiny" quaternary type="error">
                <template #icon><ri-delete-bin-line /></template>
              </n-button>
            </template>
            确认删除此监测项？
          </n-popconfirm>
        </div>
      </div>

      <div class="text-sm text-muted-color truncate">
        <n-tag size="tiny" class="mr-1">{{ monitor.type.toUpperCase() }}</n-tag>
        <n-tag v-if="monitor.group_name" size="tiny" class="mr-1" :bordered="false">
          {{ monitor.group_name }}
        </n-tag>
        {{ monitor.target }}{{ monitor.port ? ':' + monitor.port : '' }}
      </div>

      <div class="text-xs text-muted-color mt-1 flex gap-3">
        <span>响应: {{ monitor.response_time }}ms</span>
        <span>间隔: {{ monitor.interval }}s</span>
        <span v-if="monitor.last_check_at">
          最近: {{ new Date(monitor.last_check_at).toLocaleTimeString() }}
        </span>
      </div>

      <div class="flex gap-0.5 mt-2" title="检测历史">
        <n-tooltip v-for="(entry, idx) in paddedHistory(blockCount)" :key="idx" placement="top">
          <template #trigger>
            <div
              class="h-5 w-2 flex-shrink-0 cursor-default transition-opacity hover:opacity-75"
              :class="blockColorClass(entry)"
            />
          </template>
          {{ blockTooltip(entry) }}
        </n-tooltip>
      </div>

      <div class="grid grid-cols-3 gap-2 mt-3">
        <n-tooltip v-for="key in (['24h', '7d', '30d'] as const)" :key="key" placement="top">
          <template #trigger>
            <div class="rounded border border-[var(--n-border-color)] px-2 py-1">
              <div class="text-[11px] leading-4 text-muted-color">{{ key }}</div>
              <div class="text-sm font-semibold text-color">{{ uptimeLabel(key) }}</div>
            </div>
          </template>
          {{ uptimeTooltip(key) }}
        </n-tooltip>
      </div>
    </div>
  </n-card>
</template>
