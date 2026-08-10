<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'
import { formatOS, formatSpeed, getStatusText } from '@/shared/server-display/utils'
import OsTypeIcon from '@/shared/server-display/OsTypeIcon.vue'
import { getProgressBarColor, getProgressTextColor } from '@/shared/utils/version'
import { getBillingCycle, getBillingType, getTrafficLimitSummary } from '@/shared/utils/billing'
import { RiArrowDownSLine, RiArrowUpLine, RiArrowDownLine } from '@remixicon/vue'
import { publicStatusTone } from '@/shared/public-page/statusTone'

interface Props {
  servers: ServerItem[]
  groupBy?: 'none' | 'status' | 'location' | 'os'
  displayFields?: PublicDisplayFieldsV1
}

const props = withDefaults(defineProps<Props>(), {
  groupBy: 'none',
})

const collapsed = ref<Set<string>>(new Set())
const expandedIds = ref<Set<string>>(new Set())

const showLocation = computed(() => props.displayFields?.showLocation ?? true)
const showOS = computed(() => props.displayFields?.showOS ?? true)
const showArchitecture = computed(() => props.displayFields?.showArchitecture ?? true)
const showCores = computed(() => props.displayFields?.showCores ?? true)
const showNetworkIO = computed(() => props.displayFields?.showNetworkIO ?? true)
const showBilling = computed(() => props.displayFields?.showBilling ?? true)
const showTraffic = computed(() => props.displayFields?.showTraffic ?? true)

const groups = computed(() => {
  if (props.groupBy === 'none') {
    return [{ key: 'all', name: '服务器', items: props.servers }]
  }
  const map = new Map<string, ServerItem[]>()
  for (const s of props.servers) {
    let key = '其他'
    if (props.groupBy === 'status') key = getStatusText(s.status)
    if (props.groupBy === 'location') key = s.location || '未知地域'
    if (props.groupBy === 'os') {
      key = s.systemName || s.os?.split(' ')[0] || '未知系统'
    }
    const list = map.get(key) || []
    list.push(s)
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

    const validIds = new Set(props.servers.map((s) => s.id))
    const nextExpanded = new Set<string>()
    for (const id of expandedIds.value) {
      if (validIds.has(id)) nextExpanded.add(id)
    }
    expandedIds.value = nextExpanded
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

const isExpanded = (id: string) => expandedIds.value.has(id)

const toggleExpanded = (id: string) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const groupPill = (items: ServerItem[]) => {
  if (items.some((s) => s.status === 'offline' || s.status === 'error')) {
    return {
      label: '异常',
      ...publicStatusTone.warning,
    }
  }
  if (items.some((s) => s.status === 'maintenance')) {
    return { label: '维护', ...publicStatusTone.warning }
  }
  if (items.every((s) => s.status === 'online')) {
    return { label: '正常', ...publicStatusTone.success }
  }
  return { label: '未知', ...publicStatusTone.neutral }
}

const usageText = (value: number, online: boolean) => {
  if (!online) return '—'
  return `${Math.round(value)}%`
}

const normalizeUsage = (value: number) => Math.min(Math.max(value, 0), 100)

const metricRows = (server: ServerItem) => [
  { key: 'cpu', label: 'CPU', value: server.cpuUsage },
  { key: 'mem', label: '内存', value: server.memoryUsage },
  { key: 'disk', label: '磁盘', value: server.diskUsage },
]

const locationText = (server: ServerItem) => {
  if (!showLocation.value || !server.location) return ''
  return server.location
}

const uptimeText = (server: ServerItem) => {
  if (!server.uptime) return ''
  return `运行 ${server.uptime}`
}

const statusPill = (status: ServerItem['status']) => {
  if (status === 'online') {
    return {
      label: '在线',
      ...publicStatusTone.success,
    }
  }
  if (status === 'maintenance') {
    return {
      label: '维护',
      ...publicStatusTone.warning,
    }
  }
  if (status === 'error') {
    return {
      label: '错误',
      ...publicStatusTone.warning,
    }
  }
  if (status === 'offline') {
    return {
      label: '离线',
      ...publicStatusTone.warning,
    }
  }
  return {
    label: getStatusText(status),
    ...publicStatusTone.neutral,
  }
}

/** CPU 详情：仅型号（公开页不展示核心数） */
const cpuDetailText = (server: ServerItem) => {
  if (!showCores.value) return ''
  if (!server.cpuName || server.cpuName === 'Unknown CPU') return ''
  return server.cpuName
}

/** 内存详情：百分比 · Swap */
const memoryDetailText = (server: ServerItem) => {
  const online = server.status === 'online'
  const parts = [usageText(server.memoryUsage, online)]
  if (server.swapUsage !== undefined && server.swapUsage > 0) {
    parts.push(`Swap ${usageText(server.swapUsage, online)}`)
  }
  return parts.join(' · ')
}

/** 系统详情：发行版/系统名 · OS · 架构 */
const osDetailText = (server: ServerItem) => {
  const parts: string[] = []
  if (showOS.value && server.systemName) parts.push(server.systemName)
  if (showOS.value && server.os) {
    const osLabel = formatOS(server.os)
    if (osLabel && osLabel.toLowerCase() !== (server.systemName || '').toLowerCase()) {
      parts.push(osLabel)
    }
  }
  if (showArchitecture.value && server.architecture) parts.push(server.architecture)
  return parts.join(' · ')
}

const billingTagText = (server: ServerItem) => {
  if (!showBilling.value || !server.billing?.show_billing_cycle) return ''
  if (typeof server.billing.price !== 'number') return ''
  return `¥ ${server.billing.price.toFixed(2)}/${getBillingCycle(server.billing.billing_cycle ?? '')}`
}

const trafficTagText = (server: ServerItem) => {
  if (!showTraffic.value || !showBilling.value) return ''
  if (!(server.network?.show_traffic_limit || server.network?.show_traffic_reset_cycle)) return ''
  const summary = getTrafficLimitSummary(
    server.billing?.traffic_limit_bytes,
    server.billing?.traffic_reset_cycle,
    server.billing?.traffic_custom_cycle_days,
    server.billing?.traffic_limit_type,
  )
  return summary === '-' ? '' : summary
}

const expireText = (server: ServerItem) => {
  if (!showBilling.value || !server.billing?.expire_time) return ''
  const remaining = new Date(server.billing.expire_time).getTime() - Date.now()
  if (!Number.isFinite(remaining) || remaining <= 0) return '已过期'
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  if (days >= 1) return `剩 ${days} 天`
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  if (hours >= 1) return `剩 ${hours} 小时`
  return '即将到期'
}

/** 折叠区：CPU 型号 / 内存 / 系统 / 网络 / 计费 */
const hasDetail = (server: ServerItem) => {
  if (cpuDetailText(server) || memoryDetailText(server)) return true
  if (osDetailText(server)) return true
  if (showNetworkIO.value) return true
  if (billingTagText(server) || trafficTagText(server) || expireText(server)) return true
  return false
}
</script>

<template>
  <div v-if="servers.length === 0" class="py-12 text-center text-sm text-[var(--surface-500)]">
    暂无服务器
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
          :class="groupPill(group.items).pill"
        >
          <span class="size-2 rounded-full" :class="groupPill(group.items).dot" />
          {{ groupPill(group.items).label }}
        </span>
      </button>

      <Transition name="public-collapse">
        <div v-show="!isCollapsed(group.key)">
          <div class="public-collapse__inner space-y-1">
            <div
              v-for="server in group.items"
              :key="server.id"
              class="rounded-[0.875rem] bg-white px-3 py-4 dark:bg-zinc-950/45 sm:px-4"
            >
              <button
                type="button"
                class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-5"
                :class="hasDetail(server) ? 'cursor-pointer' : 'cursor-default'"
                :aria-expanded="hasDetail(server) ? isExpanded(server.id) : undefined"
                :tabindex="hasDetail(server) ? 0 : -1"
                @click="hasDetail(server) && toggleExpanded(server.id)"
              >
                <!-- 身份：icon 顶对齐跨两行；名称第一行；地域/运行时间第二行靠左 -->
                <div class="min-w-0 flex flex-col items-start gap-x-2.5 gap-y-0.5">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <p class="min-w-0 truncate font-medium text-[var(--surface-900)]">
                      {{ server.name }}
                    </p>
                    <RiArrowDownSLine
                      v-if="hasDetail(server)"
                      class="size-4 shrink-0 text-[var(--surface-400)] transition-transform duration-200 ease-[var(--ease-public-out)]"
                      :class="isExpanded(server.id) ? undefined : '-rotate-90'"
                    />
                  </div>
                  <p
                    v-if="locationText(server) || uptimeText(server)"
                    class="min-w-0 truncate text-sm text-[var(--surface-500)]"
                  >
                    <template v-if="locationText(server) && uptimeText(server)">
                      {{ locationText(server) }} · {{ uptimeText(server) }}
                    </template>
                    <template v-else>
                      {{ locationText(server) || uptimeText(server) }}
                    </template>
                  </p>
                </div>

                <div
                  class="justify-self-end sm:col-start-3 sm:row-start-1 sm:pl-2"
                >
                  <div
                    class="inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-sm"
                    :class="statusPill(server.status).pill"
                  >
                    <span
                      class="size-2 shrink-0 rounded-full"
                      :class="statusPill(server.status).dot"
                    />
                    <span>{{ statusPill(server.status).label }}</span>
                  </div>
                </div>

                <!-- 短进度条：小屏独占第二行均分宽度；桌面紧凑夹在中间 -->
                <div
                  class="col-span-2 grid w-full min-w-0 grid-cols-3 gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex sm:w-auto sm:items-center sm:gap-3.5"
                  :aria-label="`CPU ${usageText(server.cpuUsage, server.status === 'online')}，内存 ${usageText(server.memoryUsage, server.status === 'online')}，磁盘 ${usageText(server.diskUsage, server.status === 'online')}`"
                >
                  <div
                    v-for="metric in metricRows(server)"
                    :key="metric.key"
                    class="min-w-0 [--metric-color:transparent] [--metric-width:0%] sm:w-14 sm:shrink-0"
                    :style="{
                      '--metric-width':
                        server.status === 'online' ? `${normalizeUsage(metric.value)}%` : '0%',
                      '--metric-color':
                        server.status === 'online'
                          ? getProgressBarColor(metric.value)
                          : 'transparent',
                    }"
                  >
                    <div class="flex items-baseline justify-between gap-1">
                      <p class="truncate text-[0.7875rem] text-[var(--surface-400)]">
                        {{ metric.label }}
                      </p>
                      <p
                        class="shrink-0 text-[0.7875rem] tabular-nums"
                        :class="
                          server.status === 'online'
                            ? getProgressTextColor(metric.value)
                            : 'text-[var(--surface-400)]'
                        "
                      >
                        {{ usageText(metric.value, server.status === 'online') }}
                      </p>
                    </div>
                    <div
                      class="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/10"
                      role="progressbar"
                      :aria-valuenow="server.status === 'online' ? Math.round(metric.value) : 0"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      :aria-label="`${metric.label} 占用`"
                    >
                      <div
                        class="h-full w-(--metric-width) rounded-full bg-(--metric-color) transition-[width] duration-200 ease-[var(--ease-public-out)]"
                      />
                    </div>
                  </div>
                </div>
              </button>

              <!-- 非必要：折叠详情 -->
              <Transition name="public-collapse">
                <div v-show="hasDetail(server) && isExpanded(server.id)">
                  <div
                    class="public-collapse__inner mt-3 space-y-2 rounded-xl bg-zinc-950/[0.025] px-3 py-3 text-sm dark:bg-white/[0.04]"
                  >
                    <div
                      v-if="cpuDetailText(server)"
                      class="flex items-start justify-between gap-3"
                    >
                      <p class="shrink-0 text-[var(--surface-500)]">CPU</p>
                      <p class="min-w-0 text-right text-[var(--surface-800)]">
                        {{ cpuDetailText(server) }}
                      </p>
                    </div>

                    <div v-if="osDetailText(server)" class="flex items-start justify-between gap-3">
                      <p class="shrink-0 text-[var(--surface-500)]">系统</p>
                      <div class="min-w-0 flex gap-1.5">
                        <OsTypeIcon
                          class="mt-0.5 self-start"
                          :class="
                            locationText(server) || uptimeText(server) ? 'row-span-2' : undefined
                          "
                          :system-name="server.systemName"
                          :os="server.os"
                        />
                        <p class="min-w-0 text-right text-[var(--surface-800)]">
                          {{ osDetailText(server) }}
                        </p>
                      </div>
                    </div>

                    <div v-if="showNetworkIO" class="flex items-center justify-between gap-3">
                      <p class="shrink-0 text-[var(--surface-500)]">网络</p>
                      <div
                        class="flex items-center gap-3 font-medium tabular-nums text-[var(--surface-800)]"
                      >
                        <span class="inline-flex items-center gap-0.5">
                          <RiArrowUpLine class="size-3.5 text-emerald-500" />
                          {{
                            server.status === 'online' ? formatSpeed(server.networkIO.upload) : '—'
                          }}
                        </span>
                        <span class="inline-flex items-center gap-0.5">
                          <RiArrowDownLine class="size-3.5 text-blue-500" />
                          {{
                            server.status === 'online'
                              ? formatSpeed(server.networkIO.download)
                              : '—'
                          }}
                        </span>
                      </div>
                    </div>

                    <div
                      v-if="billingTagText(server) || trafficTagText(server) || expireText(server)"
                      class="flex items-center justify-between gap-3"
                    >
                      <p class="shrink-0 text-[var(--surface-500)]">计费</p>
                      <div class="flex flex-wrap items-center justify-end gap-1.5">
                        <n-tag
                          v-if="billingTagText(server)"
                          size="small"
                          :type="getBillingType(server.billing?.billing_cycle ?? '')"
                          :bordered="false"
                          round
                        >
                          {{ billingTagText(server) }}
                        </n-tag>
                        <n-tag
                          v-if="trafficTagText(server)"
                          size="small"
                          type="info"
                          :bordered="false"
                          round
                        >
                          {{ trafficTagText(server) }}
                        </n-tag>
                        <n-tag
                          v-if="expireText(server)"
                          size="small"
                          :type="expireText(server) === '已过期' ? 'error' : 'warning'"
                          :bordered="false"
                          round
                        >
                          {{ expireText(server) }}
                        </n-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
