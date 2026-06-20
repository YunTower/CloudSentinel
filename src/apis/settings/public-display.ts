import { requester } from '@/utils/requester.ts'
import type { ApiResponse } from '@/types/settings/api'
import type { PublicDisplayConfigV1 } from '@/types/settings/public-display'

export default {
  getPublicDisplaySettings: () =>
    requester.Get<ApiResponse<PublicDisplayConfigV1>>('/settings/public-display'),
  savePublicDisplaySettings: (settings: PublicDisplayConfigV1) =>
    requester.Patch<ApiResponse<null>>('/settings/public-display', settings),
}
