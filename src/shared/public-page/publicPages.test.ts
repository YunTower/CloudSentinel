import { describe, expect, it } from 'vitest'

import {
  DEFAULT_INCIDENT_LIMIT,
  defaultPublicPagesConfig,
  normalizeBoundPublicPages,
  resolvePublicView,
} from './ensureIncidentsSeparated'
import { companionIncidentsPath } from './filterPublicIncidents'
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

const legacyIncidentsPage = (overrides: Partial<PublicPageV1> = {}): PublicPageV1 => ({
  id: 'incidents',
  path: '/public/team/incidents',
  title: '事件',
  brandName: 'CloudSentinel',
  accentColor: '#18a058',
  blocks: [
    { type: 'incidents', data: { limit: 5, monitorIds: [] } },
  ] as unknown as PublicPageV1['blocks'],
  ...overrides,
})

describe('公开页事件路径辅助函数', () => {
  it('生成根页面和子页面的伴随事件路径', () => {
    expect(companionIncidentsPath('/public/')).toBe('/public/incidents')
    expect(companionIncidentsPath('/public/team/')).toBe('/public/team/incidents')
  })
})

describe('公开页配置归一化', () => {
  it('丢弃历史独立事件页与页面内事件区块', () => {
    const cfg: PublicPagesConfigV1 = {
      version: 1,
      pages: [statusPage(), legacyIncidentsPage()],
    }
    const normalized = normalizeBoundPublicPages(cfg)

    expect(normalized.pages).toHaveLength(1)
    expect(
      normalized.pages[0].blocks.some((block) => (block.type as string) === 'incidents'),
    ).toBe(false)
  })

  it('为页面级事件设置补默认值，并钳制刷新间隔', () => {
    const low = normalizeBoundPublicPages({
      version: 0 as 1,
      pages: [statusPage()],
    })
    const high = normalizeBoundPublicPages({
      version: 1,
      pages: [],
    })
    expect(low.version).toBe(1)
    expect(low.pages[0].refreshIntervalSeconds).toBe(30)
    expect(low.pages[0].showIncidents).toBe(true)
    expect(low.pages[0].incidentLimit).toBe(DEFAULT_INCIDENT_LIMIT)
    const clamped = normalizeBoundPublicPages({
      version: 1,
      pages: [statusPage({ refreshIntervalSeconds: 9999 })],
    })
    expect(clamped.pages[0].refreshIntervalSeconds).toBe(3600)
  })

  it('为旧区块数据补充展示范围默认值', () => {
    const normalized = normalizeBoundPublicPages({
      version: 1,
      pages: [statusPage()],
    })
    const data = normalized.pages[0].blocks[0].data as { mode?: string }
    expect(data.mode).toBe('all')
  })

  it('按状态路径和事件路径解析同一个绑定页面', () => {
    const page = normalizeBoundPublicPages({
      version: 1, pages: [statusPage()],
    }).pages[0]
    expect(resolvePublicView('/public/team/', [page])).toMatchObject({
      page, view: 'status', incidentsApiPath: '/public/team',
    })
    expect(resolvePublicView('/public/team/incidents', [page])).toMatchObject({
      page, view: 'incidents', incidentsApiPath: '/public/team',
    })
    expect(resolvePublicView('/missing', [page])).toBeNull()
  })

  it('页面未开启事件时间线时，事件路径无法解析', () => {
    const page = normalizeBoundPublicPages({
      version: 1, pages: [statusPage({ showIncidents: false })],
    }).pages[0]
    expect(resolvePublicView('/public/team', [page])).toMatchObject({ view: 'status' })
    expect(resolvePublicView('/public/team/incidents', [page])).toBeNull()
  })

  it('默认配置提供状态与服务、服务器区块，且不含事件区块', () => {
    const cfg = defaultPublicPagesConfig()
    expect(cfg.pages).toHaveLength(1)
    expect(cfg.pages[0].path).toBe('/public')
    expect(cfg.pages[0].showIncidents).toBe(true)
    expect(cfg.pages[0].blocks.map((block) => block.type)).toEqual([
      'markdown', 'serviceStatus', 'serverList',
    ])
  })
})
