import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import OsTypeIcon from './OsTypeIcon.vue'

describe('操作系统图标', () => {
  it('使用独立 SVG 资源渲染已知系统', () => {
    const wrapper = mount(OsTypeIcon, { props: { systemName: 'Ubuntu 24.04' } })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('alt')).toBe('系统：Ubuntu 24.04')
    const src = img.attributes('src') ?? ''
    expect(decodeURIComponent(src)).toContain('#e95420')
  })

  it('未知系统回退到通用 Linux 图标', () => {
    const unknown = mount(OsTypeIcon, { props: { systemName: 'Custom Linux' } })
    const fallback = mount(OsTypeIcon, { props: { systemName: 'Linux' } })
    const unknownImg = unknown.find('img')
    const fallbackImg = fallback.find('img')
    expect(unknownImg.exists()).toBe(true)
    expect(unknownImg.attributes('alt')).toBe('系统：Custom Linux')
    expect(unknownImg.attributes('src')).toBe(fallbackImg.attributes('src'))
  })
})
