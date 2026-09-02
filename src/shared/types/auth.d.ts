import type { PublicPageV1 } from './settings/public-pages'

// 用户角色类型
export type UserRole = 'guest' | 'admin'

// 用户会话接口
export interface UserSession {
  id: string
  username: string
  role: UserRole
  exp: number
}

// 自定义JWT载荷接口
export interface CustomJwtPayload {
  key: string
  sub: string
  exp: number
  iat: number
  username?: string
  role?: UserRole
}

/** 公开设置中的页面元信息（不含 pages 全量列表） */
export interface PublicPagesMetaV1 {
  refreshIntervalSeconds?: number
  page?: PublicPageV1
}

// API响应类型
export interface PublicSettingsResponse {
  data: {
    panel_title?: string
    public_pages?: PublicPagesMetaV1
  }
  message: string
  status: boolean
}

// 登录响应类型
export interface LoginResponse {
  data: {
    type: 'admin' | 'guest'
    username: string
  }
  message: string
  status: boolean
}

// 检查登录状态响应类型
export interface CheckLoginResponse {
  data: {
    guard: string
    is_valid: boolean
    user_id: string
    user_type: 'admin' | 'guest'
  }
  message: string
  status: boolean
}
