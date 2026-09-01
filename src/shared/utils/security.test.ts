import { describe, expect, it } from 'vitest'

import { isSafeLinkHref } from './safeLink'
import { renderMarkdownSafe } from './safeMarkdown'

describe('安全链接判断', () => {
  it.each(['https://example.com', 'http://example.com', 'mailto:a@example.com', 'tel:10086', '/docs', '#top'])(
    '允许受支持地址 %s',
    (href) => expect(isSafeLinkHref(href)).toBe(true),
  )

  it.each(['', '  ', 'javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', '//evil.example', '/\\evil.example', '/\t\\evil.example', '/\t/evil.example'])('拒绝危险或未知地址 %s', (href) => {
    expect(isSafeLinkHref(href)).toBe(false)
  })
})

describe('Markdown 安全渲染', () => {
  it('保留允许的格式并为链接增加安全属性', () => {
    const html = renderMarkdownSafe('**加粗** [官网](https://example.com)')
    expect(html).toContain('<strong>加粗</strong>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
  })

  it('移除危险协议、事件属性和不允许的 HTML 标签', () => {
    const html = renderMarkdownSafe(
      '<img src=x onerror=alert(1)>图片 <a href="javascript:alert(1)" onclick="alert(2)">链接</a><a href="//evil.example">外站</a><script>alert(3)</script>',
    )
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('//evil.example')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html).toContain('图片')
    expect(html).toContain('链接')
  })

  it('移除反斜杠网络路径链接', () => {
    const html = renderMarkdownSafe('<a href="/\\evil.example">外站</a>')
    expect(html).not.toContain('href=')
  })

  it('空内容返回空字符串', () => {
    expect(renderMarkdownSafe('')).toBe('')
  })
})
