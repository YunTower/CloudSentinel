<script setup lang="ts">
import { computed } from 'vue'
import type { PublicIncident, PublicIncidentEvent } from '@/shared/types/incidents'
import { publicStatusTone } from '@/shared/public-page/statusTone'

interface Props {
  incidents: PublicIncident[]
  /** 事件总数（服务端分页时的总数；缺省取当前列表长度） */
  total?: number
  /** 当前页码（从 1 开始） */
  page?: number
  /** 每页条数 */
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  total: undefined,
  page: 1,
  pageSize: 10,
})

const emit = defineEmits<{ 'update:page': [page: number] }>()

const totalCount = computed(() => props.total ?? props.incidents.length)
const showPagination = computed(() => totalCount.value > props.pageSize)

const onPageChange = (page: number) => emit('update:page', page)

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
  if (incident.status === 'resolved') return publicStatusTone.success.pill
  if (incident.impact === 'outage') return publicStatusTone.danger.pill
  if (incident.impact === 'maintenance') return publicStatusTone.info.pill
  return publicStatusTone.warning.pill
}

const neutralPillClass = publicStatusTone.neutral.pill

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
  // 服务完全不通 / 中断事件：红色
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
      class="rounded-[1.25rem] bg-zinc-950/[0.035] p-4 sm:p-5 dark:bg-white/[0.055]"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h3 class="text-base font-semibold tracking-tight text-[var(--surface-900)]">
          {{ incident.title }}
        </h3>
        <div class="flex flex-wrap gap-2">
          <span class="inline-flex rounded-full px-2.5 py-1 text-sm" :class="pillClass(incident)">
            {{ statusLabel(incident.status) }}
          </span>
          <span class="inline-flex rounded-full px-2.5 py-1 text-sm" :class="neutralPillClass">
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

    <div v-if="showPagination" class="flex justify-center pt-2">
      <n-pagination
        :page="props.page"
        :page-size="props.pageSize"
        :item-count="totalCount"
        @update:page="onPageChange"
      />
    </div>
  </div>
</template>
