import { requester } from '@/admin/utils/requester.ts'
import type { ApiResponse } from '@/shared/types/settings/api'
import type { PublicDisplayConfigV1 } from '@/shared/types/settings/public-display'

export default {
  getPublicDisplaySettings: () =>
    requester.Get<ApiResponse<PublicDisplayConfigV1>>('/settings/public-display'),
  savePublicDisplaySettings: (settings: PublicDisplayConfigV1) =>
    requester.Patch<ApiResponse<PublicDisplayConfigV1>>('/settings/public-display', settings),
}
