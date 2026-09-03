<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NDescriptions, NDescriptionsItem, NTag } from 'naive-ui'
import type { Server } from '@/shared/types/manager/servers'
import { getBillingCycle, getExpireCountdown } from '@/shared/utils/billing.ts'
import { getStatusText, getStatusSeverity } from '@/shared/utils/version.ts'
import { formatUptimeSeconds, liveUptimeSeconds } from '@/shared/server-display/uptime'
import { isServerDataStale } from '@/shared/server-display/utils'
import { useUptimeTicker } from '@/shared/composables/useUptimeTicker'

interface Props {
  server: Server
}

const props = defineProps<Props>()

const severityToTagType = (
  severity: string,
): 'success' | 'error' | 'default' | 'warning' | 'info' => {
  const map: Record<string, 'success' | 'error' | 'default' | 'warning' | 'info'> = {
    success: 'success',
    danger: 'error',
    secondary: 'default',
    warn: 'warning',
    info: 'info',
  }
  return map[severity] ?? 'default'
}

const now = useUptimeTicker()

const uptimeText = computed(() => {
  const seconds = liveUptimeSeconds(props.server.uptimeSeconds, props.server.uptimeSyncedAt, now.value)
  if (seconds !== undefined) return formatUptimeSeconds(seconds)
  return props.server.uptime || '-'
})

const dataStale = computed(
  () => props.server.status === 'online' && isServerDataStale(props.server.lastReportTime),
)

/** 到期剩余展示：已过期 或 X天/时/分后到期 */
function expireCountdownLabel(expireTime: string): string {
  const countdown = getExpireCountdown(expireTime)
  return countdown === '已过期' ? '已过期' : `${countdown}后到期`
}
</script>

<template>
  <n-card size="small" :bordered="false">
    <n-descriptions :column="2" label-placement="left">
      <n-descriptions-item label="名称">
        <span class="font-medium">{{ server.name || '-' }}</span>
      </n-descriptions-item>
      <n-descriptions-item label="IP">
        <span class="font-mono text-sm">{{ server.ip || '-' }}</span>
      </n-descriptions-item>
      <n-descriptions-item label="状态">
        <n-space :size="6" align="center">
          <n-tag
            :type="severityToTagType(getStatusSeverity(server.status))"
            size="small"
            :bordered="false"
          >
            {{ getStatusText(server.status) }}
          </n-tag>
          <n-tag v-if="dataStale" size="small" type="warning" :bordered="false" round>
            数据陈旧
          </n-tag>
        </n-space>
      </n-descriptions-item>
      <n-descriptions-item label="地域">
        {{ server.location || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="操作系统">
        {{ server.os || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="系统架构">
        {{ server.architecture || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="运行时间">
        {{ uptimeText }}
      </n-descriptions-item>
      <n-descriptions-item label="内核版本">
        {{ server.kernel || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="主机名">
        {{ server.hostname || '-' }}
      </n-descriptions-item>

      <!-- 付费信息 -->
      <template v-if="server.billing">
        <n-descriptions-item v-if="server.billing?.billing_cycle" label="付费周期">
          {{ getBillingCycle(server.billing.billing_cycle) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="server.billing?.price != null" label="价格">
          ¥{{ server.billing.price.toFixed(2) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="server.billing?.expire_time" label="到期时间">
          {{ new Date(server.billing.expire_time).toLocaleDateString('zh-CN') }}
        </n-descriptions-item>
        <n-descriptions-item v-if="server.billing?.expire_time" label="剩余时间">
          {{ expireCountdownLabel(server.billing.expire_time) }}
        </n-descriptions-item>
      </template>
    </n-descriptions>
  </n-card>
</template>
