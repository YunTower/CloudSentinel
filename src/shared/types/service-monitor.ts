export interface ServiceMonitorHistoryEntry {
  status: string
  response_time: number
  checked_at: string
}

export interface PublicServiceMonitor {
  id: number
  name: string
  group_name: string
  type: string
  status: string
  response_time: number
  last_check_at: string | null
  check_cert_expiry?: boolean
  cert_expires_at?: string | null
  cert_days_left?: number | null
  ai_api_format?: 'anthropic_messages' | 'chat_completions' | 'responses' | string
  ai_model?: string
  last_metadata?: {
    kind?: string
    edition?: string
    version_name?: string
    protocol_version?: number
    motd?: string
    players_online?: number
    players_max?: number
    game_mode?: string
    api_format?: string
    configured_model?: string
    response_model?: string
  }
  metadata_checked_at?: string | null
  history: ServiceMonitorHistoryEntry[]
  uptime?: Record<
    '24h' | '7d' | '30d',
    {
      total_checks: number
      up_checks: number
      slow_checks: number
      down_checks: number
      uptime_rate: number
      avg_response_time: number
    }
  >
}
