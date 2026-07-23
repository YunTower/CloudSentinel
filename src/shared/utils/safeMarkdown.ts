import { marked } from 'marked'

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

const isSafeHref = (href: string) => {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('/') ||
    href.startsWith('#')
  )
}

const sanitizeHtml = (dirtyHtml: string) => {
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

export const renderMarkdownSafe = (markdown: string): string => {
  const parsed = marked.parse(markdown || '') as string
  return sanitizeHtml(parsed)
}
