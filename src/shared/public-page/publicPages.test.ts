import { describe, expect, it } from 'vitest'

import {
  defaultPublicPagesConfig,
  normalizeBoundPublicPages,
  resolvePublicView,
} from './ensureIncidentsSeparated'
import {
  companionIncidentsPath,
  isIncidentsOnlyPage,
  resolveIncidentScopePageId,
} from './filterPublicIncidents'
import type { PublicPageV1, PublicPagesConfigV1 } from '@/shared/types/settings/public-pages'

const statusPage = (overrides: Partial<PublicPageV1> = {}): PublicPageV1 => ({
  id: 'status',
  path: '/public/team',
  title: '团队状态',
  brandName: 'CloudSentinel',
  accentColor: '#18a058',
  blocks: [
    { type: 'serviceStatus', data: { monitorIds: [3, '4', -1, 'bad'] } },
  ],
  ...overrides,
})

const incidentsPage = (overrides: Partial<PublicPageV1> = {}): PublicPageV1 => ({
  id: 'incidents',
  path: '/public/team/incidents',
  title: '事件',
  brandName: 'CloudSentinel',
  accentColor: '#18a058',
  blocks: [{ type: 'incidents', data: { limit: 5, monitorIds: [] } }],
  ...overrides,
})

describe('公开页事件范围辅助函数', () => {
  it('只把非空且全部为事件块的页面视为独立事件页', () => {
    expect(isIncidentsOnlyPage(incidentsPage())).toBe(true)
    expect(isIncidentsOnlyPage(statusPage())).toBe(false)
    expect(isIncidentsOnlyPage(statusPage({ blocks: [] }))).toBe(false)
  })

  it('生成根页面和子页面的伴随事件路径', () => {
    expect(companionIncidentsPath('/public/')).toBe('/public/incidents')
    expect(companionIncidentsPath('/public/team/')).toBe('/public/team/incidents')
  })

  it('独立事件页解析为绑定状态页 ID，找不到父页时保留自身 ID', () => {
    const status = statusPage()
    expect(resolveIncidentScopePageId(incidentsPage(), [status])).toBe(status.id)
    expect(resolveIncidentScopePageId(incidentsPage(), [])).toBe('incidents')
    expect(resolveIncidentScopePageId(status, [status])).toBe('status')
  })
})

describe('公开页配置归一化', () => {
  it('把伴随事件页合并回状态页并继承监测项', () => {
    const cfg: PublicPagesConfigV1 = {
      version: 1,
      refreshIntervalSeconds: 30,
      pages: [statusPage(), incidentsPage()],
    }
    const normalized = normalizeBoundPublicPages(cfg)

    expect(normalized.pages).toHaveLength(1)
    const incidentBlock = normalized.pages[0].blocks.find((block) => block.type === 'incidents')
    expect(incidentBlock?.data).toMatchObject({ limit: 5, monitorIds: [3, 4] })
  })

  it('状态页没有事件块时补默认事件块，并钳制刷新间隔', () => {
    const low = normalizeBoundPublicPages({
      version: 0 as 1,
      refreshIntervalSeconds: 1,
      pages: [statusPage()],
    })
    const high = normalizeBoundPublicPages({
      version: 1,
      refreshIntervalSeconds: 9999,
      pages: [],
    })
    expect(low.version).toBe(1)
    expect(low.refreshIntervalSeconds).toBe(5)
    expect(low.pages[0].blocks[low.pages[0].blocks.length - 1]?.type).toBe('incidents')
    expect(high.refreshIntervalSeconds).toBe(3600)
  })

  it('没有对应状态页的孤立事件页仍被保留', () => {
    const normalized = normalizeBoundPublicPages({
      version: 1,
      refreshIntervalSeconds: Number.NaN,
      pages: [incidentsPage()],
    })
    expect(normalized.refreshIntervalSeconds).toBe(30)
    expect(normalized.pages).toHaveLength(1)
    expect(normalized.pages[0].id).toBe('incidents')
  })

  it('按状态路径和事件路径解析同一个绑定页面', () => {
    const page = normalizeBoundPublicPages({
      version: 1, refreshIntervalSeconds: 30, pages: [statusPage()],
    }).pages[0]
    expect(resolvePublicView('/public/team/', [page])).toMatchObject({
      page, view: 'status', incidentsApiPath: '/public/team',
    })
    expect(resolvePublicView('/public/team/incidents', [page])).toMatchObject({
      page, view: 'incidents', incidentsApiPath: '/public/team',
    })
    expect(resolvePublicView('/missing', [page])).toBeNull()
  })

  it('默认配置提供状态、服务器和绑定事件块', () => {
    const cfg = defaultPublicPagesConfig()
    expect(cfg.pages).toHaveLength(1)
    expect(cfg.pages[0].path).toBe('/public')
    expect(cfg.pages[0].blocks.map((block) => block.type)).toEqual([
      'markdown', 'serviceStatus', 'serverList', 'incidents',
    ])
  })
})
