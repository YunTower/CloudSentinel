import { ref } from 'vue'
import type { WebSocketCallbacks, WebSocketMessage } from '@/composables/useWebSocket'

// 全局WebSocket管理器
class WebSocketManager {
  private static instance: WebSocketManager
  private ws: WebSocket | null = null
  private isConnected = ref(false)
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private reconnectDelay = 3000
  private heartbeatIntervalTime = 30000
  private maxReconnectAttempts = 5
  private reconnectAttempts = 0
  private isConnecting = false
  private isManualDisconnect = false
  private callbacks: Map<string, WebSocketCallbacks> = new Map()
  private messageHandlers: Array<(message: WebSocketMessage) => void> = []

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  // 注册回调
  registerCallbacks(id: string, callbacks: WebSocketCallbacks): () => void {
    this.callbacks.set(id, callbacks)

    // 如果已连接，立即调用 onOpen
    if (this.isConnected.value && callbacks.onOpen) {
      callbacks.onOpen()
    }

    // 返回注销函数
    return () => {
      this.callbacks.delete(id)
      // 如果没有更多的监听器，可以断开连接
      if (this.callbacks.size === 0) {
        // 保持连接，可能稍后还会有组件需要它
      }
    }
  }

  connect(token: string): void {
    // 如果已经连接，不重复连接
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocketManager] 已连接，跳过重复连接')
      return
    }

    // 如果正在连接中，不重复连接
    if (this.isConnecting) {
      console.log('[WebSocketManager] 正在连接中，跳过重复连接')
      return
    }

    // 如果超过最大重连次数，停止重连
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[WebSocketManager] 重连次数已达上限 (${this.maxReconnectAttempts})，停止重连`,
      )
      this.broadcastError(new Error('WebSocket重连次数已达上限'))
      return
    }

    try {
      this.isConnecting = true
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/api/ws/frontend?token=${encodeURIComponent(token)}`

      console.log(
        `[WebSocketManager] 正在建立WebSocket连接 (尝试 ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}):`,
        wsUrl,
      )

      const websocket = new WebSocket(wsUrl)
      this.ws = websocket

      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        if (websocket.readyState === WebSocket.CONNECTING) {
          console.error('[WebSocketManager] WebSocket连接超时')
          websocket.close()
        }
      }, 10000)

      websocket.onopen = () => {
        clearTimeout(connectTimeout)
        this.isConnecting = false
        console.log('[WebSocketManager] WebSocket连接已建立')
        this.isConnected.value = true
        this.reconnectAttempts = 0
        this.broadcastOpen()

        // 启动心跳
        this.heartbeatInterval = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }))
          } else {
            if (this.heartbeatInterval) {
              clearInterval(this.heartbeatInterval)
              this.heartbeatInterval = null
            }
          }
        }, this.heartbeatIntervalTime)
      }

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          // 广播给所有监听器
          this.messageHandlers.forEach((handler) => {
            try {
              handler(message)
            } catch (error) {
              console.error('[WebSocketManager] 消息处理错误:', error)
            }
          })
        } catch (error) {
          console.error('[WebSocketManager] 解析WebSocket消息失败:', error)
        }
      }

      websocket.onerror = (error) => {
        console.error('[WebSocketManager] WebSocket错误:', error)
        this.broadcastError(error as Event)
      }

      websocket.onclose = (event) => {
        clearTimeout(connectTimeout)
        this.isConnecting = false
        console.log(
          '[WebSocketManager] WebSocket连接已关闭',
          'code:',
          event.code,
          'reason:',
          event.reason,
        )
        this.isConnected.value = false
        this.ws = null
        this.broadcastClose()

        // 清理心跳
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval)
          this.heartbeatInterval = null
        }

        // 如果是手动断开，不重连
        if (this.isManualDisconnect) {
          this.isManualDisconnect = false
          this.reconnectAttempts = 0
          return
        }

        // 如果不是正常关闭（code 1000），尝试重连
        if (event.code !== 1000) {
          this.reconnectAttempts++
          if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            // 指数退避
            const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3)
            console.log(
              `[WebSocketManager] WebSocket异常关闭，${delay / 1000}秒后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
            )
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer)
            }
            this.reconnectTimer = setTimeout(() => {
              this.connect(token)
            }, delay)
          } else {
            console.error(`[WebSocketManager] 重连次数已达上限 (${this.maxReconnectAttempts})，停止重连`)
            // 30秒后允许重置
            setTimeout(() => {
              this.reconnectAttempts = 0
              console.log('[WebSocketManager] 重连次数已重置，可以再次尝试连接')
            }, 30000)
          }
        } else {
          this.reconnectAttempts = 0
        }
      }
    } catch (error) {
      this.isConnecting = false
      console.error('[WebSocketManager] 建立WebSocket连接失败:', error)
      this.broadcastError(error as Event)
      // 连接失败时，也尝试重连
      this.reconnectAttempts++
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3)
        console.log(
          `[WebSocketManager] 连接失败，${delay / 1000}秒后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
        )
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
        }
        this.reconnectTimer = setTimeout(() => {
          this.connect(token)
        }, delay)
      }
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
      this.isConnected.value = false
    }

    this.reconnectAttempts = 0
  }

  getIsConnected() {
    return this.isConnected
  }

  registerMessageHandler(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.push(handler)
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) {
        this.messageHandlers.splice(index, 1)
      }
    }
  }

  private broadcastOpen(): void {
    this.callbacks.forEach((callbacks) => {
      callbacks.onOpen?.()
    })
  }

  private broadcastClose(): void {
    this.callbacks.forEach((callbacks) => {
      callbacks.onClose?.()
    })
  }

  private broadcastError(error: Event | Error): void {
    this.callbacks.forEach((callbacks) => {
      callbacks.onError?.(error)
    })
  }
}

export default WebSocketManager.getInstance()

