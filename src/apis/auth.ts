import { requester } from '@/utils/requester.ts'

// 登录请求
const loginMethod = (
  type: 'admin',
  password: string,
  username?: string,
  remember?: boolean,
) => {
  const method = requester.Post('/auth/login', { type, password, username, remember })
  method.meta = {
    authRole: 'login',
  }
  return method
}

// 登出请求
const logoutMethod = () => {
  const method = requester.Post('/auth/logout')
  method.meta = {
    authRole: 'logout',
  }
  return method
}

// 会话刷新请求
const refreshTokenMethod = () => {
  const method = requester.Post('/auth/refresh')
  method.meta = {
    authRole: 'refreshToken',
  }
  return method
}

// 检查登录状态请求
const checkLoginMethod = () => {
  const method = requester.Get('/auth/check')
  return method
}

export default {
  login: loginMethod,
  logout: logoutMethod,
  checkLogin: checkLoginMethod,
  refreshToken: refreshTokenMethod,
}
