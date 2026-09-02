<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import type { PublicIncident } from '@/shared/types/incidents'
import { RiCheckboxCircleFill, RiSubtractLine, RiAlertFill } from '@remixicon/vue'

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
  if (level.value !== 'operational') return '我们的服务出现了一些问题'
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

const affectedServices = computed(() =>
  props.serviceMonitors.filter((monitor) => monitor.status === 'down' || monitor.status === 'slow'),
)

const affectedServers = computed(() =>
  props.servers.filter(
    (server) =>
      server.status === 'offline' || server.status === 'error' || server.status === 'maintenance',
  ),
)

const affectedItems = computed(() => [
  ...affectedServices.value.map((service) => ({
    key: `service-${service.id}`,
    name: service.name,
  })),
  ...affectedServers.value.map((server) => ({ key: `server-${server.id}`, name: server.name })),
])

const activeIncidents = computed(() =>
  props.incidents.filter((incident) => incident.status === 'active'),
)

const latestIncidentMessage = (incident: PublicIncident) => {
  const events = incident.events || []
  return events.length > 0 ? events[events.length - 1].message : ''
}

const incidentMeta = (incident: PublicIncident) => {
  const startedAt = new Date(incident.started_at)
  if (Number.isNaN(startedAt.getTime())) return '处理中'
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / 60000))
  if (elapsedMinutes < 60) return `处理中 · 已持续 ${elapsedMinutes} 分钟`
  const hours = Math.floor(elapsedMinutes / 60)
  const minutes = elapsedMinutes % 60
  return `处理中 · 已持续 ${hours} 小时${minutes > 0 ? ` ${minutes} 分钟` : ''}`
}

const updatedText = computed(() => {
  if (!props.lastUpdatedAt) return ''
  const d = new Date(props.lastUpdatedAt)
  if (Number.isNaN(d.getTime())) return ''
  return `最近更新于 ${d.toLocaleString()}`
})
</script>

<template>
  <section
    v-if="level === 'operational'"
    class="flex items-start gap-3 rounded-[1.25rem] bg-emerald-500/[0.075] p-4 sm:gap-4 sm:p-5 dark:bg-emerald-400/[0.12]"
  >
    <RiCheckboxCircleFill class="mt-0.5 size-8 shrink-0 sm:size-9" style="color: #18a058" />
    <div class="min-w-0">
      <h1
        class="max-w-[40ch] text-balance text-2xl font-semibold tracking-tight text-emerald-800 sm:text-3xl dark:text-emerald-200"
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

  <section
    v-else
    class="overflow-hidden rounded-[1.25rem] bg-amber-100/85 dark:bg-amber-400/[0.12]"
  >
    <header class="flex items-start gap-3 px-4 py-4 sm:px-5 sm:py-5">
      <span
        class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"
        aria-hidden="true"
      >
        <RiSubtractLine class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <h1
          class="text-lg font-semibold leading-7 tracking-tight text-amber-950 dark:text-amber-50 sm:text-xl"
        >
          {{ title }}
        </h1>
        <p class="mt-0.5 text-sm leading-5 text-amber-900/65 dark:text-amber-100/65">
          {{ summary }}
        </p>
      </div>
      <p
        v-if="updatedText"
        class="hidden shrink-0 pt-1 text-xs tabular-nums text-amber-900/50 sm:block dark:text-amber-100/50"
      >
        {{ updatedText }}
      </p>
    </header>

    <div class="px-2 pb-2 sm:px-2.5 sm:pb-2.5">
      <div
        class="overflow-hidden rounded-2xl bg-white/90 p-1 dark:bg-zinc-950/65"
      >
        <div v-if="affectedItems.length" class="px-3.5 py-3.5 sm:px-4">
          <p class="text-xs font-medium tracking-wide text-[var(--surface-500)]">受影响服务</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="item in affectedItems"
              :key="item.key"
              class="rounded-md bg-amber-100 px-2 py-1 text-sm font-medium leading-5 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100"
            >
              {{ item.name }}
            </span>
          </div>
        </div>

        <div
          v-if="activeIncidents.length"
          class="space-y-1"
        >
          <article
            v-for="incident in activeIncidents"
            :key="incident.id"
            class="flex items-start gap-3 rounded-[0.875rem] bg-zinc-950/[0.025] px-3.5 py-4 dark:bg-white/[0.045] sm:px-4 sm:py-5"
          >
            <span
              class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"
              aria-hidden="true"
            >
              <RiAlertFill class="size-3.5" />
            </span>
            <div class="min-w-0 flex-1">
              <h2
                class="text-base font-semibold leading-6 tracking-tight text-[var(--surface-900)]"
              >
                {{ incident.title }}
              </h2>
              <p
                v-if="latestIncidentMessage(incident)"
                class="mt-1 text-sm leading-6 text-[var(--surface-600)]"
              >
                {{ latestIncidentMessage(incident) }}
              </p>
              <p class="mt-2 text-xs tabular-nums text-[var(--surface-400)]">
                {{ incidentMeta(incident) }}
              </p>
            </div>
          </article>
        </div>

        <div
          v-else
          class="rounded-[0.875rem] bg-zinc-950/[0.025] px-3.5 py-3 text-sm text-[var(--surface-500)] dark:bg-white/[0.045] sm:px-4"
        >
          系统已检测到受影响服务，正在等待事件详情。
        </div>
      </div>
    </div>
  </section>
</template>
