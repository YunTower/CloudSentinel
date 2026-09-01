import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ServerCard from './ServerCard.vue'

const server = {
  id: 'server-1',
  name: '上海节点',
  status: 'online' as const,
  cpuUsage: 12,
  memoryUsage: 34,
  diskUsage: 56,
  cores: 4,
  location: '上海 BGP 机房',
  os: 'Ubuntu 24.04',
  architecture: 'amd64',
  networkIO: { upload: 10, download: 20 },
}

const stubs = {
  'n-card': { template: '<section><slot name="header" /><slot /></section>' },
  'n-space': { template: '<div><slot /></div>' },
  'n-tag': { template: '<span><slot /></span>' },
  'n-progress': true,
  RiArrowUpLine: true,
  RiArrowDownLine: true,
}

describe('服务器卡片', () => {
  it('遵循公开展示配置显示或隐藏服务器位置', () => {
    const visible = mount(ServerCard, {
      props: server,
      global: { stubs },
    })
    expect(visible.text()).toContain('位置')
    expect(visible.text()).toContain('上海 BGP 机房')

    const hidden = mount(ServerCard, {
      props: { ...server, displayFields: { showLocation: false } as never },
      global: { stubs },
    })
    expect(hidden.text()).not.toContain('上海 BGP 机房')
  })
})
