import { ref, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import websocketManager from '@/services/websocket-manager'

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
    uptime?: string
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
  onServerStatusUpdate?: (data: {
    server_id: string
    status: 'online' | 'offline' | 'maintenance' | 'error'
  }) => void
  onProcessInfoUpdate?: (data: {
    server_id: string
    data: Record<string, {
      running: boolean
      pids: number[]
      cpu: number
      memory: number
    }>
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
    const token = authStore.getToken()
    if (!token) {
      console.warn('[useWebSocket] 无法建立WebSocket连接：缺少认证token')
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
    websocketManager.connect(token)
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
      callbacks.onOpen?.()
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
        uptime?: string
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
          uptime: typeof data.uptime === 'string' ? data.uptime : undefined,
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
        data?: Record<string, {
          running: boolean
          pids: number[]
          cpu: number
          memory: number
        }>
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
    }
  }

  // 组件卸载时自动断开连接
  onUnmounted(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    isConnected,
  }
}
