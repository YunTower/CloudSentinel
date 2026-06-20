export type PublicPageBlockTypeV1 =
  | 'hero'
  | 'markdown'
  | 'stats'
  | 'serverList'
  | 'serviceStatus'
  | 'incidents'
  | 'links'

export interface PublicPagesConfigV1 {
  version: 1
  pages: PublicPageV1[]
}

export interface PublicPageV1 {
  id: string
  path: string
  title: string
  brandName?: string
  logoUrl?: string
  accentColor?: string
  blocks: PublicPageBlockV1[]
}

export interface PublicPageBlockV1 {
  type: PublicPageBlockTypeV1
  data: unknown
}

export interface PublicBlockHeroV1 {
  title: string
  subtitle?: string
  badge?: string
}

export interface PublicBlockMarkdownV1 {
  markdown: string
}

export type PublicStatItemV1 =
  | 'onlineCount'
  | 'offlineCount'
  | 'totalCount'
  | 'avgCpu'
  | 'avgMemory'
  | 'avgDisk'

export interface PublicBlockStatsV1 {
  items: PublicStatItemV1[]
}

export interface PublicBlockServerListV1 {
  view: 'card' | 'table'
  groupBy: 'none' | 'status' | 'location' | 'os'
  limit?: number
  showToolbar?: boolean
}

export interface PublicBlockServiceStatusV1 {
  monitorIds?: number[]
  groupBy?: 'none' | 'group'
  limit?: number
  showUptime?: boolean
}

export interface PublicBlockIncidentsV1 {
  limit?: number
  showResolved?: boolean
  sourceTypes?: Array<'server' | 'service_monitor' | 'maintenance'>
}

export interface PublicBlockLinksV1 {
  links: Array<{ label: string; href: string }>
}
