import { computed, ref } from 'vue'
import { publicApi } from '@/public/apis/public'
import type { PublicSettingsResponse } from '@/shared/types/auth'

const settings = ref<PublicSettingsResponse['data'] | null>(null)
let loading: Promise<PublicSettingsResponse['data']> | null = null

export function usePublicSettings() {
  const load = async (): Promise<PublicSettingsResponse['data']> => {
    if (settings.value) return settings.value
    if (loading) return loading

    loading = (async () => {
      const response = await publicApi.getSettings()
      if (!response.status || !response.data) {
        throw new Error(response.message || '获取公开设置失败')
      }
      settings.value = response.data
      return response.data
    })()

    try {
      return await loading
    } finally {
      loading = null
    }
  }

  return { settings: computed(() => settings.value), load }
}
