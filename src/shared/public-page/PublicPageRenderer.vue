<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type {
  PublicPageV1,
  PublicBlockServerListV1,
  PublicBlockServiceStatusV1,
} from '@/shared/types/settings/public-pages'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'
import type { PublicIncident } from '@/shared/types/incidents'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import { renderMarkdownSafe } from '@/shared/utils/safeMarkdown'
import { isSafeLinkHref } from '@/shared/utils/safeLink'
import StatusBanner from '@/shared/public-page/StatusBanner.vue'
import StatusMonitorRows from '@/shared/public-page/StatusMonitorRows.vue'
import StatusServerRows from '@/shared/public-page/StatusServerRows.vue'
import StatusIncidentList from '@/shared/public-page/StatusIncidentList.vue'

interface Props {
  page: PublicPageV1
  pages?: PublicPageV1[]
  servers: ServerItem[]
  displayFields?: PublicDisplayFieldsV1
  incidents?: PublicIncident[]
  serviceMonitors?: PublicServiceMonitor[]
  lastUpdatedAt?: string | null
}

const props = defineProps<Props>()

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const markdownBlocks = computed(() =>
  props.page.blocks
    .filter((b) => b.type === 'markdown')
    .map((b) => String(asObject(b.data)?.markdown ?? '')),
)

const linkBlocks = computed(() => {
  const links: Array<{ label: string; href: string }> = []
  for (const b of props.page.blocks) {
    if (b.type !== 'links') continue
    const raw = asObject(b.data)?.links
    if (!Array.isArray(raw)) continue
    for (const item of raw) {
      const o = asObject(item)
      if (!o) continue
      const label = String(o.label ?? '')
      const href = String(o.href ?? '')
      if (label && href) links.push({ label, href })
    }
  }
  return links
})

const serverBlock = computed((): PublicBlockServerListV1 | null => {
  const b = props.page.blocks.find((x) => x.type === 'serverList')
  if (!b) return null
  const obj = asObject(b.data) || {}
  const groupByRaw = String(obj.groupBy ?? 'none')
  const groupBy: PublicBlockServerListV1['groupBy'] =
    groupByRaw === 'status' || groupByRaw === 'location' || groupByRaw === 'os'
      ? groupByRaw
      : 'none'
  const limit = typeof obj.limit === 'number' ? obj.limit : 0
  return {
    view: obj.view === 'card' ? 'card' : 'table',
    groupBy,
    limit,
    showToolbar: obj.showToolbar !== false,
  }
})

const serviceBlock = computed((): PublicBlockServiceStatusV1 | null => {
  const b = props.page.blocks.find((x) => x.type === 'serviceStatus')
  if (!b) return null
  const obj = asObject(b.data) || {}
  const monitorIdsRaw = Array.isArray(obj.monitorIds) ? (obj.monitorIds as unknown[]) : []
  return {
    monitorIds: monitorIdsRaw
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0),
    groupBy: String(obj.groupBy ?? 'group') === 'none' ? 'none' : 'group',
    limit: typeof obj.limit === 'number' ? obj.limit : 0,
    showUptime: obj.showUptime !== false,
  }
})

const showIncidents = computed(() => props.page.blocks.some((b) => b.type === 'incidents'))

const applyLimit = <T,>(items: T[], limit?: number) => {
  if (!limit || limit <= 0) return items
  return items.slice(0, limit)
}

const filteredMonitors = computed(() => {
  const cfg = serviceBlock.value
  if (!cfg) return props.serviceMonitors || []
  const selected = new Set((cfg.monitorIds || []).filter((id) => id > 0))
  const items = [...(props.serviceMonitors || [])].filter((m) =>
    selected.size === 0 ? true : selected.has(m.id),
  )
  return applyLimit(items, cfg.limit)
})

const filteredServers = computed(() => {
  const cfg = serverBlock.value
  if (!cfg) return props.servers
  return applyLimit(props.servers, cfg.limit)
})

const showServices = computed(() => !!serviceBlock.value)
const showServers = computed(() => !!serverBlock.value)
const showBanner = computed(() => showServices.value || showServers.value)

/** 后端已按页面配置过滤，前端直接展示 */
const pageIncidents = computed(() => props.incidents || [])
</script>

<template>
  <div class="space-y-8">
    <StatusBanner
      v-if="showBanner"
      :servers="filteredServers"
      :service-monitors="filteredMonitors"
      :incidents="pageIncidents"
      :last-updated-at="lastUpdatedAt"
    />

    <div v-else-if="showIncidents">
      <h1 class="text-balance text-2xl font-semibold tracking-tight text-[var(--surface-900)] sm:text-3xl">
        事件
      </h1>
      <p class="mt-1 text-sm text-[var(--surface-500)]">近期故障、降级与维护记录</p>
    </div>

    <div
      v-for="(md, i) in markdownBlocks"
      :key="i"
      v-show="md.trim()"
      class="rounded-2xl bg-zinc-950/[0.03] px-4 py-4 ring-1 ring-zinc-950/5 sm:px-5 dark:bg-white/5 dark:ring-white/10"
    >
      <div
        class="prose prose-sm dark:prose-invert max-w-none prose-p:text-pretty prose-headings:font-semibold prose-headings:tracking-tight"
        v-html="renderMarkdownSafe(md)"
      />
    </div>

    <StatusMonitorRows
      v-if="showServices"
      :monitors="filteredMonitors"
      :show-uptime="serviceBlock?.showUptime !== false"
      :group-by="serviceBlock?.groupBy || 'group'"
    />

    <section v-if="showServers">
      <StatusServerRows
        :servers="filteredServers"
        :group-by="serverBlock?.groupBy || 'none'"
      />
    </section>

    <section v-if="showIncidents">
      <StatusIncidentList :incidents="pageIncidents" />
    </section>

    <footer v-if="linkBlocks.length" class="flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-950/5 pt-6 dark:border-white/10">
      <a
        v-for="(l, i) in linkBlocks"
        :key="i"
        class="text-sm text-[var(--surface-500)] hover:text-[var(--surface-800)]"
        :href="isSafeLinkHref(l.href) ? l.href : undefined"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {{ l.label }}
      </a>
    </footer>
  </div>
</template>
