import type { PublicPagesConfigV1, PublicPageV1, PublicPageBlockV1 } from '@/shared/types/settings/public-pages'
import { companionIncidentsPath, isIncidentsOnlyPage } from '@/shared/public-page/filterPublicIncidents'

const defaultIncidentData = () => ({
  limit: 20,
  showResolved: true,
  sourceTypes: [] as string[],
  monitorIds: [] as number[],
  serverIds: [] as string[],
})

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const inheritMonitorIds = (page: PublicPageV1): number[] => {
  const block = page.blocks.find((b) => b.type === 'serviceStatus')
  const raw = asObject(block?.data)?.monitorIds
  if (!Array.isArray(raw)) return []
  return raw.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
}

const hasStatusBlocks = (page: PublicPageV1) =>
  page.blocks.some((b) => b.type === 'serviceStatus' || b.type === 'serverList')

/**
 * 将历史上拆出的独立事件页合并回对应状态页，保证「一页绑定状态+事件」。
 * 不再生成独立事件页面条目。
 */
export const normalizeBoundPublicPages = (cfg: PublicPagesConfigV1): PublicPagesConfigV1 => {
  const input = cfg.pages || []
  const byPath = new Map(input.map((p) => [p.path, p]))
  const mergedIds = new Set<string>()
  const pages: PublicPageV1[] = []

  for (const page of input) {
    if (isIncidentsOnlyPage(page)) continue

    const incidentsPath = companionIncidentsPath(page.path)
    const companion = byPath.get(incidentsPath)
    let blocks = [...(page.blocks || [])]
    let incidentBlock = blocks.find((b) => b.type === 'incidents')

    if (!incidentBlock && companion && isIncidentsOnlyPage(companion)) {
      const data =
        companion.blocks[0]?.data && typeof companion.blocks[0].data === 'object'
          ? { ...defaultIncidentData(), ...(companion.blocks[0].data as Record<string, unknown>) }
          : defaultIncidentData()
      const inherited = inheritMonitorIds(page)
      if ((!Array.isArray(data.monitorIds) || data.monitorIds.length === 0) && inherited.length > 0) {
        data.monitorIds = inherited
      }
      blocks = [...blocks, { type: 'incidents', data }]
      incidentBlock = blocks[blocks.length - 1]
      mergedIds.add(companion.id)
    }

    // 有状态块但无事件块时，补默认事件块（绑定在同一页）
    if (hasStatusBlocks({ ...page, blocks }) && !incidentBlock) {
      const data = defaultIncidentData()
      const inherited = inheritMonitorIds(page)
      if (inherited.length > 0) data.monitorIds = inherited
      blocks = [...blocks, { type: 'incidents', data }]
    }

    pages.push({ ...page, blocks })
  }

  // 孤儿独立事件页：无对应状态页时保留为普通页（极少见）
  for (const page of input) {
    if (!isIncidentsOnlyPage(page)) continue
    if (mergedIds.has(page.id)) continue
    const parentPath =
      page.path === '/public/incidents'
        ? '/public'
        : page.path.endsWith('/incidents')
          ? page.path.slice(0, -'/incidents'.length) || '/public'
          : ''
    if (parentPath && pages.some((p) => p.path === parentPath)) continue
    pages.push(page)
  }

  return {
    ...cfg,
    version: cfg.version || 1,
    refreshIntervalSeconds: normalizeRefreshInterval(cfg.refreshIntervalSeconds),
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

/** 按路由解析绑定页与视图（状态 / 事件） */
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
    if (parent && parent.blocks.some((b) => b.type === 'incidents')) {
      return { page: parent, view: 'incidents', incidentsApiPath: parent.path }
    }
  }

  return null
}

export const defaultPublicPagesConfig = (): PublicPagesConfigV1 =>
  normalizeBoundPublicPages({
    version: 1,
    refreshIntervalSeconds: 30,
    pages: [
      {
        id: 'home',
        path: '/public',
        title: '状态',
        brandName: 'CloudSentinel',
        accentColor: '#18a058',
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
          {
            type: 'incidents',
            data: defaultIncidentData(),
          },
        ] satisfies PublicPageBlockV1[],
      },
    ],
  })
