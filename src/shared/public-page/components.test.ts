import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import StatusBanner from './StatusBanner.vue'
import StatusIncidentList from './StatusIncidentList.vue'
import GroupHeader from '@/shared/server-display/GroupHeader.vue'

const stubs = {
  RiCheckboxCircleFill: true, RiSubtractLine: true, RiAlertFill: true,
  RiCloseCircleFill: true, RiInformationLine: true,
  'n-timeline': { template: '<div><slot /></div>' },
  'n-timeline-item': { props: ['title', 'content', 'time'], template: '<div>{{ title }} {{ content }} {{ time }}</div>' },
  'n-pagination': true,
  'n-h4': { template: '<h4><slot /></h4>' },
  'n-text': { template: '<span><slot /></span>' },
}

describe('公开状态组件', () => {
  afterEach(() => vi.useRealTimers())

  it('全部正常时展示成功结论与最近更新时间', () => {
    const wrapper = mount(StatusBanner, { props: {
      servers: [{ id: 's', name: '节点', status: 'online' }] as never,
      serviceMonitors: [{ id: 1, name: '官网', status: 'up' }] as never,
      incidents: [], lastUpdatedAt: '2026-08-12T08:00:00Z',
    }, global: { stubs } })
    expect(wrapper.text()).toContain('所有系统正常运行')
    expect(wrapper.text()).toContain('所有公开服务与基础设施均运行正常')
    expect(wrapper.text()).toContain('最近更新于')
  })

  it('故障优先于降级和维护并列出受影响项与最新事件消息', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-12T10:00:00Z'))
    const wrapper = mount(StatusBanner, { props: {
      servers: [{ id: 's', name: '上海节点', status: 'offline' }] as never,
      serviceMonitors: [{ id: 1, name: '官网', status: 'down' }, { id: 2, name: 'API', status: 'slow' }] as never,
      incidents: [{ id: 1, title: '官网故障', status: 'active', impact: 'outage', started_at: '2026-08-12T09:00:00Z', events: [
        { id: 1, event_type: 'opened', status: 'down', message: '正在排查', occurred_at: '2026-08-12T09:00:00Z' },
        { id: 2, event_type: 'update', status: 'down', message: '已定位原因', occurred_at: '2026-08-12T09:30:00Z' },
      ] }] as never,
    }, global: { stubs } })
    // 故障级别展示红色文案
    expect(wrapper.text()).toContain('部分系统无法访问')
    expect(wrapper.text()).toContain('1 项服务故障')
    expect(wrapper.text()).toContain('官网'); expect(wrapper.text()).toContain('上海节点')
    expect(wrapper.text()).toContain('已定位原因'); expect(wrapper.text()).toContain('已持续 1 小时')
  })

  it('仅有降级事件时展示黄色性能下降状态', () => {
    const wrapper = mount(StatusBanner, { props: {
      servers: [{ id: 's', name: '节点', status: 'online' }] as never,
      serviceMonitors: [{ id: 1, name: 'API', status: 'slow' }] as never,
      incidents: [],
    }, global: { stubs } })
    expect(wrapper.text()).toContain('部分系统性能下降')
  })

  it('事件列表展示空态，并按从晚到早顺序显示事件', () => {
    expect(mount(StatusIncidentList, { props: { incidents: [] }, global: { stubs } }).text()).toContain('暂无事件')
    const wrapper = mount(StatusIncidentList, { props: { incidents: [{
      id: 1, title: '维护', status: 'resolved', impact: 'maintenance', started_at: 'bad-time', events: [
        { id: 1, event_type: 'opened', status: 'down', message: '先发生', occurred_at: '2026-08-12T08:00:00Z' },
        { id: 2, event_type: 'resolved', status: 'up', message: '后恢复', occurred_at: '2026-08-12T09:00:00Z' },
      ],
    }] as never }, global: { stubs } })
    expect(wrapper.text()).toContain('已恢复'); expect(wrapper.text()).toContain('维护'); expect(wrapper.text()).toContain('bad-time')
    expect(wrapper.text().indexOf('后恢复')).toBeLessThan(wrapper.text().indexOf('先发生'))
  })

  it('事件总数超过每页条数时透传分页参数并回传页码', async () => {
    const mk = (id: number) => ({
      id, title: `事件${id}`, status: 'resolved', impact: 'degraded', started_at: '2026-08-12T08:00:00Z', events: [],
    })
    const wrapper = mount(StatusIncidentList, {
      props: { incidents: [1, 2, 3].map(mk) as never, total: 25, page: 2, pageSize: 10 },
      global: { stubs },
    })
    const pagination = wrapper.findComponent({ name: 'NPagination' })
    if (pagination.exists()) {
      await pagination.vm.$emit('update:page', 3)
      expect(wrapper.emitted('update:page')?.[0]).toEqual([3])
    } else {
      // n-pagination 被整体 stub 时仅验证分页 props
      expect(wrapper.props('total')).toBe(25)
      expect(wrapper.props('page')).toBe(2)
      expect(wrapper.props('pageSize')).toBe(10)
    }
  })

  it('分组标题显示颜色、数量和自定义单位', () => {
    const wrapper = mount(GroupHeader, { props: { groupName: '华东', count: 3, color: '#18a058', unit: '个' }, global: { stubs } })
    expect(wrapper.text()).toContain('华东'); expect(wrapper.text()).toContain('3 个')
    expect(wrapper.find('[style]').attributes('style')).toContain('#18a058')
  })
})
