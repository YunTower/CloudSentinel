import { requester } from '@/utils/requester.ts'

export default {
  login: (type: 'admin' | 'guest', password: string, username?: string, remember?: boolean) =>
    requester.Post('/auth/login', { type, password, username, remember }),
  logout: () => requester.Post('/auth/logout'),
  checkLogin: () => requester.Get('/auth/login/check'),
}
