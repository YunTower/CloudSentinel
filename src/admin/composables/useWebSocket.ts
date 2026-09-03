import { ref, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/admin/stores/auth'
import websocketManager from '@/admin/services/websocket-manager'

export interface WebSocketMessage {
  type: string
  data?: Record<string, unknown>
}

export interface WebSocketCallbacks {
  onMetricsUpdate?: (data: {
    server_id: string
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    network_upload?: number
    network_download?: number
    uptime_seconds?: number
  }) => void
  onMetricsRealtime?: (data: {
    server_id: string
    timestamp: number
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    disk_read?: number
    disk_write?: number
    network_upload?: number
    network_download?: number
  }) => void
  onSystemInfoUpdate?: (data: {
    server_id: string
    data?: {
      os?: string
      architecture?: string
      kernel?: string
      hostname?: string
    }
  }) => void
  onSwapInfoUpdate?: (data: {
    server_id: string
    swap?: {
      swap_total?: number
      swap_used?: number
      swap_free?: number
      swap_usage_percent?: number
    }
  }) => void
  onMemoryInfoUpdate?: (data: {
    server_id: string
    memory?: {
      memory_total?: number
      memory_used?: number
      memory_usage_percent?: number
    }
  }) => void
  onDiskInfoUpdate?: (data: {
    server_id: string
    disks?: Array<{
      disk_name?: string
      mount_point?: string
      total_size?: number
      used_size?: number
      free_size?: number
      usage_percent?: number
    }>
  }) => void
  onDiskIOUpdate?: (data: {
    server_id: string
    disk_io?: {
      read_speed?: number
      write_speed?: number
    }
  }) => void
  onNetworkInfoUpdate?: (data: {
    server_id: string
    network?: {
      upload_speed?: number
      download_speed?: number
      upload_bytes?: number
      download_bytes?: number
    }
  }) => void
  onServerStatusUpdate?: (data: {
    server_id: string
    status: 'online' | 'offline' | 'maintenance' | 'error'
  }) => void
  onProcessInfoUpdate?: (data: {
    server_id: string
    data: Record<
      string,
      {
        running: boolean
        pids: number[]
        cpu: number
        memory: number
      }
    >
  }) => void
  onGPUInfoUpdate?: (data: {
    server_id: string
    gpuInfo: {
      available: boolean
      gpus: Array<{
        index: number
        name: string
        temperature: number
        memory_used: number
        memory_total: number
        memory_util: number
        gpu_util: number
      }>
    }
  }) => void
  onServiceMonitorUpdate?: (data: {
    id: number
    status: string
    response_time: number
    last_check_at?: string
    last_metadata?: Record<string, unknown> | null
    metadata_checked_at?: string
    history_entry?: { status?: string; response_time?: number; checked_at?: string }
  }) => void
  onError?: (error: Event | Error) => void
  onOpen?: () => void
  onClose?: () => void
}

export function useWebSocket(callbacks: WebSocketCallbacks = {}) {
  const authStore = useAuthStore()
  const instanceId = ref(`ws-${Date.now()}-${Math.random()}`)
  let unregisterCallbacks: (() => void) | null = null
  let unregisterMessageHandler: (() => void) | null = null

  const connect = () => {
    if (!authStore.isAuthenticated) {
      console.warn('[useWebSocket] 无法建立WebSocket连接：未认证')
      return
    }

    // 注册回调到全局管理器
    unregisterCallbacks = websocketManager.registerCallbacks(instanceId.value, callbacks)

    // 注册消息处理器
    unregisterMessageHandler = websocketManager.registerMessageHandler(
      (message: WebSocketMessage) => {
        handleMessage(message)
      },
    )

    // 连接到全局WebSocket
    websocketManager.connect()
  }

  const disconnect = () => {
    // 注销回调
    if (unregisterCallbacks) {
      unregisterCallbacks()
      unregisterCallbacks = null
    }

    // 注销消息处理器
    if (unregisterMessageHandler) {
      unregisterMessageHandler()
      unregisterMessageHandler = null
    }
  }

  const isConnected = computed(() => websocketManager.getIsConnected().value)

  const handleMessage = (message: WebSocketMessage) => {
    console.log('[useWebSocket] 处理消息:', message.type, message)

    if (message.type === 'pong') {
      // 心跳响应，无需处理
      return
    }

    if (message.type === 'auth_success') {
      // 认证成功消息
      console.log('[useWebSocket] WebSocket 认证成功，连接已建立')
      return
    }

    if (message.type === 'connection_status' && message.data) {
      // 连接状态消息
      const data = message.data as { agent_count?: number }
      console.log(`[useWebSocket] 连接状态: agent 连接数 = ${data.agent_count || 0}`)
      if (data.agent_count === 0) {
        console.warn('[useWebSocket] 警告: 当前没有 agent 连接，无法接收数据推送')
      }
      return
    }

    if (message.type === 'metrics_update' && message.data) {
      const data = message.data as {
        server_id?: string
        metrics?: {
          cpu_usage?: number
          memory_usage?: number
          disk_usage?: number
          network_upload?: number
          network_download?: number
        }
        uptime_seconds?: number
      }
      if (data.server_id && data.metrics) {
        callbacks.onMetricsUpdate?.({
          server_id: data.server_id,
          cpu_usage:
            typeof data.metrics.cpu_usage === 'number' ? data.metrics.cpu_usage : undefined,
          memory_usage:
            typeof data.metrics.memory_usage === 'number' ? data.metrics.memory_usage : undefined,
          disk_usage:
            typeof data.metrics.disk_usage === 'number' ? data.metrics.disk_usage : undefined,
          network_upload:
            typeof data.metrics.network_upload === 'number'
              ? data.metrics.network_upload
              : undefined,
          network_download:
            typeof data.metrics.network_download === 'number'
              ? data.metrics.network_download
              : undefined,
          uptime_seconds:
            typeof data.uptime_seconds === 'number' ? data.uptime_seconds : undefined,
        })
      }
    } else if (message.type === 'metrics_realtime' && message.data) {
      const data = message.data as {
        server_id?: string
        timestamp?: number
        metrics?: {
          cpu_usage?: number
          memory_usage?: number
          disk_usage?: number
          disk_read?: number
          disk_write?: number
          network_upload?: number
          network_download?: number
        }
      }
      if (data.server_id && data.timestamp && data.metrics) {
        callbacks.onMetricsRealtime?.({
          server_id: data.server_id,
          timestamp: data.timestamp,
          cpu_usage:
            typeof data.metrics.cpu_usage === 'number' ? data.metrics.cpu_usage : undefined,
          memory_usage:
            typeof data.metrics.memory_usage === 'number' ? data.metrics.memory_usage : undefined,
          disk_usage:
            typeof data.metrics.disk_usage === 'number' ? data.metrics.disk_usage : undefined,
          disk_read:
            typeof data.metrics.disk_read === 'number' ? data.metrics.disk_read : undefined,
          disk_write:
            typeof data.metrics.disk_write === 'number' ? data.metrics.disk_write : undefined,
          network_upload:
            typeof data.metrics.network_upload === 'number'
              ? data.metrics.network_upload
              : undefined,
          network_download:
            typeof data.metrics.network_download === 'number'
              ? data.metrics.network_download
              : undefined,
        })
      }
    } else if (message.type === 'system_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        data?: {
          os?: string
          architecture?: string
          kernel?: string
          hostname?: string
        }
      }
      if (data.server_id) {
        callbacks.onSystemInfoUpdate?.({
          server_id: data.server_id,
          data: data.data,
        })
      }
    } else if (message.type === 'swap_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        swap?: {
          swap_total?: number
          swap_used?: number
          swap_free?: number
          swap_usage_percent?: number
        }
      }
      if (data.server_id && data.swap) {
        callbacks.onSwapInfoUpdate?.({
          server_id: data.server_id,
          swap: data.swap,
        })
      }
    } else if (message.type === 'memory_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        memory?: {
          memory_total?: number
          memory_used?: number
          memory_usage_percent?: number
        }
      }
      if (data.server_id && data.memory) {
        callbacks.onMemoryInfoUpdate?.({
          server_id: data.server_id,
          memory: data.memory,
        })
      }
    } else if (message.type === 'disk_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        disks?: Array<{
          disk_name?: string
          mount_point?: string
          total_size?: number
          used_size?: number
          free_size?: number
          usage_percent?: number
        }>
      }
      if (data.server_id && Array.isArray(data.disks)) {
        callbacks.onDiskInfoUpdate?.({
          server_id: data.server_id,
          disks: data.disks,
        })
      }
    } else if (message.type === 'disk_io_update' && message.data) {
      const data = message.data as {
        server_id?: string
        disk_io?: {
          read_speed?: number
          write_speed?: number
        }
      }
      if (data.server_id && data.disk_io) {
        callbacks.onDiskIOUpdate?.({
          server_id: data.server_id,
          disk_io: data.disk_io,
        })
      }
    } else if (message.type === 'network_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        network?: {
          upload_speed?: number
          download_speed?: number
          upload_bytes?: number
          download_bytes?: number
        }
      }
      if (data.server_id && data.network) {
        callbacks.onNetworkInfoUpdate?.({
          server_id: data.server_id,
          network: data.network,
        })
      }
    } else if (message.type === 'server_status_update' && message.data) {
      const data = message.data as {
        server_id?: string
        status?: 'online' | 'offline' | 'maintenance' | 'error'
      }
      if (data.server_id && data.status) {
        callbacks.onServerStatusUpdate?.({
          server_id: data.server_id,
          status: data.status,
        })
      }
    } else if (message.type === 'process_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        data?: Record<
          string,
          {
            running: boolean
            pids: number[]
            cpu: number
            memory: number
          }
        >
      }
      if (data.server_id && data.data) {
        callbacks.onProcessInfoUpdate?.({
          server_id: data.server_id,
          data: data.data,
        })
      }
    } else if (message.type === 'gpu_info_update' && message.data) {
      const data = message.data as {
        server_id?: string
        gpuInfo?: {
          available: boolean
          gpus: Array<{
            index: number
            name: string
            temperature: number
            memory_used: number
            memory_total: number
            memory_util: number
            gpu_util: number
          }>
        }
      }
      if (data.server_id && data.gpuInfo) {
        callbacks.onGPUInfoUpdate?.({
          server_id: data.server_id,
          gpuInfo: data.gpuInfo,
        })
      }
    } else if (message.type === 'service_monitor_update' && message.data) {
      const data = message.data as {
        id?: number
        status?: string
        response_time?: number
        last_check_at?: string
        last_metadata?: Record<string, unknown> | null
        metadata_checked_at?: string
        history_entry?: { status?: string; response_time?: number; checked_at?: string }
      }
      if (typeof data.id === 'number' && typeof data.status === 'string') {
        callbacks.onServiceMonitorUpdate?.({
          id: data.id,
          status: data.status,
          response_time: typeof data.response_time === 'number' ? data.response_time : 0,
          last_check_at: data.last_check_at,
          last_metadata: data.last_metadata,
          metadata_checked_at: data.metadata_checked_at,
          history_entry: data.history_entry,
        })
      }
    }
  }

  /** 订阅主题：页面进入时声明所需推送范围（服务端只推送已订阅主题） */
  const subscribe = (topics: string[]): void => {
    websocketManager.subscribeTopics(topics)
  }

  /** 取消订阅主题：页面离开时释放，避免无关推送到达 */
  const unsubscribe = (topics: string[]): void => {
    websocketManager.unsubscribeTopics(topics)
  }

  // 组件卸载时自动断开连接
  onUnmounted(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    isConnected,
  }
}
