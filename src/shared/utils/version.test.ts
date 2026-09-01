import { describe, expect, it } from 'vitest'

import {
  compareVersions,
  formatBytes,
  formatSpeed,
  getProgressBarColor,
  getProgressTextColor,
  getStatusSeverity,
  getStatusText,
  getVersionTypeConfig,
  hasAgentUpdate,
  hasUpdate,
  isNoLatestVersionResponse,
  parseVersion,
} from './version'

describe('通用状态与数值显示', () => {
  it('映射状态文案、严重级别和阈值颜色', () => {
    expect(getStatusText('online')).toBe('在线')
    expect(getStatusText('other')).toBe('未知')
    expect(getStatusSeverity('error')).toBe('danger')
    expect(getStatusSeverity('other')).toBe('secondary')
    expect([getProgressBarColor(69.9), getProgressBarColor(70), getProgressBarColor(90)]).toEqual([
      '#22c55e', '#f97316', '#ef4444',
    ])
    expect(getProgressTextColor(90)).toContain('red')
  })

  it('格式化速度和容量', () => {
    expect(formatSpeed(0)).toBe('0 B/s')
    expect(formatSpeed(1536)).toBe('1.5 KB/s')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024 ** 3)).toBe('1 GB')
  })
})

describe('版本比较与更新判断', () => {
  it.each([
    ['1.2.0', '1.1.9', 1],
    ['1.0', '1.0.0', 0],
    ['1.0.0', '1.0.1', -1],
  ])('比较 %s 与 %s 得到 %i', (left, right, expected) => {
    expect(compareVersions(left, right)).toBe(expected)
  })

  it('解析 v 前缀、预发布别名和序号', () => {
    expect(parseVersion('v1.2.3-rc.4')).toEqual({
      version: '1.2.3', versionType: 'beta', preReleaseNum: 4,
    })
    expect(parseVersion('1.2.3')).toEqual({
      version: '1.2.3', versionType: 'release', preReleaseNum: 0,
    })
    expect(getVersionTypeConfig('alpha').label).toBe('测试版')
  })

  it.each([
    ['1.0.0', '1.0.1', true],
    ['1.0.1', '1.0.0', false],
    ['1.0.0-beta.1', '1.0.0-beta.2', true],
    ['1.0.0-beta.2', '1.0.0-beta.1', false],
    ['1.0.0-beta.2', '1.0.0-release', true],
    ['1.0.0-release', '1.0.0-beta.9', false],
  ])('从 %s 到 %s 的更新判断为 %s', (current, latest, expected) => {
    expect(hasUpdate(current, latest)).toBe(expected)
  })

  it('缺少版本时不更新，并识别无最新版本响应', () => {
    expect(hasUpdate(undefined, '1.0.0')).toBe(false)
    expect(hasAgentUpdate('1.0.0', '1.1.0')).toBe(true)
    expect(isNoLatestVersionResponse({ code: 'LATEST_VERSION_NOT_FOUND' })).toBe(true)
    expect(isNoLatestVersionResponse(undefined)).toBe(false)
  })
})
