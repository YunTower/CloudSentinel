export type PublicDisplayServerFilterModeV1 = 'all' | 'allowList'

export interface PublicDisplayOverviewV1 {
  defaultViewMode: 'card' | 'table'
  allowViewModeSwitch: boolean
  defaultGroupBy: string
  allowGroupBySwitch: boolean
}

export interface PublicDisplayServerFilterV1 {
  mode: PublicDisplayServerFilterModeV1
  allowServerIds: string[]
  allowGroupIds: number[]
}

export interface PublicDisplayFieldsV1 {
  showLocation: boolean
  showOS: boolean
  showArchitecture: boolean
  showCores: boolean
  showNetworkIO: boolean
  showBilling: boolean
  showTraffic: boolean
}

export interface PublicDisplayAnnouncementV1 {
  enabled: boolean
  markdown: string
  placement: 'overview_top' | string
}

export interface PublicDisplayConfigV1 {
  version: 1
  enabled: boolean
  overview: PublicDisplayOverviewV1
  serverFilter: PublicDisplayServerFilterV1
  fields: PublicDisplayFieldsV1
  announcement: PublicDisplayAnnouncementV1
}

// 后端 GET /settings/public 返回的子集
export interface PublicDisplayPublicPayloadV1 {
  version: 1
  enabled: boolean
  overview: PublicDisplayOverviewV1
  fields: PublicDisplayFieldsV1
  announcement: PublicDisplayAnnouncementV1
  serverFilter: {
    mode: PublicDisplayServerFilterModeV1
  }
}
