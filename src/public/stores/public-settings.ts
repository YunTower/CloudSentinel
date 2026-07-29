import { computed, ref } from 'vue'
import { publicApi } from '@/public/apis/public'
import type { PublicSettingsResponse } from '@/shared/types/auth'

const settings = ref<PublicSettingsResponse['data'] | null>(null)
let activePath: string | null = null
const loadingByPath = new Map<string, Promise<PublicSettingsResponse['data']>>()

export function usePublicSettings() {
  const load = async (path?: string): Promise<PublicSettingsResponse['data']> => {
    const normalizedPath = path?.trim() || ''
    if (settings.value && activePath === normalizedPath) return settings.value

    activePath = normalizedPath
    settings.value = null

    let loading = loadingByPath.get(normalizedPath)
    if (!loading) {
      loading = (async () => {
        const response = await publicApi.getSettings(
          normalizedPath ? { path: normalizedPath } : undefined,
        )
        if (!response.status || !response.data) {
          throw new Error(response.message || '获取公开设置失败')
        }
        return response.data
      })()
      loadingByPath.set(normalizedPath, loading)
    }

    try {
      const data = await loading
      if (activePath === normalizedPath) settings.value = data
      return data
    } finally {
      if (loadingByPath.get(normalizedPath) === loading) {
        loadingByPath.delete(normalizedPath)
      }
    }
  }

  return { settings: computed(() => settings.value), load }
}
