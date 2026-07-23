<script setup lang="ts">
import type { PublicIncident, PublicIncidentEvent } from '@/shared/types/incidents'

interface Props {
  incidents: PublicIncident[]
}

defineProps<Props>()

const formatTime = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const statusLabel = (status: string) => {
  if (status === 'active') return '进行中'
  if (status === 'resolved') return '已恢复'
  return status || '未知'
}

const impactLabel = (impact: string) => {
  if (impact === 'outage') return '服务中断'
  if (impact === 'degraded') return '性能下降'
  if (impact === 'maintenance') return '维护'
  return impact || '未知'
}

const pillClass = (incident: PublicIncident) => {
  if (incident.status === 'resolved') return 'bg-emerald-500/10 text-emerald-700'
  if (incident.impact === 'maintenance') return 'bg-zinc-950/5 text-zinc-600'
  if (incident.impact === 'degraded') return 'bg-amber-500/10 text-amber-800'
  return 'bg-red-500/10 text-red-700'
}

const eventTypeLabel = (event: PublicIncidentEvent) => {
  if (event.event_type === 'opened') return '发生'
  if (event.event_type === 'resolved') return '恢复'
  if (event.event_type === 'update') return '更新'
  return event.event_type
}

const eventType = (event: PublicIncidentEvent) => {
  if (event.event_type === 'resolved' || event.status === 'up' || event.status === 'online')
    return 'success' as const
  if (event.status === 'maintenance') return 'info' as const
  if (event.status === 'slow' || event.status === 'degraded') return 'warning' as const
  if (event.status === 'down' || event.status === 'outage') return 'error' as const
  return 'default' as const
}

/** 事件时间轴：从晚到早 */
const sortedEvents = (events?: PublicIncidentEvent[]) =>
  [...(events || [])].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )
</script>

<template>
  <div v-if="incidents.length === 0" class="py-12 text-center text-sm text-[var(--surface-500)]">
    暂无事件
  </div>
  <div v-else class="space-y-3">
    <article
      v-for="incident in incidents"
      :key="incident.id"
      class="rounded-2xl bg-[var(--surface-0)] p-4 ring-1 ring-zinc-950/10 sm:p-5 dark:ring-white/10"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h3 class="text-base font-semibold tracking-tight text-[var(--surface-900)]">
          {{ incident.title }}
        </h3>
        <div class="flex flex-wrap gap-2">
          <span
            class="inline-flex rounded-full px-2.5 py-1 text-sm"
            :class="pillClass(incident)"
          >
            {{ statusLabel(incident.status) }}
          </span>
          <span class="inline-flex rounded-full bg-zinc-950/5 px-2.5 py-1 text-sm text-[var(--surface-600)]">
            {{ impactLabel(incident.impact) }}
          </span>
        </div>
      </div>
      <p class="mt-2 text-sm tabular-nums text-[var(--surface-500)]">
        {{ formatTime(incident.started_at) }}
      </p>
      <n-timeline v-if="incident.events?.length" size="medium" class="mt-4">
        <n-timeline-item
          v-for="event in sortedEvents(incident.events)"
          :key="event.id"
          :type="eventType(event)"
          :title="eventTypeLabel(event)"
          :content="event.message"
          :time="formatTime(event.occurred_at)"
        />
      </n-timeline>
    </article>
  </div>
</template>
