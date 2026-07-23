<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import { getStatusText } from '@/shared/server-display/utils'
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiAlertFill,
  RiTimeLine,
  RiArrowDownSLine,
} from '@remixicon/vue'

interface Props {
  servers: ServerItem[]
  groupBy?: 'none' | 'status' | 'location' | 'os'
}

const props = withDefaults(defineProps<Props>(), {
  groupBy: 'none',
})

const collapsed = ref<Set<string>>(new Set())

const statusColor = (status: ServerItem['status']) => {
  if (status === 'online') return '#18a058'
  if (status === 'maintenance') return '#f0a020'
  if (status === 'error' || status === 'offline') return '#d03050'
  return '#a1a1aa'
}

const statusTextClass = (status: ServerItem['status']) => {
  if (status === 'online') return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'maintenance') return 'text-amber-600 dark:text-amber-400'
  if (status === 'error' || status === 'offline') return 'text-red-600 dark:text-red-400'
  return 'text-[var(--surface-500)]'
}

const groups = computed(() => {
  if (props.groupBy === 'none') {
    return [{ key: 'all', name: '服务器', items: props.servers }]
  }
  const map = new Map<string, ServerItem[]>()
  for (const s of props.servers) {
    let key = '其他'
    if (props.groupBy === 'status') key = getStatusText(s.status)
    if (props.groupBy === 'location') key = s.location || '未知地域'
    if (props.groupBy === 'os') key = s.os?.split(' ')[0] || '未知系统'
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

const groupPill = (items: ServerItem[]) => {
  if (items.some((s) => s.status === 'offline' || s.status === 'error')) {
    return { label: '异常', dot: 'bg-red-500', pill: 'text-red-700 bg-red-500/10' }
  }
  if (items.some((s) => s.status === 'maintenance')) {
    return { label: '维护', dot: 'bg-amber-400', pill: 'text-amber-800 bg-amber-500/10' }
  }
  if (items.every((s) => s.status === 'online')) {
    return { label: '正常', dot: 'bg-emerald-500', pill: 'text-emerald-700 bg-emerald-500/10' }
  }
  return { label: '未知', dot: 'bg-zinc-400', pill: 'text-zinc-600 bg-zinc-950/5' }
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
      class="overflow-hidden rounded-2xl bg-[var(--surface-0)] ring-1 ring-zinc-950/10 dark:ring-white/10"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        :class="
          isCollapsed(group.key)
            ? undefined
            : 'border-b border-zinc-950/5 dark:border-white/10'
        "
        :aria-expanded="!isCollapsed(group.key)"
        @click="toggleGroup(group.key)"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <RiArrowDownSLine
            class="size-5 shrink-0 text-[var(--surface-400)] transition-transform"
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

      <div v-show="!isCollapsed(group.key)" class="px-4 sm:px-5">
        <div
          v-for="server in group.items"
          :key="server.id"
          class="flex items-center justify-between gap-3 border-b border-zinc-950/5 py-4 last:border-b-0 dark:border-white/10"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <RiCheckboxCircleFill
              v-if="server.status === 'online'"
              class="size-5 shrink-0"
              :style="{ color: statusColor(server.status) }"
            />
            <RiTimeLine
              v-else-if="server.status === 'maintenance'"
              class="size-5 shrink-0"
              :style="{ color: statusColor(server.status) }"
            />
            <RiAlertFill
              v-else-if="server.status === 'error'"
              class="size-5 shrink-0"
              :style="{ color: statusColor(server.status) }"
            />
            <RiErrorWarningFill
              v-else
              class="size-5 shrink-0"
              :style="{ color: statusColor(server.status) }"
            />
            <div class="min-w-0">
              <div class="truncate font-medium text-[var(--surface-900)]">{{ server.name }}</div>
              <div
                v-if="server.location || server.uptime"
                class="mt-0.5 truncate text-sm text-[var(--surface-500)]"
              >
                <template v-if="server.location">{{ server.location }}</template>
                <template v-if="server.location && server.uptime"> · </template>
                <template v-if="server.uptime">运行 {{ server.uptime }}</template>
              </div>
            </div>
          </div>
          <span class="shrink-0 text-sm font-medium" :class="statusTextClass(server.status)">
            {{ getStatusText(server.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
