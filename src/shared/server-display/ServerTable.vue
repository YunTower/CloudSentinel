<script setup lang="ts">
import { computed, h } from 'vue'
import type { DataTableColumn } from 'naive-ui'
import type { ServerItem } from '@/shared/types/server'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'
import { formatSpeed, formatOS, getStatusColor } from '@/shared/server-display/utils'
import { getBillingCycle, getBillingType, getExpireCountdown } from '@/shared/utils/billing'
import { getProgressBarColor, getProgressTextColor } from '@/shared/utils/version.ts'
import { RiArrowDownLine, RiArrowUpLine, RiMapPinLine } from '@remixicon/vue'
import { NProgress, NSpace, NTag } from 'naive-ui'

interface Props {
  servers: ServerItem[]
  displayFields?: PublicDisplayFieldsV1
}

const props = defineProps<Props>()

const showOS = computed(() => props.displayFields?.showOS ?? true)
const showLocation = computed(() => props.displayFields?.showLocation ?? true)
const showNetworkIO = computed(() => props.displayFields?.showNetworkIO ?? true)
const showBilling = computed(() => props.displayFields?.showBilling ?? true)

const normalizeUsage = (value: number) => Math.min(Math.max(value, 0), 100)

const expireTag = (expireTime: string) => {
  const countdown = getExpireCountdown(expireTime)
  if (countdown === '已过期') {
    return { text: '已过期', type: 'error' as const }
  }
  return { text: `${countdown}后到期`, type: 'info' as const }
}

const renderUsage = (value: number) =>
  h('div', { class: 'flex min-w-[88px] flex-col gap-1 py-1' }, [
    h(
      'span',
      {
        class: `text-right text-xs font-semibold tabular-nums ${getProgressTextColor(value)}`,
      },
      `${Math.round(value)}%`,
    ),
    h(NProgress, {
      type: 'line',
      percentage: normalizeUsage(value),
      color: getProgressBarColor(value),
      showIndicator: false,
      height: 8,
      railColor: 'rgba(148, 163, 184, 0.18)',
    }),
  ])

const columns = computed(() => {
  const cols: DataTableColumn<ServerItem>[] = [
    {
      key: 'name',
      title: '服务器',
      sorter: (a: ServerItem, b: ServerItem) => a.name.localeCompare(b.name),
      minWidth: 180,
      render(row: ServerItem) {
        const children = [h('span', { class: getStatusColor(row.status) }, row.name)]
        if (showBilling.value && row.billing?.show_billing_cycle) {
          const billingChildren = [
            h(NTag, { round: true, size: 'small' }, { default: () => `￥${row.billing?.price}` }),
            h(
              NTag,
              {
                round: true,
                size: 'small',
                type: getBillingType(row.billing?.billing_cycle || ''),
              },
              { default: () => getBillingCycle(row.billing?.billing_cycle || '') },
            ),
          ]
          if (row.billing?.expire_time) {
            const tag = expireTag(row.billing.expire_time)
            billingChildren.push(
              h(
                NTag,
                { round: true, size: 'small', type: tag.type },
                { default: () => tag.text },
              ),
            )
          }
          children.push(
            h(NSpace, { size: 4, class: 'ml-2' }, { default: () => billingChildren }),
          )
        }
        return h('div', { class: 'flex flex-wrap items-center gap-y-1' }, children)
      },
    },
  ]

  if (showLocation.value) {
    cols.push({
      key: 'location',
      title: '地域',
      sorter: (a: ServerItem, b: ServerItem) => (a.location || '').localeCompare(b.location || ''),
      width: 120,
      render(row: ServerItem) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h(RiMapPinLine, { size: 14, class: 'shrink-0 text-muted-color' }),
          h('span', { class: 'text-muted-color' }, row.location || '-'),
        ])
      },
    })
  }

  if (showOS.value) {
    cols.push({
      key: 'os',
      title: '系统',
      sorter: (a: ServerItem, b: ServerItem) =>
        (formatOS(a.os) || '').localeCompare(formatOS(b.os) || ''),
      width: 120,
      render(row: ServerItem) {
        return h('span', { class: 'text-color' }, formatOS(row.os) || '-')
      },
    })
  }

  cols.push(
    {
      key: 'cpuUsage',
      title: 'CPU',
      minWidth: 100,
      sorter: (a: ServerItem, b: ServerItem) => a.cpuUsage - b.cpuUsage,
      render(row: ServerItem) {
        return renderUsage(row.cpuUsage)
      },
    },
    {
      key: 'memoryUsage',
      title: '内存',
      minWidth: 100,
      sorter: (a: ServerItem, b: ServerItem) => a.memoryUsage - b.memoryUsage,
      render(row: ServerItem) {
        return renderUsage(row.memoryUsage)
      },
    },
    {
      key: 'diskUsage',
      title: '磁盘',
      minWidth: 100,
      sorter: (a: ServerItem, b: ServerItem) => a.diskUsage - b.diskUsage,
      render(row: ServerItem) {
        return renderUsage(row.diskUsage)
      },
    },
  )

  if (showNetworkIO.value) {
    cols.push({
      key: 'networkIO',
      title: '网络',
      minWidth: 140,
      render(row: ServerItem) {
        return h('div', { class: 'flex flex-row gap-2' }, [
          h('div', { class: 'flex items-center gap-1' }, [
            h(RiArrowUpLine, { class: 'text-green-600 dark:text-green-400', size: 14 }),
            h('span', {}, formatSpeed(row.networkIO.upload)),
          ]),
          h('div', { class: 'flex items-center gap-1' }, [
            h(RiArrowDownLine, { class: 'text-blue-600 dark:text-blue-400', size: 14 }),
            h('span', {}, formatSpeed(row.networkIO.download)),
          ]),
        ])
      },
    })
  }

  return cols
})
</script>

<template>
  <n-data-table
    class="public-server-table w-full"
    :columns="columns"
    :data="props.servers"
    :bordered="false"
    :single-line="true"
    size="small"
  />
</template>

<style scoped>
.public-server-table :deep(th) {
  white-space: nowrap;
  font-weight: 500;
}
</style>
