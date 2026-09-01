import DOMPurify from 'dompurify'
import { marked } from 'marked'

import { isSafeLinkHref } from './safeLink'

// 双层净化：
// 1) 自研白名单 sanitizer 始终执行（在任何 DOM 实现下都可用，含 happy-dom 测试环境）；
// 2) DOMPurify 在受支持的环境（真实浏览器）中叠加执行，覆盖 mXSS、
//    SVG/MathML、注释节点等自研实现难以穷举的边角情况。

const ALLOWED_TAGS = new Set([
  'a',
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  th: new Set(['colspan', 'rowspan']),
  td: new Set(['colspan', 'rowspan']),
}

const isSafeHref = (href: string) => href === href.trim() && isSafeLinkHref(href)

const fallbackSanitizeHtml = (dirtyHtml: string) => {
  const doc = new DOMParser().parseFromString(dirtyHtml, 'text/html')

  const walk = (element: Element) => {
    const children = Array.from(element.children)
    for (const child of children) {
      const tagName = child.tagName.toLowerCase()

      if (!ALLOWED_TAGS.has(tagName)) {
        const textNode = doc.createTextNode(child.textContent || '')
        child.replaceWith(textNode)
        continue
      }

      const allowedAttrs = ALLOWED_ATTRS[tagName] || new Set<string>()
      for (const attr of Array.from(child.attributes)) {
        const attrName = attr.name.toLowerCase()
        if (!allowedAttrs.has(attrName)) {
          child.removeAttribute(attr.name)
        }
      }

      if (tagName === 'a') {
        const href = child.getAttribute('href') || ''
        if (!isSafeHref(href)) {
          child.removeAttribute('href')
        }
        child.setAttribute('target', '_blank')
        child.setAttribute('rel', 'noopener noreferrer nofollow')
      }

      walk(child)
    }
  }

  walk(doc.body)
  return doc.body.innerHTML
}

const dompurifySanitizeHtml = (dirtyHtml: string): string | null => {
  try {
    if (!DOMPurify.isSupported) return null
    return DOMPurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'colspan', 'rowspan'],
      FORBID_ATTR: ['style'],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    })
  } catch {
    return null
  }
}

export const renderMarkdownSafe = (markdown: string): string => {
  const parsed = marked.parse(markdown || '') as string
  const fallback = fallbackSanitizeHtml(parsed)
  const purified = dompurifySanitizeHtml(fallback)
  const html = purified ?? fallback
  // 统一外链行为：新窗口打开并去除 opener
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const a of Array.from(doc.body.querySelectorAll('a'))) {
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer nofollow')
  }
  return doc.body.innerHTML
}
