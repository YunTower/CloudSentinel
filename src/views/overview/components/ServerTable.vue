<script setup lang="ts">
import { h } from 'vue'
import type { ServerItem } from '@/types/server'
import { formatSpeed, formatOS, getStatusColor } from '../utils'
import { getProgressBarColor, getProgressTextColor } from '@/utils/version.ts'

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
      return h('div', { class: 'flex flex-row items-center gap-2' }, [
        h('div', {
          class: getStatusColor(row.status) + ' w-2 h-2 rounded-full shadow-sm animate-pulse-slow',
        }),
        h('span', { class: 'font-medium text-color' }, row.name),
      ])
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
    sorter: (a: ServerItem, b: ServerItem) => (formatOS(a.os) || '').localeCompare(formatOS(b.os) || ''),
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
      return h('div', { class: 'flex flex-row gap-2 w-full items-center' }, [
        h('span', { class: 'text-sm font-semibold ' + getProgressTextColor(row.cpuUsage) }, row.cpuUsage + '%'),
        h('div', { class: 'flex-1' }, [
          h('n-progress', {
            type: 'line',
            percentage: row.cpuUsage,
            showIndicator: false,
            height: 8,
            color: getProgressBarColor(row.cpuUsage),
            style: 'transition: all 0.5s',
          }),
        ]),
      ])
    },
  },
  {
    key: 'memoryUsage',
    title: '内存',
    sorter: (a: ServerItem, b: ServerItem) => a.memoryUsage - b.memoryUsage,
    render(row: ServerItem) {
      return h('div', { class: 'flex flex-row gap-2 w-full items-center' }, [
        h('span', { class: 'text-sm font-semibold ' + getProgressTextColor(row.memoryUsage) }, row.memoryUsage + '%'),
        h('div', { class: 'flex-1' }, [
          h('n-progress', {
            type: 'line',
            percentage: row.memoryUsage,
            showIndicator: false,
            height: 8,
            color: getProgressBarColor(row.memoryUsage),
            style: 'transition: all 0.5s',
          }),
        ]),
      ])
    },
  },
  {
    key: 'diskUsage',
    title: '磁盘',
    sorter: (a: ServerItem, b: ServerItem) => a.diskUsage - b.diskUsage,
    render(row: ServerItem) {
      return h('div', { class: 'flex flex-row gap-2 w-full items-center' }, [
        h('span', { class: 'text-sm font-semibold ' + getProgressTextColor(row.diskUsage) }, row.diskUsage + '%'),
        h('div', { class: 'flex-1' }, [
          h('n-progress', {
            type: 'line',
            percentage: row.diskUsage,
            showIndicator: false,
            height: 8,
            color: getProgressBarColor(row.diskUsage),
            style: 'transition: all 0.5s',
          }),
        ]),
      ])
    },
  },
  {
    key: 'networkIO',
    title: '网络',
    width: 150,
    render(row: ServerItem) {
      return h('div', { class: 'flex flex-row text-xs gap-2' }, [
        h('div', { class: 'flex items-center gap-1' }, [
          h('i', { class: 'ri-arrow-up-line text-sm text-green-600 dark:text-green-400' }),
          h('span', { class: 'text-muted-color' }, formatSpeed(row.networkIO.upload)),
        ]),
        h('div', { class: 'flex items-center gap-1' }, [
          h('i', { class: 'ri-arrow-down-line text-sm text-blue-600 dark:text-blue-400' }),
          h('span', { class: 'text-muted-color' }, formatSpeed(row.networkIO.download)),
        ]),
      ])
    },
  },
]
</script>

<template>
  <n-data-table
    :columns="columns"
    :data="props.servers"
    :bordered="true"
    :striped="true"
  />
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
