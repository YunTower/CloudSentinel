<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { usePublicSettings } from '@/public/stores/public-settings'
import { publicApi } from '@/public/apis/public'
import type { ServerItem } from '@/shared/types/server'
import type { GetServersResponse } from '@/shared/types/manager/servers'
import type { PublicIncident } from '@/shared/types/incidents'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import { mapServerListItemToServerItem } from '@/shared/server-display/utils'
import type { PublicPagesConfigV1, PublicPageV1 } from '@/shared/types/settings/public-pages'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'
import PublicPageShell from '@/shared/public-page/PublicPageShell.vue'
import PublicPageRenderer from '@/shared/public-page/PublicPageRenderer.vue'
import {
  defaultPublicPagesConfig,
  ensureIncidentsSeparated,
} from '@/shared/public-page/ensureIncidentsSeparated'

/** 公开页刷新间隔默认 30s，允许范围 5–3600 */
const DEFAULT_REFRESH_INTERVAL_SEC = 30
const MIN_REFRESH_INTERVAL_SEC = 5
const MAX_REFRESH_INTERVAL_SEC = 3600

const route = useRoute()
const message = useMessage()
const publicSettings = usePublicSettings()

const loading = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)

const servers = ref<ServerItem[]>([])
const incidents = ref<PublicIncident[]>([])
const serviceMonitors = ref<PublicServiceMonitor[]>([])
const lastUpdatedAt = ref<string | null>(null)

const publicPages = computed<PublicPagesConfigV1>(() => {
  const s = publicSettings.settings.value
  const raw = (s?.public_pages as PublicPagesConfigV1 | undefined) || defaultPublicPagesConfig()
  return ensureIncidentsSeparated(raw)
})

const refreshIntervalSec = computed(() => {
  const raw = publicPages.value.refreshIntervalSeconds ?? DEFAULT_REFRESH_INTERVAL_SEC
  const n = Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_REFRESH_INTERVAL_SEC
  return Math.min(MAX_REFRESH_INTERVAL_SEC, Math.max(MIN_REFRESH_INTERVAL_SEC, n || DEFAULT_REFRESH_INTERVAL_SEC))
})

const refreshIntervalMs = computed(() => refreshIntervalSec.value * 1000)

const currentPage = computed<PublicPageV1 | null>(() => {
  const cfg = publicPages.value
  if (!cfg?.pages?.length) return null
  return cfg.pages.find((p) => p.path === route.path) || null
})

/** 根据当前页区块决定需要哪些接口 */
const pageNeeds = computed(() => {
  const blocks = currentPage.value?.blocks || []
  return {
    servers: blocks.some((b) => b.type === 'serverList'),
    monitors: blocks.some((b) => b.type === 'serviceStatus'),
    incidents: blocks.some((b) => b.type === 'incidents'),
  }
})

const pageDescription = computed(() => {
  const page = currentPage.value
  if (!page) return 'CloudSentinel 公开状态页'
  for (const block of page.blocks || []) {
    if (block.type === 'hero') {
      const subtitle = (block.data as { subtitle?: string } | undefined)?.subtitle
      if (subtitle) return String(subtitle).slice(0, 160)
    }
    if (block.type === 'markdown') {
      const markdown = (block.data as { markdown?: string } | undefined)?.markdown
      if (markdown) {
        return String(markdown)
          .replace(/[#>*_\-[\]()`]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160)
      }
    }
  }
  return `${page.title || 'CloudSentinel'} 服务状态页`
})

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null
  if (!el) {
    el = attrs.rel ? document.createElement('link') : document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el?.setAttribute(key, value))
}

watchEffect(() => {
  const page = currentPage.value
  const brand = page?.brandName || 'CloudSentinel'
  const title = page?.title ? `${page.title} - ${brand}` : `${brand} 状态页`
  const description = pageDescription.value
  document.title = title
  upsertMeta('meta[name="description"]', { name: 'description', content: description })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: description,
  })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
  upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: window.location.href })
})

const displayFields = computed<PublicDisplayFieldsV1 | undefined>(() => {
  const s = publicSettings.settings.value
  const pd = s?.public_display
  if (!pd?.enabled) return undefined
  return pd.fields
})

const loadServers = async () => {
  const response = (await publicApi.getServers()) as GetServersResponse
  if (response.status && response.data) {
    servers.value = response.data.map((server) => mapServerListItemToServerItem(server))
    return
  }
  throw new Error(response.message || '获取服务器列表失败')
}

const loadIncidents = async () => {
  const path = currentPage.value?.path
  if (!path) {
    incidents.value = []
    return
  }
  const response = await publicApi.getIncidents({ path })
  if (response.status && response.data) {
    incidents.value = response.data
    return
  }
  throw new Error(response.message || '获取事件列表失败')
}

const loadServiceMonitors = async () => {
  const response = await publicApi.getServiceMonitors()
  if (response.status && response.data) {
    serviceMonitors.value = response.data
    lastUpdatedAt.value = response.meta?.last_updated_at ?? null
    return
  }
  throw new Error(response.message || '获取服务状态失败')
}

const clearUnusedData = (needs: { servers: boolean; monitors: boolean; incidents: boolean }) => {
  if (!needs.servers) servers.value = []
  if (!needs.monitors) {
    serviceMonitors.value = []
    lastUpdatedAt.value = null
  }
  if (!needs.incidents) incidents.value = []
}

/**
 * 仅请求当前页需要的接口。
 * @param silent 定时刷新时为 true，不打断页面（不全屏 loading）
 */
const loadPageData = async (opts?: { silent?: boolean }) => {
  if (!currentPage.value) return

  const needs = pageNeeds.value
  const silent = opts?.silent === true
  clearUnusedData(needs)

  if (!needs.servers && !needs.monitors && !needs.incidents) {
    error.value = null
    return
  }

  if (silent) refreshing.value = true
  else {
    loading.value = true
    error.value = null
  }

  try {
    const tasks: Array<Promise<void>> = []
    if (needs.monitors) tasks.push(loadServiceMonitors())
    if (needs.servers) tasks.push(loadServers())
    if (needs.incidents) tasks.push(loadIncidents())
    await Promise.all(tasks)
    error.value = null
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败'
    if (!silent) {
      error.value = msg
      message.error(msg)
    } else {
      console.warn('公开页定时刷新失败:', err)
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const secondsUntilRefresh = ref(refreshIntervalSec.value)

const refreshCountdownText = computed(() => {
  if (refreshing.value) return '刷新中…'
  const s = secondsUntilRefresh.value
  if (s <= 0) return '即将刷新…'
  if (s >= 60) {
    const m = Math.floor(s / 60)
    const r = s % 60
    return r > 0 ? `将于 ${m} 分 ${r} 秒后刷新` : `将于 ${m} 分钟后刷新`
  }
  return `将于 ${s} 秒后刷新`
})

const stopAutoRefresh = () => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const resetCountdown = () => {
  secondsUntilRefresh.value = refreshIntervalSec.value
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  resetCountdown()
  countdownTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return
    if (secondsUntilRefresh.value > 0) secondsUntilRefresh.value -= 1
  }, 1000)
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return
    void loadPageData({ silent: true }).finally(() => {
      resetCountdown()
    })
  }, refreshIntervalMs.value)
}

watch(
  () => route.path,
  async () => {
    await loadPageData()
    startAutoRefresh()
  },
)

watch(refreshIntervalMs, () => {
  startAutoRefresh()
})

onMounted(async () => {
  try {
    await publicSettings.load()
  } catch {
    /* 设置失败时仍用默认页配置 */
  }
  await loadPageData()
  startAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div v-if="!currentPage" class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <n-result status="404" title="页面不存在" description="未找到对应的公开页面配置" />
  </div>

  <PublicPageShell v-else :page="currentPage" :pages="publicPages.pages">
    <n-spin :show="loading" description="加载中...">
      <n-result v-if="error" status="error" :title="error">
        <template #footer>
          <n-button @click="loadPageData()">重试</n-button>
        </template>
      </n-result>
      <div v-else class="relative">
        <PublicPageRenderer
          :page="currentPage"
          :pages="publicPages.pages"
          :servers="servers"
          :incidents="incidents"
          :service-monitors="serviceMonitors"
          :display-fields="displayFields"
          :last-updated-at="lastUpdatedAt"
        />
        <footer class="mt-10 space-y-1.5 text-center text-sm text-[var(--surface-400)]">
          <p class="tabular-nums" aria-live="polite">{{ refreshCountdownText }}</p>
          <p>
            由
            <a
              href="https://github.com/YunTower/CloudSentinel"
              target="_blank"
              rel="noopener noreferrer"
              class="underline decoration-zinc-950/20 underline-offset-2 transition-colors hover:text-[var(--surface-700)] dark:decoration-white/20"
            >
              CloudSentinel
            </a>
            提供技术支持
          </p>
        </footer>
      </div>
    </n-spin>
  </PublicPageShell>
</template>
