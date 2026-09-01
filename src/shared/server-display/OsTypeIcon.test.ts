import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import OsTypeIcon from './OsTypeIcon.vue'

describe('操作系统图标', () => {
  it('使用内置精简图标集离线渲染已知系统', () => {
    const wrapper = mount(OsTypeIcon, { props: { systemName: 'Ubuntu 24.04' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').attributes('aria-label')).toBe('系统：Ubuntu 24.04')
    expect(wrapper.html()).toContain('#e95420')
  })

  it('未知系统回退到通用 Linux 图标', () => {
    const wrapper = mount(OsTypeIcon, { props: { systemName: 'Custom Linux' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').attributes('aria-label')).toBe('系统：Custom Linux')
  })
})
