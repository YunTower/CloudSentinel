<script setup lang="ts">
import { computed } from 'vue'
import type { ServerItem } from '@/shared/types/server'
import type {
  PublicPageV1,
  PublicPagesConfigV1,
  PublicBlockServerListV1,
  PublicBlockServiceStatusV1,
  PublicBlockVisibilityModeV1,
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
import type { PublicPageViewMode } from '@/shared/public-page/ensureIncidentsSeparated'

interface Props {
  page: PublicPageV1
  pages?: PublicPageV1[]
  view?: PublicPageViewMode
  servers: ServerItem[]
  incidents?: PublicIncident[]
  serviceMonitors?: PublicServiceMonitor[]
  lastUpdatedAt?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  view: 'status',
})


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

const normalizeVisibilityMode = (raw: unknown): PublicBlockVisibilityModeV1 =>
  raw === 'include' || raw === 'exclude' ? raw : 'all'

const asStringList = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => String(x)).filter((x) => x.length > 0)
}

const asPositiveNumberList = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && Number.isInteger(x) && x > 0)
}

/** 服务器区块字段展示默认值：计费/流量属敏感数据，默认不展示 */
const defaultBlockFields = (): PublicDisplayFieldsV1 => ({
  showLocation: true,
  showOS: true,
  showArchitecture: true,
  showCores: true,
  showNetworkIO: true,
  showBilling: false,
  showTraffic: false,
})

const parseBlockFields = (raw: unknown): PublicDisplayFieldsV1 => {
  const obj = asObject(raw)
  const d = defaultBlockFields()
  if (!obj) return d
  return {
    showLocation: obj.showLocation !== false,
    showOS: obj.showOS !== false,
    showArchitecture: obj.showArchitecture !== false,
    showCores: obj.showCores !== false,
    showNetworkIO: obj.showNetworkIO !== false,
    showBilling: obj.showBilling === true,
    showTraffic: obj.showTraffic === true,
  }
}

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
    mode: normalizeVisibilityMode(obj.mode),
    serverIds: asStringList(obj.serverIds),
    groupIds: asPositiveNumberList(obj.groupIds),
    fields: parseBlockFields(obj.fields),
  }
})

const serviceBlock = computed((): PublicBlockServiceStatusV1 | null => {
  const b = props.page.blocks.find((x) => x.type === 'serviceStatus')
  if (!b) return null
  const obj = asObject(b.data) || {}
  return {
    monitorIds: asPositiveNumberList(obj.monitorIds),
    mode: normalizeVisibilityMode(obj.mode),
    groupBy: String(obj.groupBy ?? 'group') === 'none' ? 'none' : 'group',
    limit: typeof obj.limit === 'number' ? obj.limit : 0,
    showUptime: obj.showUptime !== false,
  }
})

const isIncidentsView = computed(() => props.view === 'incidents')

const applyLimit = <T,>(items: T[], limit?: number) => {
  if (!limit || limit <= 0) return items
  return items.slice(0, limit)
}

const filteredMonitors = computed(() => {
  const cfg = serviceBlock.value
  if (!cfg) return props.serviceMonitors || []
  const selected = new Set(cfg.monitorIds || [])
  const all = props.serviceMonitors || []
  const items = all.filter((m) => {
    if (cfg.mode === 'include') return selected.has(m.id)
    if (cfg.mode === 'exclude') return !selected.has(m.id)
    return true
  })
  return applyLimit(items, cfg.limit)
})

const filteredServers = computed(() => {
  const cfg = serverBlock.value
  if (!cfg) return props.servers
  let items = props.servers
  if (cfg.mode !== 'all') {
    const selectedServerIds = new Set(cfg.serverIds || [])
    const selectedGroupIds = new Set(cfg.groupIds || [])
    items = items.filter((s) => {
      const byId = selectedServerIds.has(s.id)
      const byGroup = typeof s.group_id === 'number' && selectedGroupIds.has(s.group_id)
      const matched = byId || byGroup
      return cfg.mode === 'include' ? matched : !matched
    })
  }
  return applyLimit(items, cfg.limit)
})

const showServices = computed(() => !isIncidentsView.value && !!serviceBlock.value)
const showServers = computed(() => !isIncidentsView.value && !!serverBlock.value)
const showBanner = computed(() => showServices.value || showServers.value)
const showMarkdown = computed(() => !isIncidentsView.value)
const showLinks = computed(() => !isIncidentsView.value)
// 事件视图是否渲染由页面级 showIncidents 决定（上游已拦截未开启的访问）
const showIncidents = computed(() => isIncidentsView.value)

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
      v-show="showMarkdown && md.trim()"
      :key="i"
      class="rounded-[1.25rem] bg-zinc-950/[0.035] px-4 py-4 sm:px-5 dark:bg-white/[0.055]"
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
        :display-fields="serverBlock?.fields"
      />
    </section>

    <section v-if="showIncidents">
      <StatusIncidentList :incidents="pageIncidents" />
    </section>

    <footer
      v-if="showLinks && linkBlocks.length"
      class="flex flex-wrap gap-x-4 gap-y-2 pt-2"
    >      <a
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
