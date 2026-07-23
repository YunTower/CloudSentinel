<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import type { PublicIncident } from '@/shared/types/incidents'
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiAlertFill,
} from '@remixicon/vue'

interface Props {
  servers: ServerItem[]
  serviceMonitors?: PublicServiceMonitor[]
  incidents?: PublicIncident[]
  lastUpdatedAt?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  serviceMonitors: () => [],
  incidents: () => [],
  lastUpdatedAt: null,
})

type OverallLevel = 'operational' | 'degraded' | 'outage'

const level = computed<OverallLevel>(() => {
  const hasOutage =
    props.serviceMonitors.some((m) => m.status === 'down') ||
    props.servers.some((s) => s.status === 'offline' || s.status === 'error') ||
    props.incidents.some((i) => i.status === 'active' && i.impact === 'outage')
  if (hasOutage) return 'outage'

  const hasDegraded =
    props.serviceMonitors.some((m) => m.status === 'slow') ||
    props.servers.some((s) => s.status === 'maintenance') ||
    props.incidents.some(
      (i) => i.status === 'active' && (i.impact === 'degraded' || i.impact === 'maintenance'),
    )
  if (hasDegraded) return 'degraded'

  return 'operational'
})

const title = computed(() => {
  if (level.value === 'outage') return '部分服务异常'
  if (level.value === 'degraded') return '部分服务降级'
  return '全部服务正常'
})

const tone = computed(() => {
  if (level.value === 'outage') {
    return {
      icon: '#d03050',
      well: 'bg-red-500/5 ring-red-500/10',
      title: 'text-red-700 dark:text-red-300',
    }
  }
  if (level.value === 'degraded') {
    return {
      icon: '#f0a020',
      well: 'bg-amber-500/5 ring-amber-500/10',
      title: 'text-amber-800 dark:text-amber-200',
    }
  }
  return {
    icon: '#18a058',
    well: 'bg-emerald-500/5 ring-emerald-500/10',
    title: 'text-emerald-800 dark:text-emerald-200',
  }
})

const updatedText = computed(() => {
  if (!props.lastUpdatedAt) return ''
  const d = new Date(props.lastUpdatedAt)
  if (Number.isNaN(d.getTime())) return ''
  return `最近更新于 ${d.toLocaleString()}`
})
</script>

<template>
  <section
    class="flex items-start gap-3 rounded-2xl p-4 ring-1 sm:gap-4 sm:p-5"
    :class="tone.well"
  >
    <RiCheckboxCircleFill
      v-if="level === 'operational'"
      class="mt-0.5 size-8 shrink-0 sm:size-9"
      :style="{ color: tone.icon }"
    />
    <RiAlertFill
      v-else-if="level === 'degraded'"
      class="mt-0.5 size-8 shrink-0 sm:size-9"
      :style="{ color: tone.icon }"
    />
    <RiErrorWarningFill
      v-else
      class="mt-0.5 size-8 shrink-0 sm:size-9"
      :style="{ color: tone.icon }"
    />
    <div class="min-w-0">
      <h1
        class="max-w-[40ch] text-balance text-2xl font-semibold tracking-tight sm:text-3xl"
        :class="tone.title"
      >
        {{ title }}
      </h1>
      <p v-if="updatedText" class="mt-1 text-sm text-[var(--surface-500)] tabular-nums">
        {{ updatedText }}
      </p>
    </div>
  </section>
</template>
