export interface IncidentEvent {
  id: number
  incident_id: number
  event_type: 'opened' | 'update' | 'resolved' | string
  status: string
  message: string
  metadata?: string
  occurred_at: string
  created_at: string
  updated_at: string
}

export interface Incident {
  id: number
  source_type: 'server' | 'service_monitor' | 'maintenance' | string
  source_id: string
  title: string
  status: 'active' | 'resolved' | string
  impact: 'degraded' | 'outage' | 'maintenance' | string
  /** 绑定的公开页面 id；空数组表示全站可见 */
  page_ids?: string[]
  started_at: string
  resolved_at: string | null
  last_event_at: string
  created_at: string
  updated_at: string
  events?: IncidentEvent[]
}

export interface GetIncidentsResponse {
  status: boolean
  message?: string
  data?: Incident[]
}

export interface PublicIncidentEvent {
  id: number
  event_type: 'opened' | 'update' | 'resolved' | string
  status: string
  message: string
  occurred_at: string
}

export interface PublicIncident {
  id: number
  source_type: 'server' | 'service_monitor' | 'maintenance' | string
  source_id?: string
  title: string
  status: 'active' | 'resolved' | string
  impact: 'degraded' | 'outage' | 'maintenance' | string
  /** 绑定的公开页面 id；空数组表示全站可见 */
  page_ids?: string[]
  started_at: string
  resolved_at: string | null
  last_event_at: string
  events?: PublicIncidentEvent[]
}

export interface PublicIncidentsMetaV1 {
  total: number
  page: number
  page_size: number
}

export interface GetPublicIncidentsResponse {
  status: boolean
  message?: string
  data?: PublicIncident[]
  meta?: PublicIncidentsMetaV1
}
