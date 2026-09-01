import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static instances: FakeWebSocket[] = []
  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  closeCalls: Array<[number | undefined, string | undefined]> = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string) { this.sent.push(data) }
  close(code?: number, reason?: string) { this.closeCalls.push([code, reason]) }
  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.() }
  message(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }) }
  closed(code = 1000, reason = '') { this.readyState = 3; this.onclose?.({ code, reason }) }
}

async function freshManager() {
  vi.resetModules()
  return (await import('./websocket-manager')).default
}

describe('全局 WebSocket 管理器', () => {
  beforeEach(() => {
    vi.useFakeTimers(); FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('使用同源 API 地址，认证成功后建立连接并按周期发送心跳', async () => {
    const manager = await freshManager()
    const onOpen = vi.fn(); manager.registerCallbacks('test', { onOpen })
    manager.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toBe(`ws://${window.location.host}/api/ws/frontend`)
    const ws = FakeWebSocket.instances[0]; ws.open()
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'auth', data: {} })
    expect(manager.getIsConnected().value).toBe(false)
    ws.message({ type: 'auth_success' })
    expect(manager.getIsConnected().value).toBe(true); expect(onOpen).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(30_000)
    expect(JSON.parse(ws.sent[ws.sent.length - 1] ?? '')).toEqual({ type: 'ping' })
    manager.disconnect()
  })

  it('向消息处理器广播并允许注销', async () => {
    const manager = await freshManager(); const handler = vi.fn(); const unregister = manager.registerMessageHandler(handler)
    manager.connect(); const ws = FakeWebSocket.instances[0]; ws.open(); ws.message({ type: 'metrics_update', data: { server_id: '1' } })
    expect(handler).toHaveBeenCalledTimes(1)
    unregister(); ws.message({ type: 'metrics_update', data: { server_id: '2' } })
    expect(handler).toHaveBeenCalledTimes(1); manager.disconnect()
  })

  it('令牌失效时广播错误、关闭连接并停止重连', async () => {
    const manager = await freshManager(); const onError = vi.fn(); manager.registerCallbacks('test', { onError })
    manager.connect(); const ws = FakeWebSocket.instances[0]; ws.open()
    ws.message({ type: 'error', status: 'error', message: 'Token已失效' })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token已失效' }))
    expect(ws.closeCalls).toContainEqual([1000, 'Token invalid'])
    ws.closed(1006, 'lost'); vi.advanceTimersByTime(30_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    manager.resetTokenInvalid(); manager.connect(); expect(FakeWebSocket.instances).toHaveLength(2)
    manager.disconnect()
  })

  it('异常关闭按退避时间重连，手动断开不重连', async () => {
    const manager = await freshManager(); manager.connect(); const first = FakeWebSocket.instances[0]; first.open(); first.closed(1006, 'network')
    vi.advanceTimersByTime(2_999); expect(FakeWebSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1); expect(FakeWebSocket.instances).toHaveLength(2)
    manager.disconnect(); FakeWebSocket.instances[1].closed(1006, 'manual'); vi.advanceTimersByTime(30_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('连接超时主动关闭正在连接的套接字', async () => {
    const manager = await freshManager(); manager.connect(); const ws = FakeWebSocket.instances[0]
    vi.advanceTimersByTime(10_000)
    expect(ws.closeCalls).toContainEqual([undefined, undefined]); manager.disconnect()
  })
})
