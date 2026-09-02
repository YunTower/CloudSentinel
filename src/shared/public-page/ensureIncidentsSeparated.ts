import type {
  PublicPageBlockV1,
  PublicPagesConfigV1,
  PublicPageV1,
} from '@/shared/types/settings/public-pages'
import type { PublicDisplayFieldsV1 } from '@/shared/types/settings/public-display'

export const DEFAULT_INCIDENT_LIMIT = 20
export const MAX_INCIDENT_LIMIT = 100

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

/** 服务器区块字段展示默认值 */
export const defaultServerBlockFields = (): PublicDisplayFieldsV1 => ({
  showLocation: true,
  showOS: true,
  showArchitecture: true,
  showCores: true,
  showNetworkIO: true,
  showBilling: false,
  showTraffic: false,
})

/** 为区块数据补充展示范围与字段展示默认值（旧数据缺字段，按安全默认值处理） */
const normalizeBlockData = (block: PublicPageBlockV1): PublicPageBlockV1 => {
  if (block.type !== 'serverList' && block.type !== 'serviceStatus') return block
  const data = asObject(block.data)
  if (!data) return block
  const next = { ...data }
  if (typeof next.mode !== 'string') next.mode = 'all'
  if (block.type === 'serverList') {
    const fields = asObject(next.fields)
    next.fields = {
      showLocation: fields?.showLocation !== false,
      showOS: fields?.showOS !== false,
      showArchitecture: fields?.showArchitecture !== false,
      showCores: fields?.showCores !== false,
      showNetworkIO: fields?.showNetworkIO !== false,
      showBilling: fields?.showBilling === true,
      showTraffic: fields?.showTraffic === true,
    } satisfies PublicDisplayFieldsV1
  }
  return { ...block, data: next }
}

const normalizeIncidentLimit = (value: number | undefined): number => {
  // 0 = 不限；未配置时沿用旧默认值 20
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return DEFAULT_INCIDENT_LIMIT
  }
  const n = Math.floor(Number(value))
  if (n <= 0) return 0
  if (n > MAX_INCIDENT_LIMIT) return MAX_INCIDENT_LIMIT
  return n
}

export const normalizeBoundPublicPages = (cfg: PublicPagesConfigV1): PublicPagesConfigV1 => {
  const pages: PublicPageV1[] = (cfg.pages || [])
    .filter((page) => {
      const blocks = page.blocks || []
      // 丢弃历史独立事件页
      return !(blocks.length > 0 && blocks.every((b) => (b.type as string) === 'incidents'))
    })
    .map((page) => ({
      ...page,
      // 丢弃页面内的事件区块与旧筛选配置
      blocks: (page.blocks || []).filter((b) => (b.type as string) !== 'incidents').map(normalizeBlockData),
      // 数据刷新间隔为页面级设置：缺省 30，钳制 5–3600
      refreshIntervalSeconds: normalizeRefreshInterval(page.refreshIntervalSeconds),
      showIncidents: page.showIncidents !== false,
      incidentLimit: normalizeIncidentLimit(page.incidentLimit),
    }))

  return {
    ...cfg,
    version: cfg.version || 1,
    pages,
  }
}

/** @deprecated 使用 normalizeBoundPublicPages；保留别名避免外部引用断裂 */
export const ensureIncidentsSeparated = normalizeBoundPublicPages

const normalizeRefreshInterval = (value: number | undefined): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 30
  if (n < 5) return 5
  if (n > 3600) return 3600
  return n
}

export type PublicPageViewMode = 'status' | 'incidents'

export interface ResolvedPublicView {
  page: PublicPageV1
  view: PublicPageViewMode
  /** 请求事件接口时使用的绑定页 path */
  incidentsApiPath: string
}

/** 按路由解析绑定页与视图（状态 / 事件）；事件视图要求页面开启事件时间线 */
export const resolvePublicView = (
  routePath: string,
  pages: PublicPageV1[],
): ResolvedPublicView | null => {
  const path = routePath.replace(/\/+$/, '') || '/'
  const list = pages || []

  const exact = list.find((p) => p.path === path || p.path === routePath)
  if (exact) {
    return { page: exact, view: 'status', incidentsApiPath: exact.path }
  }

  if (path.endsWith('/incidents')) {
    const parentPath = path === '/public/incidents' ? '/public' : path.slice(0, -'/incidents'.length) || '/public'
    const parent = list.find((p) => p.path === parentPath)
    if (parent && parent.showIncidents !== false) {
      return { page: parent, view: 'incidents', incidentsApiPath: parent.path }
    }
  }

  return null
}

export const defaultPublicPagesConfig = (): PublicPagesConfigV1 =>
  normalizeBoundPublicPages({
    version: 1,
    pages: [
      {
        id: 'home',
        path: '/public',
        title: '状态',
        brandName: 'CloudSentinel',
        accentColor: '#18a058',
        refreshIntervalSeconds: 30,
        showIncidents: true,
        incidentLimit: DEFAULT_INCIDENT_LIMIT,
        blocks: [
          { type: 'markdown', data: { markdown: '' } },
          {
            type: 'serviceStatus',
            data: { monitorIds: [], groupBy: 'group', limit: 0, showUptime: true },
          },
          {
            type: 'serverList',
            data: { view: 'table', groupBy: 'none', limit: 0, showToolbar: false },
          },
        ],
      },
    ],
  })
