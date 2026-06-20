<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import serversApi from '@/apis/servers'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'
import incidentsApi from '@/apis/incidents'
import serviceMonitorsApi from '@/apis/service-monitors'
import type { ServerItem } from '@/types/server'
import type { GetServersResponse } from '@/types/manager/servers'
import type { PublicIncident } from '@/types/incidents'
import type { PublicServiceMonitor } from '@/apis/service-monitors'
import { mapServerListItemToServerItem } from '@/views/overview/utils'
import type { PublicPagesConfigV1, PublicPageV1 } from '@/types/settings/public-pages'
import type { PublicDisplayFieldsV1 } from '@/types/settings/public-display'
import PublicPageRenderer from './components/PublicPageRenderer.vue'

const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref<string | null>(null)

const servers = ref<ServerItem[]>([])
const incidents = ref<PublicIncident[]>([])
const serviceMonitors = ref<PublicServiceMonitor[]>([])

const defaultPublicPages = (): PublicPagesConfigV1 => ({
  version: 1,
  pages: [
    {
      id: 'home',
      path: '/public',
      title: '公开页面',
      brandName: 'CloudSentinel',
      accentColor: '#18a058',
      blocks: [
        {
          type: 'hero',
          data: { title: 'CloudSentinel', subtitle: '服务状态与资源概览', badge: 'PUBLIC' },
        },
        { type: 'markdown', data: { markdown: '## 公告\n欢迎访问公开页面。' } },
        {
          type: 'serverList',
          data: { view: 'table', groupBy: 'status', limit: 0, showToolbar: true },
        },
        {
          type: 'incidents',
          data: { limit: 10, showResolved: true, sourceTypes: [] },
        },
        {
          type: 'serviceStatus',
          data: { monitorIds: [], groupBy: 'group', limit: 0, showUptime: true },
        },
      ],
    },
  ],
})

const publicPages = computed<PublicPagesConfigV1 | null>(() => {
  const s = authStore.getPublicSettings()
  return ((s?.public_pages as PublicPagesConfigV1 | undefined) ||
    defaultPublicPages()) as PublicPagesConfigV1
})

const currentPage = computed<PublicPageV1 | null>(() => {
  const cfg = publicPages.value
  if (!cfg?.pages?.length) return null
  const path = route.path
  return cfg.pages.find((p) => p.path === path) || null
})

const pageDescription = computed(() => {
  const page = currentPage.value
  if (!page) return 'CloudSentinel 公开状态页'
  for (const block of page.blocks || []) {
    const data = block.data as any
    if (block.type === 'hero' && data?.subtitle) return String(data.subtitle).slice(0, 160)
    if (block.type === 'markdown' && data?.markdown) {
      return String(data.markdown)
        .replace(/[#>*_\-[\]()`]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
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
  const s = authStore.getPublicSettings()
  const pd = s?.public_display
  if (authStore.role !== 'guest') return undefined
  if (!pd?.enabled) return undefined
  return pd.fields
})

const loadServers = async () => {
  loading.value = true
  error.value = null
  try {
    const response = (await serversApi.getPublicServers()) as GetServersResponse
    if (response.status && response.data) {
      servers.value = response.data.map((server) => mapServerListItemToServerItem(server))
    } else {
      throw new Error(response.message || '获取服务器列表失败')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '获取服务器列表失败'
    error.value = msg
    message.error(msg)
  } finally {
    loading.value = false
  }
}

const loadIncidents = async () => {
  try {
    const response = await incidentsApi.getPublic()
    if (response.status && response.data) {
      incidents.value = response.data
    }
  } catch (err) {
    console.warn('加载公开事件失败:', err)
  }
}

const loadServiceMonitors = async () => {
  try {
    const response = await serviceMonitorsApi.getPublic()
    if (response.status && response.data) {
      serviceMonitors.value = response.data
    }
  } catch (err) {
    console.warn('加载公开服务状态失败:', err)
  }
}

const websocket = useWebSocket({
  onMetricsUpdate: (data) => {
    const idx = servers.value.findIndex((s) => s.id === data.server_id)
    if (idx === -1) return
    const server = servers.value[idx]
    servers.value[idx] = {
      ...server,
      cpuUsage: data.cpu_usage !== undefined ? data.cpu_usage : server.cpuUsage,
      memoryUsage: data.memory_usage !== undefined ? data.memory_usage : server.memoryUsage,
      diskUsage: data.disk_usage !== undefined ? data.disk_usage : server.diskUsage,
      networkIO: {
        upload: data.network_upload !== undefined ? data.network_upload : server.networkIO.upload,
        download:
          data.network_download !== undefined ? data.network_download : server.networkIO.download,
      },
    }
  },
  onSystemInfoUpdate: (data) => {
    const idx = servers.value.findIndex((s) => s.id === data.server_id)
    if (idx === -1 || !data.data) return
    const server = servers.value[idx]
    servers.value[idx] = {
      ...server,
      os: data.data.os !== undefined ? data.data.os : server.os,
      architecture:
        data.data.architecture !== undefined ? data.data.architecture : server.architecture,
    }
  },
  onServerStatusUpdate: (data) => {
    const idx = servers.value.findIndex((s) => s.id === data.server_id)
    if (idx === -1) return
    servers.value[idx] = { ...servers.value[idx], status: data.status }
  },
})

onMounted(async () => {
  // 确保公开设置已加载（用于拿到 public_pages）
  if (!authStore.getPublicSettings()) {
    try {
      await authStore.loadPublicSettings()
    } catch {}
  }

  await Promise.all([loadServers(), loadIncidents(), loadServiceMonitors()])
  websocket.connect()
})
</script>

<template>
  <div class="min-h-[calc(100vh-80px)] p-6 max-w-6xl mx-auto">
    <div v-if="!currentPage" class="py-10">
      <n-result status="404" title="页面不存在" description="未找到对应的公开页面配置" />
    </div>

    <template v-else>
      <div class="mb-6">
        <div class="flex items-center gap-3">
          <img
            v-if="currentPage.logoUrl"
            :src="currentPage.logoUrl"
            :alt="currentPage.brandName || currentPage.title || 'Logo'"
            class="h-10 w-10 rounded object-cover"
          />
          <div
            v-else
            class="h-10 w-10 rounded flex items-center justify-center text-white font-semibold"
            :style="{ backgroundColor: currentPage.accentColor || '#18a058' }"
          >
            {{ (currentPage.brandName || currentPage.title || 'C').slice(0, 1).toUpperCase() }}
          </div>
          <div>
            <div class="text-sm font-medium" :style="{ color: currentPage.accentColor || '' }">
              {{ currentPage.brandName || 'CloudSentinel' }}
            </div>
            <h1 class="text-3xl font-bold text-color">{{ currentPage.title || '公开页面' }}</h1>
          </div>
        </div>
        <p class="text-muted-color mt-1">对外展示内容由管理员配置</p>
      </div>

      <n-spin :show="loading" description="加载中...">
        <n-result v-if="error" status="error" :title="error">
          <template #footer>
            <n-button @click="loadServers">重试</n-button>
          </template>
        </n-result>
        <PublicPageRenderer
          v-else
          :page="currentPage"
          :servers="servers"
          :incidents="incidents"
          :service-monitors="serviceMonitors"
          :display-fields="displayFields"
        />
      </n-spin>
    </template>
  </div>
</template>
