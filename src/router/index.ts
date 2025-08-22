import { createRouter, createWebHistory } from 'vue-router'
import { setupRouteGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/home/HomeView.vue'),
      meta: {
        title: '首页',
        icon: 'pi pi-home',
        roles: ['guest', 'admin']
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/LoginView.vue'),
      meta: {
        title: '登录',
        icon: 'pi pi-sign-in',
        showToMenu: false,
        public: true
      }
    },
    {
      path: '/manager',
      name: 'manager',
      meta: {
        title: '服务器',
        icon: 'pi pi-server',
        roles: ['admin']
      },
      children: [
        {
          path: '/manager/servers',
          name: 'servers',
          component: () => import('@/views/manager/servers/ServersView.vue'),
          meta: {
            title: '服务器列表',
            icon: 'pi pi-server',
            roles: ['admin']
          }
        },
        {
          path: '/manager/monitor',
          name: 'monitor',
          component: () => import('@/views/manager/monitor/MonitorView.vue'),
          meta: {
            title: '监控面板',
            icon: 'pi pi-chart-line',
            roles: ['guest', 'admin']
          }
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      meta: {
        title: '设置',
        icon: 'pi pi-cog',
        roles: ['admin']
      },
      children: [
        {
          path: '/settings/panel',
          name: 'panel',
          component: () => import('@/views/settings/panel/PanelView.vue'),
          meta: {
            title: '面板设置',
            icon: 'pi pi-cog',
            roles: ['admin'],
          }
        },
        {
          path: '/settings/permissions',
          name: 'permissions',
          component: () => import('@/views/settings/permissions/PermissionsView.vue'),
          meta: {
            title: '权限配置',
            icon: 'pi pi-shield',
            roles: ['admin'],
          }
        },
        {
          path: '/settings/alerts',
          name: 'alerts',
          component: () => import('@/views/settings/alerts/AlertsView.vue'),
          meta: {
            title: '告警设置',
            icon: 'pi pi-bell',
            roles: ['admin'],
          }
        }
      ]
    }
  ],
})

setupRouteGuards(router)

export default router
