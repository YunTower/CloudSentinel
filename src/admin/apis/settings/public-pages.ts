import { requester } from '@/admin/utils/requester.ts'
import type { ApiResponse } from '@/shared/types/settings/api'
import type { PublicPagesConfigV1 } from '@/shared/types/settings/public-pages'

export default {
  getPublicPagesSettings: () =>
    requester.Get<ApiResponse<PublicPagesConfigV1>>('/settings/public-pages'),
  savePublicPagesSettings: (settings: PublicPagesConfigV1) =>
    requester.Patch<ApiResponse<PublicPagesConfigV1>>('/settings/public-pages', settings),
}
