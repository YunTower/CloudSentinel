import type { PublicDisplayFieldsV1 } from './public-display'

export type PublicPageBlockTypeV1 =
  | 'hero'
  | 'markdown'
  | 'stats'
  | 'serverList'
  | 'serviceStatus'
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
  /** 页面级数据自动刷新间隔（秒），缺省 30，范围 5–3600 */
  refreshIntervalSeconds?: number
  /** 是否显示事件时间线（页面级全局设置）；缺省视为开启 */
  showIncidents?: boolean
  /** 事件时间线数量限制；0 = 不限 */
  incidentLimit?: number
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

/** 区块展示范围：all=全部（默认）、include=仅显示选中项、exclude=隐藏选中项 */
export type PublicBlockVisibilityModeV1 = 'all' | 'include' | 'exclude'

export interface PublicBlockServerListV1 {
  groupBy: 'none' | 'status' | 'location' | 'os'
  limit?: number
  /** 服务器展示范围 */
  mode?: PublicBlockVisibilityModeV1
  /** include/exclude 模式下的服务器 ID 列表 */
  serverIds?: string[]
  /** include/exclude 模式下的分组 ID 列表 */
  groupIds?: number[]
  /** 字段展示配置（未配置时按安全默认值：计费/流量不展示） */
  fields?: PublicDisplayFieldsV1
}

export interface PublicBlockServiceStatusV1 {
  monitorIds?: number[]
  /** 服务展示范围 */
  mode?: PublicBlockVisibilityModeV1
  groupBy?: 'none' | 'group'
  limit?: number
  showUptime?: boolean
}

export interface PublicBlockLinksV1 {
  links: Array<{ label: string; href: string }>
}
