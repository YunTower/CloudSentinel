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
  private maxReconnectAttempts = 3 // 降低重连次数
  private reconnectAttempts = 0
  private isConnecting = false
  private isManualDisconnect = false
  private shouldReconnect = true // 控制是否应该重连
  private tokenInvalid = false // 标记 token 是否无效
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
    // 如果 token 已标记为无效，不重连
    if (this.tokenInvalid) {
      console.warn('[WebSocketManager] Token 无效，停止连接')
      return
    }

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

    // 如果不应该重连，停止
    if (!this.shouldReconnect) {
      console.log('[WebSocketManager] 重连已禁用，停止连接')
      return
    }

    // 如果超过最大重连次数，停止重连
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocketManager] 重连次数已达上限 (${this.maxReconnectAttempts})，停止重连`)
      this.shouldReconnect = false
      this.broadcastError(new Error('WebSocket重连次数已达上限'))
      return
    }

    try {
      this.isConnecting = true

      // 开发环境直接连接后端，生产环境使用相对路径
      const isDev = import.meta.env.DEV
      let wsUrl: string

      if (isDev) {
        // 开发环境
        wsUrl = `ws://127.0.0.1:3000/ws/frontend?token=${encodeURIComponent(token)}`
      } else {
        // 生产环境
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        wsUrl = `${protocol}//${host}/api/ws/frontend?token=${encodeURIComponent(token)}`
      }

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
        console.log(`[WebSocketManager] 当前注册的消息处理器数量: ${this.messageHandlers.length}`)
        console.log(`[WebSocketManager] 当前注册的回调数量: ${this.callbacks.size}`)
        this.isConnected.value = true
        this.reconnectAttempts = 0
        this.tokenInvalid = false // 连接成功，重置 token 无效标志
        this.shouldReconnect = true // 重新启用重连
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
          console.log('[WebSocketManager] 收到消息:', message.type, message)

          // 检查是否是错误消息（token 无效）
          if (message.type === 'error' && message.status === 'error') {
            const errorMessage = message.message || ''
            if (
              errorMessage.includes('Token无效') ||
              errorMessage.includes('Token过期') ||
              errorMessage.includes('token') ||
              errorMessage.includes('Token')
            ) {
              console.error('[WebSocketManager] Token 无效或已过期，停止重连:', errorMessage)
              this.tokenInvalid = true
              this.shouldReconnect = false
              this.broadcastError(new Error(errorMessage))
              // 关闭连接，不再重连
              websocket.close(1000, 'Token invalid')
              return
            }
          }

          // 检查是否有注册的消息处理器
          if (this.messageHandlers.length === 0) {
            console.warn(
              '[WebSocketManager] 收到消息但没有注册的消息处理器，消息类型:',
              message.type,
            )
          } else {
            console.log(`[WebSocketManager] 广播消息给 ${this.messageHandlers.length} 个处理器`)
          }

          // 广播给所有监听器
          this.messageHandlers.forEach((handler, index) => {
            try {
              console.log(
                `[WebSocketManager] 调用处理器 ${index + 1}/${this.messageHandlers.length}`,
              )
              handler(message)
            } catch (error) {
              console.error('[WebSocketManager] 消息处理错误:', error)
            }
          })
        } catch (error) {
          console.error('[WebSocketManager] 解析WebSocket消息失败:', error, event.data)
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

        // 如果 token 无效，不重连
        if (this.tokenInvalid) {
          console.log('[WebSocketManager] Token 无效，不尝试重连')
          return
        }

        // 如果不应该重连，直接返回
        if (!this.shouldReconnect) {
          console.log('[WebSocketManager] 重连已禁用，不尝试重连')
          return
        }

        // 如果不是正常关闭（code 1000），尝试重连
        if (event.code !== 1000) {
          this.reconnectAttempts++
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // 指数退避：3秒、6秒、9秒
            const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3)
            console.log(
              `[WebSocketManager] WebSocket异常关闭，${delay / 1000}秒后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
            )
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer)
            }
            this.reconnectTimer = setTimeout(() => {
              // 再次检查状态，避免重复连接
              if (this.shouldReconnect && !this.tokenInvalid) {
                this.connect(token)
              }
            }, delay)
          } else {
            console.error(
              `[WebSocketManager] 重连次数已达上限 (${this.maxReconnectAttempts})，停止重连。请检查后端服务是否正常运行。`,
            )
            this.shouldReconnect = false
            this.broadcastError(
              new Error('WebSocket连接失败：已达最大重连次数，请检查网络连接或联系管理员'),
            )
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
    this.shouldReconnect = false

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

  // 重置 token 无效标志（用于重新登录后）
  resetTokenInvalid(): void {
    this.tokenInvalid = false
    this.shouldReconnect = true
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
