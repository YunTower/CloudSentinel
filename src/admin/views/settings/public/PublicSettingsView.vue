<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import publicPagesApi from '@/admin/apis/settings/public-pages'
import serversApi from '@/admin/apis/servers'
import incidentsApi from '@/admin/apis/incidents'
import serviceMonitorsApi from '@/admin/apis/service-monitors'
import { useAuthStore } from '@/admin/stores/auth'
import type { ApiResponse } from '@/shared/types/settings/api'
import type { ServerGroup, GetServersResponse } from '@/shared/types/manager/servers'
import type { ServerItem } from '@/shared/types/server'
import type { PublicIncident } from '@/shared/types/incidents'
import type { PublicServiceMonitor } from '@/shared/types/service-monitor'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'
import type {
  PublicPagesConfigV1,
  PublicPageV1,
  PublicPageBlockV1,
  PublicPageBlockTypeV1,
  PublicStatItemV1,
} from '@/shared/types/settings/public-pages'
import { mapServerListItemToServerItem } from '@/shared/server-display/utils'
import PublicPageShell from '@/shared/public-page/PublicPageShell.vue'
import PublicPageRenderer from '@/shared/public-page/PublicPageRenderer.vue'
import {
  defaultPublicPagesConfig,
  normalizeBoundPublicPages,
} from '@/shared/public-page/ensureIncidentsSeparated'
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiSaveLine,
} from '@remixicon/vue'

const message = useMessage()
const authStore = useAuthStore()

const groups = ref<ServerGroup[]>([])
const servers = ref<ServerItem[]>([])
const incidents = ref<PublicIncident[]>([])
const serviceMonitors = ref<PublicServiceMonitor[]>([])
const lastUpdatedAt = ref<string | null>(null)

const groupOptions = computed(() => groups.value.map((g) => ({ label: g.name, value: g.id })))
const serviceMonitorOptions = computed(() =>
  serviceMonitors.value.map((monitor) => ({
    label: `${monitor.group_name ? `${monitor.group_name} / ` : ''}${monitor.name}`,
    value: monitor.id,
  })),
)
const serverOptions = computed(() =>
  servers.value.map((server) => ({
    label: server.name || server.id,
    value: server.id,
  })),
)

const loadGroups = async () => {
  try {
    const res = await serversApi.getGroups()
    const data = res as { status: boolean; data?: ServerGroup[] }
    if (data.status && data.data) groups.value = data.data
  } catch (err) {
    console.warn('加载分组失败:', err)
  }
}

const loadServers = async () => {
  try {
    const response = (await serversApi.getServers()) as GetServersResponse
    if (response.status && response.data)
      servers.value = response.data.map((s) => mapServerListItemToServerItem(s))
  } catch (err) {
    console.warn('加载服务器预览数据失败:', err)
  }
}

const loadIncidents = async () => {
  try {
    const path = activePage.value?.path
    if (!path) {
      incidents.value = []
      return
    }
    const response = await incidentsApi.getPublic({ path })
    if (response.status && response.data) incidents.value = response.data
  } catch (err) {
    console.warn('加载事件预览数据失败:', err)
  }
}

const loadServiceMonitors = async () => {
  try {
    const response = await serviceMonitorsApi.getPublic()
    if (response.status && response.data) {
      serviceMonitors.value = response.data
      lastUpdatedAt.value = response.meta?.last_updated_at ?? null
    }
  } catch (err) {
    console.warn('加载服务状态预览数据失败:', err)
  }
}

const loadingPages = ref(false)
const savingPages = ref(false)

const defaultPagesConfig = (): PublicPagesConfigV1 => defaultPublicPagesConfig()

const pagesConfig = ref<PublicPagesConfigV1>(defaultPagesConfig())
const activePageId = ref<string>('home')

const pages = computed(() => pagesConfig.value.pages || [])
const activePage = computed<PublicPageV1 | null>(() => {
  const p = pages.value.find((x) => x.id === activePageId.value)
  return p || pages.value[0] || null
})

const blockTypeOptions: Array<{ label: string; value: PublicPageBlockTypeV1 }> = [
  { label: 'Hero', value: 'hero' },
  { label: 'Markdown', value: 'markdown' },
  { label: '统计卡片', value: 'stats' },
  { label: '服务器列表', value: 'serverList' },
  { label: '服务状态', value: 'serviceStatus' },
  { label: '链接按钮', value: 'links' },
]

const visibilityModeOptions = [
  { label: '全部', value: 'all' },
  { label: '仅显示选中', value: 'include' },
  { label: '隐藏选中', value: 'exclude' },
]

/** 服务器区块字段展示默认值（计费/流量属敏感数据，默认不展示） */
const defaultServerBlockFields = (): PublicDisplayFieldsV1 => ({
  showLocation: true,
  showOS: true,
  showArchitecture: true,
  showCores: true,
  showNetworkIO: true,
  showBilling: false,
  showTraffic: false,
})

const serverFieldItems: Array<{ label: string; key: keyof PublicDisplayFieldsV1 }> = [
  { label: '地域', key: 'showLocation' },
  { label: '系统信息（OS）', key: 'showOS' },
  { label: '架构', key: 'showArchitecture' },
  { label: '核心数', key: 'showCores' },
  { label: '网络速率', key: 'showNetworkIO' },
  { label: '计费信息', key: 'showBilling' },
  { label: '流量/带宽信息', key: 'showTraffic' },
]

const blockTypeLabel = (type: PublicPageBlockTypeV1) =>
  blockTypeOptions.find((item) => item.value === type)?.label || type

const statOptions: Array<{ label: string; value: PublicStatItemV1 }> = [
  { label: '在线数', value: 'onlineCount' },
  { label: '离线/异常数', value: 'offlineCount' },
  { label: '总数', value: 'totalCount' },
  { label: '平均 CPU', value: 'avgCpu' },
  { label: '平均 内存', value: 'avgMemory' },
  { label: '平均 磁盘', value: 'avgDisk' },
]

const createBlockData = (type: PublicPageBlockTypeV1): PublicPageBlockV1['data'] => {
  if (type === 'hero') return { title: 'CloudSentinel', subtitle: '', badge: '' }
  if (type === 'markdown') return { markdown: '' }
  if (type === 'stats') return { items: ['onlineCount', 'offlineCount'] }
  if (type === 'serverList')
    return {
      view: 'table',
      groupBy: 'none',
      limit: 0,
      showToolbar: true,
      mode: 'all',
      serverIds: [],
      groupIds: [],
      fields: defaultServerBlockFields(),
    }
  if (type === 'serviceStatus')
    return { monitorIds: [], mode: 'all', groupBy: 'group', limit: 0, showUptime: true }
  if (type === 'links') return { links: [{ label: '联系管理员', href: 'mailto:ops@example.com' }] }
  return {}
}

const addPage = () => {
  const newId = `page_${Date.now().toString(36)}`
  const p: PublicPageV1 = {
    id: newId,
    path: `/public/${newId}`,
    title: '新页面',
    brandName: 'CloudSentinel',
    accentColor: '#18a058',
    refreshIntervalSeconds: 30,
    showIncidents: true,
    incidentLimit: 20,
    blocks: [
      { type: 'markdown', data: { markdown: '## 新页面' } },
      {
        type: 'serviceStatus',
        data: { monitorIds: [], mode: 'all', groupBy: 'group', limit: 0, showUptime: true },
      },
    ],
  }
  pagesConfig.value.pages.push(p)
}

const loadPagesConfig = async () => {
  loadingPages.value = true
  try {
    const res = await publicPagesApi.getPublicPagesSettings()
    const data = res as ApiResponse<PublicPagesConfigV1>
    if (data.status && data.data) {
      pagesConfig.value = normalizeBoundPublicPages(data.data)
      if (!pagesConfig.value.pages?.length) pagesConfig.value = defaultPagesConfig()
      activePageId.value = pagesConfig.value.pages[0].id
    } else {
      throw new Error(data.message || '加载失败')
    }
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loadingPages.value = false
  }
}

const savePages = async () => {
  savingPages.value = true
  try {
    const payload = normalizeBoundPublicPages(pagesConfig.value)
    const res = await publicPagesApi.savePublicPagesSettings(payload)
    const data = res as ApiResponse<PublicPagesConfigV1>
    if (data.status) {
      if (data.data) {
        pagesConfig.value = normalizeBoundPublicPages(data.data)
        if (!pages.value.some((p) => p.id === activePageId.value)) {
          activePageId.value = pagesConfig.value.pages[0]?.id || 'home'
        }
      } else {
        await loadPagesConfig()
      }
      message.success('保存成功')
      await authStore.refreshPublicSettings()
    } else {
      throw new Error(data.message || '保存失败')
    }
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    savingPages.value = false
  }
}

const removePage = (id: string) => {
  if (pagesConfig.value.pages.length <= 1) {
    message.warning('至少保留一个页面')
    return
  }
  pagesConfig.value.pages = pagesConfig.value.pages.filter((p) => p.id !== id)
  activePageId.value = pagesConfig.value.pages[0].id
}

const addBlock = (type: PublicPageBlockTypeV1) => {
  const p = activePage.value
  if (!p) return
  p.blocks.push({ type, data: createBlockData(type) })
}

const handleAddBlockSelect = (key: string | number) => addBlock(key as PublicPageBlockTypeV1)

const handleBlockTypeChange = (
  block: { type: PublicPageBlockTypeV1; data: unknown },
  type: string | number,
) => {
  const t = type as PublicPageBlockTypeV1
  block.type = t
  block.data = createBlockData(t)
}

const moveBlock = (index: number, dir: -1 | 1) => {
  const p = activePage.value
  if (!p) return
  const next = index + dir
  if (next < 0 || next >= p.blocks.length) return
  const tmp = p.blocks[index]
  p.blocks[index] = p.blocks[next]
  p.blocks[next] = tmp
}

const removeBlock = (index: number) => {
  const p = activePage.value
  if (!p) return
  p.blocks.splice(index, 1)
  if (p.blocks.length === 0) p.blocks.push({ type: 'markdown', data: { markdown: '## 空页面' } })
}

watch(
  pages,
  (ps) => {
    if (!ps.length) return
    if (!ps.some((p) => p.id === activePageId.value)) activePageId.value = ps[0].id
  },
  { deep: true },
)

watch(activePageId, () => {
  void loadIncidents()
})

onMounted(async () => {
  if (!authStore.getPublicSettings()) {
    try {
      await authStore.loadPublicSettings()
    } catch {}
  }
  await Promise.all([
    loadGroups(),
    loadPagesConfig(),
    loadServers(),
    loadIncidents(),
    loadServiceMonitors(),
  ])
})
</script>

<template>
  <div class="w-full">
    <div class="mb-6 flex items-start justify-between">
      <div>
        <n-h1 class="!mb-1">公开配置</n-h1>
        <n-text depth="3">通过页面搭建配置游客可见的公开页面</n-text>
      </div>
    </div>

    <n-spin :show="loadingPages" description="加载中...">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-2 pt-2 items-start">
            <div class="space-y-2">
              <n-card class="builder-panel">
                <template #header>
                  <n-thing>
                    <template #header>
                      <n-h2 class="!mb-0">页面搭建</n-h2>
                    </template>
                    <template #description>
                      <n-text depth="3">配置页面与区块</n-text>
                    </template>
                  </n-thing>
                </template>
                <template #header-extra>
                  <n-space :size="8">
                    <n-button secondary :disabled="loadingPages || savingPages" @click="addPage">
                      <template #icon><ri-add-line /></template>
                      新增页面
                    </n-button>
                    <n-button
                      type="primary"
                      :loading="savingPages"
                      :disabled="loadingPages"
                      @click="savePages"
                    >
                      <template #icon><ri-save-line /></template>
                      保存页面
                    </n-button>
                  </n-space>
                </template>

                <n-tabs v-model:value="activePageId" type="line" animated>
                  <n-tab-pane v-for="p in pages" :key="p.id" :name="p.id" :tab="p.title || p.id">
                    <div class="space-y-3">
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <n-form-item label="ID">
                          <n-input v-model:value="p.id" placeholder="home" />
                        </n-form-item>
                        <n-form-item label="路径">
                          <n-input v-model:value="p.path" placeholder="/public" />
                        </n-form-item>
                        <n-form-item label="标题">
                          <n-input v-model:value="p.title" placeholder="公开页面" />
                        </n-form-item>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <n-form-item label="品牌名">
                          <n-input v-model:value="p.brandName" placeholder="CloudSentinel" />
                        </n-form-item>
                        <n-form-item label="Logo URL">
                          <n-input v-model:value="p.logoUrl" placeholder="https://..." />
                        </n-form-item>
                        <n-form-item label="主题色">
                          <n-color-picker
                            v-model:value="p.accentColor"
                            :show-alpha="false"
                            :modes="['hex']"
                          />
                        </n-form-item>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <n-form-item label="显示事件时间线">
                          <div class="w-full flex items-center justify-between gap-2">
                            <n-text depth="3" class="text-xs">控制该页面“事件”入口</n-text>
                            <n-switch v-model:value="p.showIncidents" />
                          </div>
                        </n-form-item>
                        <n-form-item
                          v-if="p.showIncidents !== false"
                          label="事件数量限制（0=不限）"
                        >
                          <n-input-number
                            v-model:value="p.incidentLimit"
                            :min="0"
                            :max="100"
                            class="w-full"
                            placeholder="0 表示不限制"
                          />
                        </n-form-item>
                        <n-form-item label="刷新间隔（秒）">
                          <n-input-number
                            v-model:value="p.refreshIntervalSeconds"
                            :min="5"
                            :max="3600"
                            :step="5"
                            class="w-full"
                            placeholder="默认 30"
                          />
                        </n-form-item>
                      </div>

                      <n-divider class="!my-1" />

                      <div
                        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <n-thing>
                          <template #header>
                            <n-h2 class="!mb-0">区块</n-h2>
                          </template>
                          <template #description>
                            <n-text depth="3">自上而下渲染</n-text>
                          </template>
                        </n-thing>
                        <n-space :size="8">
                          <n-dropdown
                            trigger="click"
                            :options="
                              blockTypeOptions.map((o) => ({ label: o.label, key: o.value }))
                            "
                            @select="handleAddBlockSelect"
                          >
                            <n-button secondary size="small">
                              <template #icon><ri-add-line /></template>
                              添加区块
                            </n-button>
                          </n-dropdown>
                          <n-button secondary size="small" type="error" @click="removePage(p.id)">
                            <template #icon><ri-delete-bin-line /></template>
                            删除页面
                          </n-button>
                        </n-space>
                      </div>

                      <div class="space-y-3">
                        <n-card
                          v-for="(b, i) in p.blocks"
                          :key="i"
                          size="small"
                          class="page-block-card"
                        >
                          <template #header>
                            <div class="flex min-w-0 items-center gap-3">
                              <n-tag size="small" round :bordered="false">#{{ i + 1 }}</n-tag>
                              <n-text strong>{{ blockTypeLabel(b.type) }}</n-text>
                            </div>
                          </template>
                          <template #header-extra>
                            <div class="flex flex-wrap items-center justify-end gap-2">
                              <div class="w-[140px]">
                                <n-select
                                  v-model:value="b.type"
                                  :options="blockTypeOptions"
                                  size="small"
                                  @update:value="handleBlockTypeChange.bind(null, b as any)"
                                />
                              </div>
                              <n-button quaternary circle size="small" @click="moveBlock(i, -1)">
                                <template #icon><ri-arrow-up-line /></template>
                              </n-button>
                              <n-button quaternary circle size="small" @click="moveBlock(i, 1)">
                                <template #icon><ri-arrow-down-line /></template>
                              </n-button>
                              <n-button
                                quaternary
                                circle
                                size="small"
                                type="error"
                                @click="removeBlock(i)"
                              >
                                <template #icon><ri-delete-bin-line /></template>
                              </n-button>
                            </div>
                          </template>

                          <div
                            v-if="b.type === 'hero'"
                            class="grid grid-cols-1 md:grid-cols-3 gap-2"
                          >
                            <n-form-item label="标题">
                              <n-input v-model:value="(b.data as any).title" />
                            </n-form-item>
                            <n-form-item label="副标题">
                              <n-input v-model:value="(b.data as any).subtitle" />
                            </n-form-item>
                            <n-form-item label="Badge">
                              <n-input v-model:value="(b.data as any).badge" />
                            </n-form-item>
                          </div>

                          <div v-else-if="b.type === 'markdown'">
                            <n-form-item label="Markdown">
                              <n-input
                                v-model:value="(b.data as any).markdown"
                                type="textarea"
                                :autosize="{ minRows: 6, maxRows: 14 }"
                              />
                            </n-form-item>
                          </div>

                          <div v-else-if="b.type === 'stats'">
                            <n-form-item label="统计项">
                              <n-select
                                v-model:value="(b.data as any).items"
                                multiple
                                :options="statOptions"
                                placeholder="选择要展示的统计卡片"
                              />
                            </n-form-item>
                          </div>

                          <div v-else-if="b.type === 'serverList'" class="space-y-2">
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
                              <n-form-item label="视图">
                                <n-select
                                  v-model:value="(b.data as any).view"
                                  :options="[
                                    { label: '表格', value: 'table' },
                                    { label: '卡片', value: 'card' },
                                  ]"
                                />
                              </n-form-item>
                              <n-form-item label="分组">
                                <n-select
                                  v-model:value="(b.data as any).groupBy"
                                  :options="[
                                    { label: '不分组', value: 'none' },
                                    { label: '按状态', value: 'status' },
                                    { label: '按地域', value: 'location' },
                                    { label: '按系统', value: 'os' },
                                  ]"
                                />
                              </n-form-item>
                              <n-form-item label="数量限制（0=不限）">
                                <n-input-number
                                  v-model:value="(b.data as any).limit"
                                  :min="0"
                                  :max="1000"
                                  class="w-full"
                                />
                              </n-form-item>
                              <n-form-item label="显示工具栏">
                                <n-switch v-model:value="(b.data as any).showToolbar" />
                              </n-form-item>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <n-form-item label="展示范围">
                                <n-select
                                  v-model:value="(b.data as any).mode"
                                  :options="visibilityModeOptions"
                                />
                              </n-form-item>
                              <template
                                v-if="
                                  (b.data as any).mode === 'include' ||
                                  (b.data as any).mode === 'exclude'
                                "
                              >
                                <n-form-item label="服务器">
                                  <n-select
                                    v-model:value="(b.data as any).serverIds"
                                    multiple
                                    filterable
                                    :options="serverOptions"
                                    placeholder="选择服务器"
                                  />
                                </n-form-item>
                                <n-form-item label="分组">
                                  <n-select
                                    v-model:value="(b.data as any).groupIds"
                                    multiple
                                    :options="groupOptions"
                                    placeholder="选择分组（含组内全部服务器）"
                                  />
                                </n-form-item>
                              </template>
                            </div>
                            <div>
                              <n-text depth="3" class="text-xs">字段展示</n-text>
                              <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                                <div
                                  v-for="item in serverFieldItems"
                                  :key="item.key"
                                  class="flex items-center justify-between gap-2"
                                >
                                  <n-text class="text-sm">{{ item.label }}</n-text>
                                  <n-switch
                                    v-model:value="(b.data as any).fields[item.key]"
                                    :disabled="
                                      item.key === 'showTraffic' &&
                                      !(b.data as any).fields.showBilling
                                    "
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div v-else-if="b.type === 'serviceStatus'" class="space-y-2">
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
                              <n-form-item label="展示范围">
                                <n-select
                                  v-model:value="(b.data as any).mode"
                                  :options="visibilityModeOptions"
                                />
                              </n-form-item>
                              <n-form-item
                                v-if="
                                  (b.data as any).mode === 'include' ||
                                  (b.data as any).mode === 'exclude'
                                "
                                label="服务"
                              >
                                <n-select
                                  v-model:value="(b.data as any).monitorIds"
                                  multiple
                                  :options="serviceMonitorOptions"
                                  placeholder="选择要展示或隐藏的服务"
                                />
                              </n-form-item>
                              <n-form-item label="分组">
                                <n-select
                                  v-model:value="(b.data as any).groupBy"
                                  :options="[
                                    { label: '按服务分组', value: 'group' },
                                    { label: '不分组', value: 'none' },
                                  ]"
                                />
                              </n-form-item>
                              <n-form-item label="数量限制（0=不限）">
                                <n-input-number
                                  v-model:value="(b.data as any).limit"
                                  :min="0"
                                  :max="500"
                                  class="w-full"
                                />
                              </n-form-item>
                              <n-form-item label="显示可用率">
                                <n-switch v-model:value="(b.data as any).showUptime" />
                              </n-form-item>
                            </div>
                          </div>

                          <div v-else-if="b.type === 'links'">
                            <n-form-item label="链接">
                              <n-dynamic-input
                                v-model:value="(b.data as any).links"
                                :on-create="() => ({ label: '链接', href: 'https://' })"
                              >
                                <template #default="{ value }">
                                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                                    <n-input v-model:value="value.label" placeholder="显示名称" />
                                    <n-input v-model:value="value.href" placeholder="https://..." />
                                  </div>
                                </template>
                              </n-dynamic-input>
                            </n-form-item>
                          </div>
                        </n-card>
                      </div>
                    </div>
                  </n-tab-pane>
                </n-tabs>
              </n-card>
            </div>

            <n-card class="builder-panel preview-panel" content-style="padding: 16px;">
              <template #header>
                <n-thing>
                  <template #header>
                    <n-h2 class="!mb-0">预览</n-h2>
                  </template>
                  <template #description>
                    <n-text depth="3">实时预览</n-text>
                  </template>
                </n-thing>
              </template>
              <n-empty v-if="!activePage" description="没有可预览的页面" class="py-10" />
              <div
                v-else
                class="rounded-2xl bg-[var(--surface-0)] p-4 ring-1 ring-zinc-950/10 sm:p-5 dark:ring-white/10"
              >
                <PublicPageShell :page="activePage" :pages="pages" view="status" compact>
                  <PublicPageRenderer
                    :page="activePage"
                    :pages="pages"
                    view="status"
                    :servers="servers"
                    :incidents="incidents"
                    :service-monitors="serviceMonitors"
                    :last-updated-at="lastUpdatedAt"
                  />
                </PublicPageShell>
              </div>
            </n-card>
          </div>
        </n-spin>
  </div>
</template>
