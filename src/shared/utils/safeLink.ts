export const isSafeLinkHref = (href: string): boolean => {
  const h = String(href || '').trim()
  if (!h) return false
  // WHATWG URL 解析会忽略路径中的 TAB、LF 和 CR；先按同一规则规范化，
  // 以免 /\t\\host 一类值被当作站内路径后跳转到外站。
  const normalizedPath = h.replace(/[\t\n\r]/g, '')
  return (
    h.startsWith('http://') ||
    h.startsWith('https://') ||
    h.startsWith('mailto:') ||
    h.startsWith('tel:') ||
    (normalizedPath.startsWith('/') && !normalizedPath.startsWith('//') && !normalizedPath.startsWith('/\\')) ||
    h.startsWith('#')
  )
}
