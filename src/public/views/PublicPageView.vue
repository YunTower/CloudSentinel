<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { usePublicSettings } from '@/public/stores/public-settings'
import { publicApi } from '@/public/apis/public'
import type { ServerItem } from '@/shared/types/server'
import type { GetServersResponse } from '@/shared/types/manager/servers'
import type { PublicIncident } from '@/shared/types/incidents'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import { mapServerListItemToServerItem } from '@/shared/server-display/utils'
import type { PublicPageV1 } from '@/shared/types/settings/public-pages'
import PublicPageShell from '@/shared/public-page/PublicPageShell.vue'
import PublicPageRenderer from '@/shared/public-page/PublicPageRenderer.vue'
import PublicPageSkeleton from '@/shared/public-page/PublicPageSkeleton.vue'
import type { PublicPageViewMode } from '@/shared/public-page/ensureIncidentsSeparated'
import { companionIncidentsPath } from '@/shared/public-page/filterPublicIncidents'

/** 公开页刷新间隔默认 30s，允许范围 5–3600 */
const DEFAULT_REFRESH_INTERVAL_SEC = 30
const MIN_REFRESH_INTERVAL_SEC = 5
const MAX_REFRESH_INTERVAL_SEC = 3600

const route = useRoute()
const router = useRouter()
const message = useMessage()
const publicSettings = usePublicSettings()

const loading = ref(false)
const pageLoading = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)
const hashBlocked = ref(false)
const pageNotFound = ref(false)

const currentPage = ref<PublicPageV1 | null>(null)

const servers = ref<ServerItem[]>([])
const incidents = ref<PublicIncident[]>([])
const serviceMonitors = ref<PublicServiceMonitor[]>([])
const lastUpdatedAt = ref<string | null>(null)

/** 事件页分页：每页固定 10 条，页面级 incidentLimit 为总上限（由后端截断） */
const INCIDENTS_PAGE_SIZE = 10
/** 状态视图（Banner）单次拉取的事件数：足够覆盖活跃事件 */
const INCIDENTS_BANNER_PAGE_SIZE = 50

const incidentsPage = ref(1)
const incidentsTotal = ref(0)

const refreshIntervalSec = computed(() => {
  // 数据刷新间隔为页面级设置：缺省 30，范围 5–3600
  const raw = currentPage.value?.refreshIntervalSeconds
  const n = Number.isFinite(raw) ? Math.floor(Number(raw)) : DEFAULT_REFRESH_INTERVAL_SEC
  return Math.min(
    MAX_REFRESH_INTERVAL_SEC,
    Math.max(MIN_REFRESH_INTERVAL_SEC, n || DEFAULT_REFRESH_INTERVAL_SEC),
  )
})

const refreshIntervalMs = computed(() => refreshIntervalSec.value * 1000)

const viewMode = computed<PublicPageViewMode>(() => {
  const page = currentPage.value
  if (!page) return 'status'
  const path = route.path.replace(/\/+$/, '') || '/'
  if (path === page.path.replace(/\/+$/, '')) return 'status'
  if (companionIncidentsPath(page.path) === path) return 'incidents'
  if (path.endsWith('/incidents')) return 'incidents'
  return 'status'
})

/** 事件时间线未开启时，事件页视为不存在（双保险：后端同样返回 404） */
const incidentsDisabled = computed(
  () =>
    !!currentPage.value &&
    viewMode.value === 'incidents' &&
    currentPage.value.showIncidents === false,
)

/** 根据绑定页视图决定需要哪些接口 */
const pageNeeds = computed(() => {
  const page = currentPage.value
  if (!page) {
    return { servers: false, monitors: false, incidents: false }
  }
  if (viewMode.value === 'incidents') {
    return { servers: false, monitors: false, incidents: true }
  }
  const blocks = page.blocks || []
  return {
    servers: blocks.some((b) => b.type === 'serverList'),
    monitors: blocks.some((b) => b.type === 'serviceStatus'),
    // 状态 Banner 也需要进行中的事件；不依赖用户是否打开独立事件视图。
    incidents: blocks.some((b) => b.type === 'serviceStatus' || b.type === 'serverList'),
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
  if (hashBlocked.value || pageNotFound.value || incidentsDisabled.value || !currentPage.value) {
    document.title = '页面不存在 - CloudSentinel'
    return
  }
  const page = currentPage.value
  const brand = page.brandName || 'CloudSentinel'
  const title =
    viewMode.value === 'incidents'
      ? `事件 - ${brand}`
      : page.title
        ? `${page.title} - ${brand}`
        : `${brand} 状态页`
  const description = pageDescription.value
  document.title = title
  upsertMeta('meta[name="description"]', { name: 'description', content: description })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: description,
  })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
  upsertMeta('link[rel="canonical"]', {
    rel: 'canonical',
    href: window.location.href.split('#')[0],
  })
})

/**
 * 拦截管理端式 hash 路由（公开端不支持 /#/...）
 */
const stripAdminHash = () => {
  const hash = window.location.hash || ''
  if (!hash.startsWith('#/')) {
    hashBlocked.value = false
    return false
  }
  hashBlocked.value = true
  const clean = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', clean || '/')
  return true
}

let routeLoadGeneration = 0

const loadBoundPage = async (path: string, generation: number): Promise<boolean> => {
  pageLoading.value = true
  pageNotFound.value = false
  try {
    const settings = await publicSettings.load(path)
    if (generation !== routeLoadGeneration) return false

    const page = settings.public_pages?.page
    if (page) {
      currentPage.value = page
      // 路由切换后回到事件列表第一页
      incidentsPage.value = 1
      incidentsTotal.value = 0
      return true
    }
    currentPage.value = null
    pageNotFound.value = true
    return false
  } catch (err) {
    if (generation !== routeLoadGeneration) return false
    if (!(err instanceof Error && err.message === '公开页面不存在')) {
      console.warn('加载公开页面失败:', err)
    }
    currentPage.value = null
    pageNotFound.value = true
    return false
  } finally {
    if (generation === routeLoadGeneration) {
      pageLoading.value = false
    }
  }
}

// 三个数据加载器各自在写入前校验代际：路由切换后慢响应不得覆盖新页面数据
const isRouteStale = (generation: number) => generation !== routeLoadGeneration

const loadServers = async (generation: number) => {
  const response = (await publicApi.getServers()) as GetServersResponse
  if (isRouteStale(generation)) return
  if (response.status && response.data) {
    servers.value = response.data.map((server) => mapServerListItemToServerItem(server))
    return
  }
  throw new Error(response.message || '获取服务器列表失败')
}

const loadIncidents = async (generation: number) => {
  const page = currentPage.value
  if (!page) {
    incidents.value = []
    incidentsTotal.value = 0
    return
  }
  // 事件视图按分页拉取；状态视图（Banner）拉取较大的一页以覆盖活跃事件
  const incidentsView = viewMode.value === 'incidents'
  const response = await publicApi.getIncidents({
    path: page.path,
    page: incidentsView ? incidentsPage.value : 1,
    pageSize: incidentsView ? INCIDENTS_PAGE_SIZE : INCIDENTS_BANNER_PAGE_SIZE,
  })
  if (isRouteStale(generation)) return
  if (response.status && response.data) {
    incidents.value = response.data
    incidentsTotal.value = response.meta?.total ?? response.data.length
    return
  }
  throw new Error(response.message || '获取事件列表失败')
}

/** 事件页翻页：更新页码并重新拉取事件列表 */
const handleIncidentsPageChange = (page: number) => {
  if (page === incidentsPage.value) return
  incidentsPage.value = page
  void loadPageData()
}

const loadServiceMonitors = async (generation: number) => {
  const response = await publicApi.getServiceMonitors()
  if (isRouteStale(generation)) return
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
  if (!needs.incidents) {
    incidents.value = []
    incidentsTotal.value = 0
  }
}

const loadPageData = async (opts?: { silent?: boolean }) => {
  if (hashBlocked.value || pageNotFound.value || incidentsDisabled.value || !currentPage.value)
    return

  // 代际保护：路由切换后旧请求的结果不得写入新页面的共享状态
  const generation = routeLoadGeneration

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
    if (needs.monitors) tasks.push(loadServiceMonitors(generation))
    if (needs.servers) tasks.push(loadServers(generation))
    if (needs.incidents) tasks.push(loadIncidents(generation))
    await Promise.all(tasks)
    if (generation !== routeLoadGeneration) return
    error.value = null
  } catch (err: unknown) {
    if (generation !== routeLoadGeneration) return
    const msg = err instanceof Error ? err.message : '加载失败'
    if (!silent) {
      error.value = msg
      message.error(msg)
    } else {
      console.warn('公开页定时刷新失败:', err)
    }
  } finally {
    if (generation === routeLoadGeneration) {
      loading.value = false
      refreshing.value = false
    }
  }
}

const bootstrapRoute = async () => {
  const generation = ++routeLoadGeneration
  stripAdminHash()
  if (hashBlocked.value) {
    stopAutoRefresh()
    return
  }
  const loaded = await loadBoundPage(route.path, generation)
  if (!loaded || generation !== routeLoadGeneration) {
    stopAutoRefresh()
    return
  }
  await loadPageData()
  if (generation !== routeLoadGeneration) return
  startAutoRefresh()
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
  if (
    hashBlocked.value ||
    pageNotFound.value ||
    incidentsDisabled.value ||
    !currentPage.value
  )
    return
  resetCountdown()
  // 记录当前代际：路由切换后旧定时器的静默刷新不得写入新页面状态
  const generation = routeLoadGeneration
  countdownTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return
    if (secondsUntilRefresh.value > 0) secondsUntilRefresh.value -= 1
  }, 1000)
  refreshTimer = setInterval(() => {
    if (generation !== routeLoadGeneration) {
      stopAutoRefresh()
      return
    }
    if (document.visibilityState === 'hidden') return
    void loadPageData({ silent: true }).finally(() => {
      resetCountdown()
    })
  }, refreshIntervalMs.value)
}

watch(
  () => route.fullPath,
  async () => {
    await bootstrapRoute()
  },
)

watch(refreshIntervalMs, () => {
  startAutoRefresh()
})

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange)
  await bootstrapRoute()
})

const onHashChange = () => {
  if (stripAdminHash()) {
    stopAutoRefresh()
    void router.replace(route.fullPath)
  }
}

onBeforeUnmount(() => {
  stopAutoRefresh()
  window.removeEventListener('hashchange', onHashChange)
})
</script>

<template>
  <div
    v-if="
      hashBlocked ||
      pageNotFound ||
      incidentsDisabled ||
      (!pageLoading && !currentPage)
    "
    class="mx-auto flex min-h-dvh w-full items-center justify-center px-4 py-10 sm:px-6"
  >
    <n-result
      status="404"
      title="页面不存在"
      description="未找到对应的公开页面配置，请检查访问地址是否正确。"
    />
  </div>

  <div v-else-if="pageLoading && !currentPage" class="min-h-dvh">
    <PublicPageSkeleton include-header />
  </div>

  <PublicPageShell v-else-if="currentPage" :page="currentPage" :view="viewMode">
    <Transition name="public-content" mode="out-in">
      <PublicPageSkeleton v-if="loading || pageLoading" key="loading" />
      <n-result v-else-if="error" key="error" status="error" :title="error">
        <template #footer>
          <n-button class="public-interactive" @click="bootstrapRoute()">重试</n-button>
        </template>
      </n-result>
      <div v-else key="content" class="relative">
        <PublicPageRenderer
          :page="currentPage"
          :view="viewMode"
          :servers="servers"
          :incidents="incidents"
          :service-monitors="serviceMonitors"
          :last-updated-at="lastUpdatedAt"
          :incidents-total="incidentsTotal"
          :incidents-page="incidentsPage"
          :incidents-page-size="INCIDENTS_PAGE_SIZE"
          @incidents-page-change="handleIncidentsPageChange"
        />
        <footer class="mt-10 space-y-1.5 text-center text-sm text-[var(--surface-400)]">
          <p class="tabular-nums" aria-live="polite">{{ refreshCountdownText }}</p>
          <p>
            由
            <a
              href="https://github.com/YunTower/CloudSentinel"
              target="_blank"
              rel="noopener noreferrer"
              class="public-interactive inline-block underline decoration-zinc-950/20 underline-offset-2 transition-colors hover:text-[var(--surface-700)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:decoration-white/20"
            >
              CloudSentinel
            </a>
            提供技术支持
          </p>
        </footer>
      </div>
    </Transition>
  </PublicPageShell>
</template>
