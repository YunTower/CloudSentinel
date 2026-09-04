export const companionIncidentsPath = (statusPath: string): string => {
  const base = statusPath.replace(/\/+$/, '') || '/public'
  return base === '/public' ? '/public/incidents' : `${base}/incidents`
}
