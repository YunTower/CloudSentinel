<script setup lang="ts">
import { h } from 'vue'
import type { ServerItem } from '@/types/server'
import { formatSpeed, formatOS, getStatusColor } from '../utils'
import { getProgressBarColor } from '@/utils/version.ts'
import { RiArrowDownLine, RiArrowUpLine } from '@remixicon/vue'
import { NProgress } from 'naive-ui'

interface Props {
  servers: ServerItem[]
}

const props = defineProps<Props>()

const columns = [
  {
    key: 'name',
    title: '服务器',
    sorter: (a: ServerItem, b: ServerItem) => a.name.localeCompare(b.name),
    minWidth: 150,
    render(row: ServerItem) {
      return h('span', { class: getStatusColor(row.status) }, row.name)
    },
  },
  {
    key: 'location',
    title: '地域',
    sorter: (a: ServerItem, b: ServerItem) => (a.location || '').localeCompare(b.location || ''),
    width: 120,
    render(row: ServerItem) {
      return h('div', { class: 'flex items-center gap-1' }, [
        h('i', { class: 'ri-map-pin-line text-xs text-muted-color' }),
        h('span', { class: 'text-muted-color' }, row.location || '-'),
      ])
    },
  },
  {
    key: 'os',
    title: '系统',
    sorter: (a: ServerItem, b: ServerItem) =>
      (formatOS(a.os) || '').localeCompare(formatOS(b.os) || ''),
    width: 120,
    render(row: ServerItem) {
      return h('span', { class: 'text-color' }, formatOS(row.os) || '-')
    },
  },
  {
    key: 'cpuUsage',
    title: 'CPU',
    sorter: (a: ServerItem, b: ServerItem) => a.cpuUsage - b.cpuUsage,
    render(row: ServerItem) {
      return h(NProgress, {
        type: 'line',
        percentage: row.cpuUsage,
        color: getProgressBarColor(row.cpuUsage),
        indicatorTextColor: '#fff',
        indicatorPlacement: 'inside',
      })
    },
  },
  {
    key: 'memoryUsage',
    title: '内存',
    sorter: (a: ServerItem, b: ServerItem) => a.memoryUsage - b.memoryUsage,
    render(row: ServerItem) {
      return h(NProgress, {
        type: 'line',
        percentage: row.memoryUsage,
        color: getProgressBarColor(row.memoryUsage),
        indicatorTextColor: '#fff',
        indicatorPlacement: 'inside',
      })
    },
  },
  {
    key: 'diskUsage',
    title: '磁盘',
    sorter: (a: ServerItem, b: ServerItem) => a.diskUsage - b.diskUsage,
    render(row: ServerItem) {
      return h(NProgress, {
        type: 'line',
        percentage: row.diskUsage,
        color: getProgressBarColor(row.diskUsage),
        indicatorTextColor: '#fff',
        indicatorPlacement: 'inside',
      })
    },
  },
  {
    key: 'networkIO',
    title: '网络',
    render(row: ServerItem) {
      return h('div', { class: 'flex flex-row  gap-2' }, [
        h('div', { class: 'flex items-center gap-1' }, [
          h(RiArrowUpLine, { className: ' text-green-600 dark:text-green-400', size: '14px' }),
          h('span', {}, formatSpeed(row.networkIO.upload)),
        ]),
        h('div', { class: 'flex items-center gap-1' }, [
          h(RiArrowDownLine, { className: 'text-blue-600 dark:text-blue-400', size: '14px' }),
          h('span', {}, formatSpeed(row.networkIO.download)),
        ]),
      ])
    },
  },
]
</script>

<template>
  <n-data-table :columns="columns" :data="props.servers" :bordered="true" :striped="true" />
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
</style>
