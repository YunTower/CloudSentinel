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
      subscribeTopics: vi.fn(),
      unsubscribeTopics: vi.fn(),
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
      server_id: 's1', uptime_seconds: 86400, metrics: { cpu_usage: 12, memory_usage: 'bad', network_upload: 3 },
    } })
    expect(onMetricsUpdate).toHaveBeenCalledWith({
      server_id: 's1', cpu_usage: 12, memory_usage: undefined, disk_usage: undefined,
      network_upload: 3, network_download: undefined, uptime_seconds: 86400,
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

  it('分派内存、磁盘、磁盘IO和网络更新', () => {
    const callbacks = {
      onMemoryInfoUpdate: vi.fn(), onDiskInfoUpdate: vi.fn(), onDiskIOUpdate: vi.fn(),
      onNetworkInfoUpdate: vi.fn(),
    }
    useWebSocket(callbacks).connect()
    registered.handler?.({ type: 'memory_info_update', data: { server_id: 's', memory: { memory_total: 8 } } })
    registered.handler?.({ type: 'disk_info_update', data: { server_id: 's', disks: [{ disk_name: 'sda' }] } })
    registered.handler?.({ type: 'disk_io_update', data: { server_id: 's', disk_io: { read_speed: 1, write_speed: 2 } } })
    registered.handler?.({ type: 'network_info_update', data: { server_id: 's', network: { upload_speed: 3 } } })
    expect(callbacks.onMemoryInfoUpdate).toHaveBeenCalledWith({ server_id: 's', memory: { memory_total: 8 } })
    expect(callbacks.onDiskInfoUpdate).toHaveBeenCalledWith({ server_id: 's', disks: [{ disk_name: 'sda' }] })
    expect(callbacks.onDiskIOUpdate).toHaveBeenCalledWith({ server_id: 's', disk_io: { read_speed: 1, write_speed: 2 } })
    expect(callbacks.onNetworkInfoUpdate).toHaveBeenCalledWith({ server_id: 's', network: { upload_speed: 3 } })
  })

  it('断开时注销回调与消息处理器但保留全局连接', () => {
    const unregisterCallbacks = vi.fn(); const unregisterHandler = vi.fn()
    manager.registerCallbacks.mockReturnValueOnce(unregisterCallbacks)
    manager.registerMessageHandler.mockReturnValueOnce(unregisterHandler)
    const socket = useWebSocket(); socket.connect(); socket.disconnect(); socket.disconnect()
    expect(unregisterCallbacks).toHaveBeenCalledTimes(1); expect(unregisterHandler).toHaveBeenCalledTimes(1)
    expect(socket.isConnected.value).toBe(true)
  })

  it('subscribe/unsubscribe 委托给全局管理器', () => {
    const socket = useWebSocket()
    socket.subscribe(['servers', 'server:s1'])
    expect(manager.subscribeTopics).toHaveBeenCalledWith(['servers', 'server:s1'])
    socket.unsubscribe(['server:s1'])
    expect(manager.unsubscribeTopics).toHaveBeenCalledWith(['server:s1'])
  })

  it('分派服务监测更新', () => {
    const onServiceMonitorUpdate = vi.fn()
    useWebSocket({ onServiceMonitorUpdate }).connect()
    registered.handler?.({
      type: 'service_monitor_update',
      data: { id: 4, status: 'up', response_time: 161, history_entry: { status: 'up', checked_at: 'x' } },
    })
    expect(onServiceMonitorUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, status: 'up', response_time: 161 }),
    )
    // 缺少 id/status 的消息不触发
    registered.handler?.({ type: 'service_monitor_update', data: { status: 'up' } })
    expect(onServiceMonitorUpdate).toHaveBeenCalledTimes(1)
  })
})
