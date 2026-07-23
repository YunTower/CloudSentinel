export const isSafeLinkHref = (href: string): boolean => {
  const h = String(href || '').trim()
  if (!h) return false
  return (
    h.startsWith('http://') ||
    h.startsWith('https://') ||
    h.startsWith('mailto:') ||
    h.startsWith('tel:') ||
    h.startsWith('/') ||
    h.startsWith('#')
  )
}
