import { createRouter, createWebHashHistory } from 'vue-router'
import { setupRouteGuards } from './guards'
import { RiHome5Line, RiServerLine, RiSettings4Line } from '@remixicon/vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('@/views/overview/OverviewView.vue'),
      meta: {
        title: '总览',
        icon: RiHome5Line,
        roles: ['guest', 'admin'],
      },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/LoginView.vue'),
      meta: {
        title: '登录',
        showToMenu: false,
        roles: ['*'],
      },
    },
    {
      path: '/servers',
      name: 'manager',
      component: () => import('@/views/manager/servers/ServersView.vue'),
      meta: {
        title: '服务器',
        icon: RiServerLine,
        roles: ['admin'],
      },
    },
    {
      path: '/servers/:id',
      name: 'serverDetail',
      component: () => import('@/views/manager/servers/DetailView.vue'),
      meta: {
        title: '服务器详情',
        showToMenu: false,
        roles: ['admin'],
      },
    },
    // 监控面板已移除
    {
      path: '/settings',
      name: 'settings',
      meta: {
        title: '设置',
        icon: RiSettings4Line,
        roles: ['admin'],
      },
      children: [
        {
          path: '/settings/panel',
          name: 'panel',
          component: () => import('@/views/settings/panel/PanelView.vue'),
          meta: {
            title: '面板设置',
            roles: ['admin'],
          },
        },
        {
          path: '/settings/permissions',
          name: 'permissions',
          component: () => import('@/views/settings/permissions/PermissionsView.vue'),
          meta: {
            title: '权限配置',
            roles: ['admin'],
          },
        },
        {
          path: '/settings/alerts',
          name: 'alerts',
          component: () => import('@/views/settings/alerts/AlertsView.vue'),
          meta: {
            title: '告警设置',
            roles: ['admin'],
          },
        },
      ],
    },
  ],
})

setupRouteGuards(router)

export default router
