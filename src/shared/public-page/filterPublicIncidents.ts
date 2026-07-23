import type { PublicPageV1 } from '@/shared/types/settings/public-pages'

/** 是否为独立事件页（仅含 incidents 块） */
export const isIncidentsOnlyPage = (page: PublicPageV1): boolean => {
  const blocks = page.blocks || []
  return blocks.length > 0 && blocks.every((b) => b.type === 'incidents')
}

/** 解析事件页对应的状态页 scope id（用于手动事件 page_ids 绑定） */
export const resolveIncidentScopePageId = (
  page: PublicPageV1,
  pages: PublicPageV1[] = [],
): string => {
  if (!isIncidentsOnlyPage(page)) return page.id

  const path = page.path.replace(/\/+$/, '')
  if (path === '/public/incidents') {
    return pages.find((p) => p.path === '/public')?.id || page.id
  }
  if (path.endsWith('/incidents')) {
    const statusPath = path.slice(0, -'/incidents'.length) || '/public'
    return pages.find((p) => p.path === statusPath)?.id || page.id
  }
  return page.id
}

export const companionIncidentsPath = (statusPath: string): string => {
  const base = statusPath.replace(/\/+$/, '') || '/public'
  return base === '/public' ? '/public/incidents' : `${base}/incidents`
}
