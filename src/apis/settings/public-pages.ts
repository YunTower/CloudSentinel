import { requester } from '@/utils/requester.ts'
import type { ApiResponse } from '@/types/settings/api'
import type { PublicPagesConfigV1 } from '@/types/settings/public-pages'

export default {
  getPublicPagesSettings: () =>
    requester.Get<ApiResponse<PublicPagesConfigV1>>('/settings/public-pages'),
  savePublicPagesSettings: (settings: PublicPagesConfigV1) =>
    requester.Patch<ApiResponse<null>>('/settings/public-pages', settings),
}
