import { createRouter, createWebHashHistory } from 'vue-router'
import { setupRouteGuards } from './guards'
import {
  RiAlarmWarningLine,
  RiHome5Line,
  RiRadarLine,
  RiServerLine,
  RiSettings4Line,
} from '@remixicon/vue'

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
        roles: ['admin'],
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
      path: '/public/:pathMatch(.*)*',
      name: 'publicPage',
      component: () => import('@/views/public/PublicPageView.vue'),
      meta: {
        title: '公开页面',
        layout: 'blank',
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
      path: '/monitor',
      name: 'monitor',
      component: () => import('@/views/monitor/ServiceMonitorView.vue'),
      meta: {
        title: '服务监测',
        icon: RiRadarLine,
        roles: ['admin'],
      },
    },
    {
      path: '/incidents',
      name: 'incidents',
      component: () => import('@/views/incidents/IncidentsView.vue'),
      meta: {
        title: '事件',
        icon: RiAlarmWarningLine,
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
          path: '/settings/system',
          name: 'system',
          component: () => import('@/views/settings/system/SystemSettingsView.vue'),
          meta: {
            title: '系统设置',
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
        {
          path: '/settings/public',
          name: 'public',
          component: () => import('@/views/settings/public/PublicSettingsView.vue'),
          meta: {
            title: '公开配置',
            roles: ['admin'],
          },
        },
      ],
    },
  ],
})

setupRouteGuards(router)

export default router
