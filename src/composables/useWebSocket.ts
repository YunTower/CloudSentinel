import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

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
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
}

export function useWebSocket(callbacks: WebSocketCallbacks = {}) {
  const authStore = useAuthStore()
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const reconnectTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const reconnectDelay = 3000 // 3秒重连延迟
  const heartbeatIntervalTime = 30000 // 30秒心跳间隔

  const connect = () => {
    const token = authStore.getToken()
    if (!token) {
      console.warn('无法建立WebSocket连接：缺少认证token')
      return
    }

    // 构建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/frontend?token=${encodeURIComponent(token)}`

    try {
      console.log('正在建立WebSocket连接:', wsUrl)
      const websocket = new WebSocket(wsUrl)
      ws.value = websocket

      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        if (websocket.readyState === WebSocket.CONNECTING) {
          console.error('WebSocket连接超时')
          websocket.close()
        }
      }, 10000) // 10秒超时

      websocket.onopen = () => {
        clearTimeout(connectTimeout)
        console.log('WebSocket连接已建立')
        isConnected.value = true
        callbacks.onOpen?.()

        // 启动心跳
        heartbeatInterval.value = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }))
          } else {
            if (heartbeatInterval.value) {
              clearInterval(heartbeatInterval.value)
              heartbeatInterval.value = null
            }
          }
        }, heartbeatIntervalTime)
      }

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          handleMessage(message)
        } catch (error) {
          console.error('解析WebSocket消息失败:', error)
        }
      }

      websocket.onerror = (error) => {
        console.error('WebSocket错误:', error)
        callbacks.onError?.(error)
        // 错误时也尝试重连
        if (reconnectTimer.value) {
          clearTimeout(reconnectTimer.value)
        }
        reconnectTimer.value = setTimeout(() => {
          connect()
        }, reconnectDelay)
      }

      websocket.onclose = (event) => {
        clearTimeout(connectTimeout)
        console.log('WebSocket连接已关闭', 'code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
        isConnected.value = false
        ws.value = null
        callbacks.onClose?.()

        // 清理心跳
        if (heartbeatInterval.value) {
          clearInterval(heartbeatInterval.value)
          heartbeatInterval.value = null
        }

        // 如果不是正常关闭（code 1000），尝试重连
        if (event.code !== 1000) {
          console.log(`WebSocket异常关闭 (code: ${event.code})，${reconnectDelay / 1000}秒后尝试重连...`)
          // 尝试重连
          if (reconnectTimer.value) {
            clearTimeout(reconnectTimer.value)
          }
          reconnectTimer.value = setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      }
    } catch (error) {
      console.error('建立WebSocket连接失败:', error)
      callbacks.onError?.(error as Event)
    }
  }

  const disconnect = () => {
    // 清理重连定时器
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value)
      reconnectTimer.value = null
    }

    // 清理心跳定时器
    if (heartbeatInterval.value) {
      clearInterval(heartbeatInterval.value)
      heartbeatInterval.value = null
    }

    // 关闭WebSocket连接
    if (ws.value) {
      ws.value.close()
      ws.value = null
      isConnected.value = false
    }
  }

  const handleMessage = (message: WebSocketMessage) => {
    if (message.type === 'pong') {
      // 心跳响应，无需处理
      return
    }

    if (message.type === 'metrics_update' && message.data) {
      const data = message.data as {
        server_id?: string
        cpu_usage?: number
        memory_usage?: number
        disk_usage?: number
        network_upload?: number
        network_download?: number
        uptime?: string
      }
          if (data.server_id) {
            callbacks.onMetricsUpdate?.({
              server_id: data.server_id,
              cpu_usage: typeof data.cpu_usage === 'number' ? data.cpu_usage : undefined,
              memory_usage: typeof data.memory_usage === 'number' ? data.memory_usage : undefined,
              disk_usage: typeof data.disk_usage === 'number' ? data.disk_usage : undefined,
              network_upload: typeof data.network_upload === 'number' ? data.network_upload : undefined,
              network_download: typeof data.network_download === 'number' ? data.network_download : undefined,
              uptime: typeof data.uptime === 'string' ? data.uptime : undefined,
            })
          }
        } else if (message.type === 'metrics_realtime' && message.data) {
          const data = message.data as {
            server_id?: string
            timestamp?: number
            cpu_usage?: number
            memory_usage?: number
            disk_usage?: number
            network_upload?: number
            network_download?: number
          }
          if (data.server_id && data.timestamp) {
            callbacks.onMetricsRealtime?.({
              server_id: data.server_id,
              timestamp: data.timestamp,
              cpu_usage: typeof data.cpu_usage === 'number' ? data.cpu_usage : undefined,
              memory_usage: typeof data.memory_usage === 'number' ? data.memory_usage : undefined,
              disk_usage: typeof data.disk_usage === 'number' ? data.disk_usage : undefined,
              network_upload: typeof data.network_upload === 'number' ? data.network_upload : undefined,
              network_download: typeof data.network_download === 'number' ? data.network_download : undefined,
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

