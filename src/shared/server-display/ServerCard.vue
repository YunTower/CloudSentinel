<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'
import { getProgressBarColor, getProgressTextColor } from '@/shared/utils/version.ts'
import { getBillingCycle, getBillingType, getTrafficLimitSummary } from '@/shared/utils/billing'
import { formatSpeed, formatOS, getStatusColor, getStatusText as getStatusTextUtil } from '@/shared/server-display/utils'
import { RiArrowDownLine, RiArrowUpLine } from '@remixicon/vue'

const props = defineProps<ServerItem & { displayFields?: PublicDisplayFieldsV1 }>()

const statusClass = computed(() => getStatusColor(props.status))

const statusText = computed(() => getStatusTextUtil(props.status))

const showOS = computed(() => props.displayFields?.showOS ?? true)
const showArchitecture = computed(() => props.displayFields?.showArchitecture ?? true)
const showCores = computed(() => props.displayFields?.showCores ?? true)
const showNetworkIO = computed(() => props.displayFields?.showNetworkIO ?? true)
const showBilling = computed(() => props.displayFields?.showBilling ?? true)
const showTraffic = computed(() => props.displayFields?.showTraffic ?? true)
const showLocation = computed(() => props.displayFields?.showLocation ?? true)

const showSystemInfo = computed(() => showOS.value || showArchitecture.value || showCores.value)

const billingTagText = computed(() => {
  if (!showBilling.value || !props.billing?.show_billing_cycle) return ''
  if (typeof props.billing.price !== 'number') return ''
  return `¥ ${props.billing.price.toFixed(2)}/${getBillingCycle(props.billing.billing_cycle ?? '')}`
})

const billingTagType = computed(() => getBillingType(props.billing?.billing_cycle ?? ''))

const trafficTagText = computed(() => {
  if (!showTraffic.value) return ''
  if (!(props.network?.show_traffic_limit || props.network?.show_traffic_reset_cycle)) return ''

  const summary = getTrafficLimitSummary(
    props.billing?.traffic_limit_bytes,
    props.billing?.traffic_reset_cycle,
    props.billing?.traffic_custom_cycle_days,
    props.billing?.traffic_limit_type,
  )

  return summary === '-' ? '' : `${summary}`
})

const expireTag = computed(() => {
  if (!showBilling.value || !props.billing?.expire_time) return null

  const remaining = new Date(props.billing.expire_time).getTime() - Date.now()
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return { text: '已过期', type: 'error' as const }
  }

  const dayMs = 24 * 60 * 60 * 1000
  const hourMs = 60 * 60 * 1000
  const minuteMs = 60 * 1000
  const days = Math.floor(remaining / dayMs)

  if (days >= 1) {
    return {
      text: `剩${days}天`,
      type: days <= 3 ? ('warning' as const) : ('info' as const),
    }
  }

  const hours = Math.floor(remaining / hourMs)
  if (hours >= 1) {
    return {
      text: `剩${hours}小时`,
      type: hours <= 12 ? ('warning' as const) : ('info' as const),
    }
  }

  const minutes = Math.max(1, Math.floor(remaining / minuteMs))
  return {
    text: `剩${minutes}分`,
    type: 'warning' as const,
  }
})

const usageText = (value: number) => `${Math.round(value)}%`

const normalizeUsage = (value: number) => Math.min(Math.max(value, 0), 100)

const formatRuntime = (uptime?: string) => {
  if (!uptime) return '-'

  const value = uptime.trim()
  if (!value) return '-'

  const extract = (pattern: RegExp) => Number(pattern.exec(value)?.[1] ?? 0)
  const days = extract(/(\d+)\s*(?:天|d|day|days)/i)
  const hours = extract(/(\d+)\s*(?:小时|时|h|hour|hours)/i)
  const minutes = extract(/(\d+)\s*(?:分钟|分|m|min|mins|minute|minutes)/i)
  const seconds = extract(/(\d+)\s*(?:秒|s|sec|secs|second|seconds)/i)

  if (days || hours || minutes || seconds) {
    return `${days}天${hours}时${minutes}分${seconds}秒`
  }

  const timeParts = value.match(/^(\d+):(\d+)(?::(\d+))?$/)
  if (timeParts) {
    const parsedHours = Number(timeParts[1] ?? 0)
    const parsedMinutes = Number(timeParts[2] ?? 0)
    const parsedSeconds = Number(timeParts[3] ?? 0)
    return `0天${parsedHours}时${parsedMinutes}分${parsedSeconds}秒`
  }

  return value
}

const runtimeText = computed(() => formatRuntime(props.uptime))
</script>
<template>
  <n-card class="h-full w-full max-w-full sm:max-w-[400px]">
    <template #header>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-3">
          <div class="text-lg font-bold truncate text-color-emphasis flex-1 leading-tight">
            {{ props.name }}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <div
              :class="statusClass"
              class="w-2.5 h-2.5 rounded-full shadow-sm bg-current shrink-0 block"
            ></div>
            <span class="text-sm font-semibold text-color-emphasis leading-none">{{
              statusText
            }}</span>
          </div>
        </div>
        <n-space :size="4" v-if="billingTagText || expireTag || trafficTagText">
          <n-tag v-if="billingTagText" size="small" :type="billingTagType" round>
            {{ billingTagText }}
          </n-tag>
          <n-tag v-if="expireTag" size="small" :type="expireTag.type" round>
            {{ expireTag.text }}
          </n-tag>
          <n-tag v-if="trafficTagText" size="small" type="info" round>
            {{ trafficTagText }}
          </n-tag>
        </n-space>
      </div>
    </template>

    <div class="flex flex-col gap-3 text-md text-color mt-1">
      <div class="flex justify-between items-center gap-3" v-if="showSystemInfo">
        <span class="text-color shrink-0">OS</span>
        <div
          class="flex items-center gap-1.5 flex-wrap justify-end min-w-0"
          :title="`${props.os} ${props.architecture}`"
        >
          <span class="font-medium truncate max-w-full" v-if="showOS">
            {{ formatOS(props.os) || '-' }}
          </span>
          <span v-if="showArchitecture" size="small" round>{{ props.architecture || '-' }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-color shrink-0">CPU</span>
          <span class="tabular-nums font-semibold" :class="getProgressTextColor(props.cpuUsage)">
            {{ usageText(props.cpuUsage) }}
          </span>
        </div>
        <n-progress
          type="line"
          :show-indicator="false"
          :height="8"
          rail-color="rgba(148, 163, 184, 0.18)"
          :percentage="normalizeUsage(props.cpuUsage)"
          :color="getProgressBarColor(props.cpuUsage)"
          processing
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-color shrink-0">内存</span>
          <span class="tabular-nums font-semibold" :class="getProgressTextColor(props.memoryUsage)">
            {{ usageText(props.memoryUsage) }}
          </span>
        </div>
        <n-progress
          type="line"
          :show-indicator="false"
          :height="8"
          rail-color="rgba(148, 163, 184, 0.18)"
          :percentage="normalizeUsage(props.memoryUsage)"
          :color="getProgressBarColor(props.memoryUsage)"
          processing
        />
      </div>

      <div class="flex flex-col gap-1.5" v-if="props.swapUsage !== undefined">
        <div class="flex items-center justify-between">
          <span class="text-color shrink-0">Swap</span>
          <span class="tabular-nums font-semibold" :class="getProgressTextColor(props.swapUsage)">
            {{ usageText(props.swapUsage) }}
          </span>
        </div>
        <n-progress
          type="line"
          :show-indicator="false"
          :height="8"
          rail-color="rgba(148, 163, 184, 0.18)"
          :percentage="normalizeUsage(props.swapUsage)"
          :color="getProgressBarColor(props.swapUsage)"
          processing
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-3">
          <span class="text-color shrink-0">磁盘</span>
          <div class="flex items-center gap-3 min-w-0">
            <span v-if="props.totalStorage" class="text-xs text-muted-color tabular-nums">{{
              props.totalStorage
            }}</span>
            <span class="tabular-nums font-semibold" :class="getProgressTextColor(props.diskUsage)">
              {{ usageText(props.diskUsage) }}
            </span>
          </div>
        </div>
        <n-progress
          type="line"
          :show-indicator="false"
          :height="8"
          rail-color="rgba(148, 163, 184, 0.18)"
          :percentage="normalizeUsage(props.diskUsage)"
          :color="getProgressBarColor(props.diskUsage)"
        />
      </div>

      <div class="flex justify-between items-center" v-if="showNetworkIO">
        <span class="text-color shrink-0">网络</span>
        <div class="flex items-center gap-3 font-medium tabular-nums text-xs">
          <span class="flex items-center gap-1"
            ><ri-arrow-up-line size="14px" class="text-emerald-500" />{{
              formatSpeed(props.networkIO.upload)
            }}</span
          >
          <span class="flex items-center gap-1"
            ><ri-arrow-down-line size="14px" class="text-blue-500" />{{
              formatSpeed(props.networkIO.download)
            }}</span
          >
        </div>
      </div>

      <div class="flex justify-between items-center gap-3" v-if="showLocation && props.location">
        <span class="text-color shrink-0">位置</span>
        <span class="truncate text-right" :title="props.location">{{ props.location }}</span>
      </div>

      <div class="flex justify-between items-center gap-3">
        <span class="text-color shrink-0">运行时间</span>
        <span class="tabular-nums text-right">{{ runtimeText }}</span>
      </div>
    </div>
  </n-card>
</template>
<style scoped>
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}

:deep(.n-card-header) {
  padding: 16px 18px 0 18px !important;
}

:deep(.n-card__content) {
  padding: 14px 18px 16px 18px !important;
}
</style>
