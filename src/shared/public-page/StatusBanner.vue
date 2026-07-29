<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import type { PublicIncident } from '@/shared/types/incidents'
import { RiCheckboxCircleFill, RiErrorWarningFill, RiAlertFill } from '@remixicon/vue'

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

type OverallLevel = 'operational' | 'infrastructure' | 'maintenance' | 'degraded' | 'outage'

const level = computed<OverallLevel>(() => {
  const hasOutage =
    props.serviceMonitors.some((m) => m.status === 'down') ||
    props.incidents.some((i) => i.status === 'active' && i.impact === 'outage')
  if (hasOutage) return 'outage'

  const hasDegraded =
    props.serviceMonitors.some((m) => m.status === 'slow') ||
    props.incidents.some((i) => i.status === 'active' && i.impact === 'degraded')
  if (hasDegraded) return 'degraded'

  const hasMaintenance = props.incidents.some(
    (i) => i.status === 'active' && i.impact === 'maintenance',
  )
  if (hasMaintenance) return 'maintenance'

  const hasInfrastructureIssue = props.servers.some(
    (s) => s.status === 'offline' || s.status === 'error' || s.status === 'maintenance',
  )
  if (hasInfrastructureIssue) return 'infrastructure'

  return 'operational'
})

const title = computed(() => {
  if (level.value === 'outage') return '部分服务异常'
  if (level.value === 'degraded') return '部分服务降级'
  if (level.value === 'maintenance') return '计划维护进行中'
  if (level.value === 'infrastructure') return '基础设施异常'
  return '全部服务正常'
})

const summary = computed(() => {
  const downServices = props.serviceMonitors.filter((m) => m.status === 'down').length
  const slowServices = props.serviceMonitors.filter((m) => m.status === 'slow').length
  const activeOutages = props.incidents.filter(
    (i) => i.status === 'active' && i.impact === 'outage',
  ).length
  const activeDegraded = props.incidents.filter(
    (i) => i.status === 'active' && i.impact === 'degraded',
  ).length
  const activeMaintenance = props.incidents.filter(
    (i) => i.status === 'active' && i.impact === 'maintenance',
  ).length
  const unavailableServers = props.servers.filter(
    (s) => s.status === 'offline' || s.status === 'error',
  ).length
  const maintenanceServers = props.servers.filter((s) => s.status === 'maintenance').length

  if (level.value === 'outage') {
    const details = [
      downServices > 0 ? `${downServices} 项服务故障` : '',
      activeOutages > 0 ? `${activeOutages} 起故障事件处理中` : '',
    ].filter(Boolean)
    return details.length > 0 ? `检测到${details.join('，')}` : '检测到服务故障，正在处理中'
  }
  if (level.value === 'degraded') {
    const details = [
      slowServices > 0 ? `${slowServices} 项服务响应缓慢` : '',
      activeDegraded > 0 ? `${activeDegraded} 起降级事件处理中` : '',
    ].filter(Boolean)
    return details.length > 0 ? details.join('，') : '部分服务受到影响'
  }
  if (level.value === 'maintenance') {
    return `${activeMaintenance} 项计划维护正在进行`
  }
  if (level.value === 'infrastructure') {
    const details = [
      unavailableServers > 0 ? `${unavailableServers} 台服务器离线` : '',
      maintenanceServers > 0 ? `${maintenanceServers} 台服务器维护中` : '',
    ].filter(Boolean)
    return `${details.join('，')}，当前服务监控未发现受影响`
  }
  return '所有公开服务与基础设施均运行正常'
})

const tone = computed(() => {
  if (level.value === 'outage') {
    return {
      icon: '#d03050',
      well: 'bg-red-500/5 ring-red-500/10',
      title: 'text-red-700 dark:text-red-300',
    }
  }
  if (level.value === 'degraded' || level.value === 'maintenance') {
    return {
      icon: '#f0a020',
      well: 'bg-amber-500/5 ring-amber-500/10',
      title: 'text-amber-800 dark:text-amber-200',
    }
  }
  if (level.value === 'infrastructure') {
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
  <section class="flex items-start gap-3 rounded-2xl p-4 ring-1 sm:gap-4 sm:p-5" :class="tone.well">
    <RiCheckboxCircleFill
      v-if="level === 'operational'"
      class="mt-0.5 size-8 shrink-0 sm:size-9"
      :style="{ color: tone.icon }"
    />
    <RiAlertFill
      v-else-if="level === 'degraded' || level === 'maintenance' || level === 'infrastructure'"
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
      <p class="mt-1 text-sm leading-6 text-[var(--surface-600)]">
        {{ summary }}
      </p>
      <p v-if="updatedText" class="mt-1 text-sm text-[var(--surface-500)] tabular-nums">
        {{ updatedText }}
      </p>
    </div>
  </section>
</template>
