import { describe, expect, it } from 'vitest'

import {
  formatOS,
  formatSpeed,
  getStatusColor,
  getStatusText,
  mapServerListItemToServerItem,
  resolveOsIconKind,
} from './utils'

describe('服务器公开展示工具', () => {
  it('按 KB/s、MB/s 和 GB/s 格式化网络速度', () => {
    expect(formatSpeed(512)).toBe('512.0KB/s')
    expect(formatSpeed(1536)).toBe('1.5MB/s')
    expect(formatSpeed(2.5 * 1024 * 1024)).toBe('2.5GB/s')
  })

  it('识别常见系统名称与兼容发行版别名', () => {
    expect(formatOS('Ubuntu 24.04 LTS')).toBe('Ubuntu')
    expect(formatOS('FreeBSD 14')).toBe('FreeBSD')
    expect(formatOS('')).toBe('')
    expect(resolveOsIconKind('Microsoft Windows Server')).toBe('windows')
    expect(resolveOsIconKind('Pop!_OS')).toBe('ubuntu')
    expect(resolveOsIconKind(undefined, 'Rocky Linux 9')).toBe('rockylinux')
    expect(resolveOsIconKind('unknown')).toBe('linux')
  })

  it('映射已知和未知状态的文案与颜色', () => {
    expect(getStatusText('maintenance')).toBe('维护中')
    expect(getStatusText('unknown')).toBe('未知')
    expect(getStatusColor('online')).toContain('green')
    expect(getStatusColor('unknown')).toBe('text-surface-400')
  })

  it('把列表响应转换为展示模型并为无效字段设置安全默认值', () => {
    const result = mapServerListItemToServerItem({
      id: 'server-1',
      name: '节点一',
      status: 'unexpected',
      cores: '8',
      uptime: '',
      location: '上海',
      os: 'Linux',
      architecture: 'amd64',
      metrics: {
        cpu_usage: 12.5,
        memory_usage: 'bad',
        disk_usage: 50,
        network_upload: 3,
        network_download: 4,
      },
      swap: { swap_usage_percent: 25 },
      total_storage: '500GB',
      group_id: 2,
      billing: undefined,
      network: undefined,
    } as never)

    expect(result).toMatchObject({
      id: 'server-1',
      status: 'offline',
      cores: 0,
      cpuUsage: 12.5,
      memoryUsage: 0,
      diskUsage: 50,
      swapUsage: 25,
      networkIO: { upload: 3, download: 4 },
      billing: {},
      network: {},
    })
  })
})
