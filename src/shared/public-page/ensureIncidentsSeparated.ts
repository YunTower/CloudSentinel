import type { PublicPagesConfigV1, PublicPageV1 } from '@/shared/types/settings/public-pages'
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

/** 从同页服务状态块继承 monitorIds，便于事件页默认只看本页服务 */
const inheritMonitorIds = (page: PublicPageV1): number[] => {
  const block = page.blocks.find((b) => b.type === 'serviceStatus')
  const raw = asObject(block?.data)?.monitorIds
  if (!Array.isArray(raw)) return []
  return raw.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
}

/** 将各状态页上的事件块拆到对应独立事件页，避免多页共用同一事件列表配置 */
export const ensureIncidentsSeparated = (cfg: PublicPagesConfigV1): PublicPagesConfigV1 => {
  let brandName = 'CloudSentinel'
  let accentColor = '#18a058'
  let logoUrl: string | undefined
  let homeIncidentData: Record<string, unknown> = defaultIncidentData()

  const existingByPath = new Map<string, PublicPageV1>()
  for (const page of cfg.pages || []) {
    existingByPath.set(page.path, page)
  }

  const pages: PublicPageV1[] = []
  const pendingCompanions: PublicPageV1[] = []

  for (const page of cfg.pages || []) {
    if (page.brandName) brandName = page.brandName
    if (page.accentColor) accentColor = page.accentColor
    if (page.logoUrl) logoUrl = page.logoUrl

    if (isIncidentsOnlyPage(page)) {
      // 可能已由对应状态页刷新并写入，避免重复
      if (!pages.some((p) => p.path === page.path)) {
        pages.push(page)
      }
      continue
    }

    const hasStatus = page.blocks.some(
      (b) => b.type === 'serviceStatus' || b.type === 'serverList',
    )
    const incidentBlock = page.blocks.find((b) => b.type === 'incidents')

    if (incidentBlock && hasStatus) {
      const data =
        incidentBlock.data && typeof incidentBlock.data === 'object'
          ? (incidentBlock.data as Record<string, unknown>)
          : {}
      const inheritedMonitors = inheritMonitorIds(page)
      const incidentData: Record<string, unknown> = {
        ...defaultIncidentData(),
        ...data,
      }
      if (
        (!Array.isArray(incidentData.monitorIds) || incidentData.monitorIds.length === 0) &&
        inheritedMonitors.length > 0
      ) {
        incidentData.monitorIds = inheritedMonitors
      }

      if (page.path === '/public' || page.path === '/public/') {
        homeIncidentData = incidentData
      }

      const incidentsPath = companionIncidentsPath(page.path)
      pages.push({
        ...page,
        blocks: page.blocks.filter((b) => b.type !== 'incidents'),
      })

      const existingCompanion = existingByPath.get(incidentsPath)
      if (existingCompanion && isIncidentsOnlyPage(existingCompanion)) {
        // 已有独立事件页时，用本次拆出的配置刷新（保留 id/path/品牌）
        const idx = pages.findIndex((p) => p.path === incidentsPath)
        const refreshed: PublicPageV1 = {
          ...existingCompanion,
          brandName: page.brandName || existingCompanion.brandName || brandName,
          accentColor: page.accentColor || existingCompanion.accentColor || accentColor,
          logoUrl: page.logoUrl || existingCompanion.logoUrl || logoUrl,
          blocks: [{ type: 'incidents', data: incidentData }],
        }
        if (idx >= 0) pages[idx] = refreshed
        else pages.push(refreshed)
      } else if (
        !existingByPath.has(incidentsPath) &&
        !pendingCompanions.some((p) => p.path === incidentsPath)
      ) {
        pendingCompanions.push({
          id: page.path === '/public' || page.path === '/public/' ? 'incidents' : `${page.id}_incidents`,
          path: incidentsPath,
          title: '事件',
          brandName: page.brandName || brandName,
          accentColor: page.accentColor || accentColor,
          logoUrl: page.logoUrl || logoUrl,
          blocks: [{ type: 'incidents', data: incidentData }],
        })
      }
      continue
    }

    pages.push(page)
  }

  pages.push(...pendingCompanions)

  if (!pages.some((p) => p.path === '/public/incidents')) {
    pages.push({
      id: 'incidents',
      path: '/public/incidents',
      title: '事件',
      brandName,
      accentColor,
      logoUrl,
      blocks: [{ type: 'incidents', data: homeIncidentData }],
    })
  }

  return {
    ...cfg,
    version: cfg.version || 1,
    refreshIntervalSeconds: normalizeRefreshInterval(cfg.refreshIntervalSeconds),
    pages,
  }
}

const normalizeRefreshInterval = (value: number | undefined): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 30
  if (n < 5) return 5
  if (n > 3600) return 3600
  return n
}

export const defaultPublicPagesConfig = (): PublicPagesConfigV1 =>
  ensureIncidentsSeparated({
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
        ],
      },
    ],
  })
