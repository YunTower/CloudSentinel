import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authStore, manager, registered } = vi.hoisted(() => {
  const registered = { handler: undefined as ((message: unknown) => void) | undefined }
  return {
    authStore: { isAuthenticated: true },
    registered,
    manager: {
      registerCallbacks: vi.fn(() => vi.fn()),
      registerMessageHandler: vi.fn((handler: (message: unknown) => void) => { registered.handler = handler; return vi.fn() }),
      connect: vi.fn(),
      getIsConnected: vi.fn(() => ({ value: true })),
    },
  }
})
vi.mock('@/admin/stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('@/admin/services/websocket-manager', () => ({ default: manager }))

import { useWebSocket } from './useWebSocket'

describe('组件 WebSocket 消息适配', () => {
  beforeEach(() => {
    vi.clearAllMocks(); registered.handler = undefined; authStore.isAuthenticated = true
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('未认证时不注册也不连接', () => {
    authStore.isAuthenticated = false
    useWebSocket().connect()
    expect(manager.connect).not.toHaveBeenCalled(); expect(manager.registerMessageHandler).not.toHaveBeenCalled()
  })

  it('将指标消息展平并过滤非数字字段', () => {
    const onMetricsUpdate = vi.fn(); const onMetricsRealtime = vi.fn()
    useWebSocket({ onMetricsUpdate, onMetricsRealtime }).connect()
    registered.handler?.({ type: 'metrics_update', data: {
      server_id: 's1', uptime: '1天', metrics: { cpu_usage: 12, memory_usage: 'bad', network_upload: 3 },
    } })
    expect(onMetricsUpdate).toHaveBeenCalledWith({
      server_id: 's1', cpu_usage: 12, memory_usage: undefined, disk_usage: undefined,
      network_upload: 3, network_download: undefined, uptime: '1天',
    })
    registered.handler?.({ type: 'metrics_realtime', data: {
      server_id: 's1', timestamp: 123, metrics: { disk_read: 4, disk_write: 5 },
    } })
    expect(onMetricsRealtime).toHaveBeenCalledWith(expect.objectContaining({ server_id: 's1', timestamp: 123, disk_read: 4, disk_write: 5 }))
  })

  it('分派系统、Swap、状态、进程和 GPU 更新', () => {
    const callbacks = {
      onSystemInfoUpdate: vi.fn(), onSwapInfoUpdate: vi.fn(), onServerStatusUpdate: vi.fn(),
      onProcessInfoUpdate: vi.fn(), onGPUInfoUpdate: vi.fn(),
    }
    useWebSocket(callbacks).connect()
    registered.handler?.({ type: 'system_info_update', data: { server_id: 's', data: { os: 'linux' } } })
    registered.handler?.({ type: 'swap_info_update', data: { server_id: 's', swap: { swap_total: 1 } } })
    registered.handler?.({ type: 'server_status_update', data: { server_id: 's', status: 'online' } })
    registered.handler?.({ type: 'process_info_update', data: { server_id: 's', data: { nginx: { running: true } } } })
    registered.handler?.({ type: 'gpu_info_update', data: { server_id: 's', gpuInfo: { available: true, gpus: [] } } })
    expect(callbacks.onSystemInfoUpdate).toHaveBeenCalledWith({ server_id: 's', data: { os: 'linux' } })
    expect(callbacks.onSwapInfoUpdate).toHaveBeenCalledWith({ server_id: 's', swap: { swap_total: 1 } })
    expect(callbacks.onServerStatusUpdate).toHaveBeenCalledWith({ server_id: 's', status: 'online' })
    expect(callbacks.onProcessInfoUpdate).toHaveBeenCalledTimes(1); expect(callbacks.onGPUInfoUpdate).toHaveBeenCalledTimes(1)
  })

  it('断开时注销回调与消息处理器但保留全局连接', () => {
    const unregisterCallbacks = vi.fn(); const unregisterHandler = vi.fn()
    manager.registerCallbacks.mockReturnValueOnce(unregisterCallbacks)
    manager.registerMessageHandler.mockReturnValueOnce(unregisterHandler)
    const socket = useWebSocket(); socket.connect(); socket.disconnect(); socket.disconnect()
    expect(unregisterCallbacks).toHaveBeenCalledTimes(1); expect(unregisterHandler).toHaveBeenCalledTimes(1)
    expect(socket.isConnected.value).toBe(true)
  })
})
