import {createRouter, createWebHistory} from 'vue-router'

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
      }
    },
    {
      path: '/manager',
      name: 'manager',
      meta:{
        title:'服务器管理',
        icon:'pi pi-server',
      },
      children: [
        {
          path: '/manager/servers',
          name: 'servers',
          component: () => import('@/views/manager/servers/ServersView.vue'),
          meta: {
            title: '服务器列表',
            icon: 'pi pi-server',
          }
        },
        {
          path: '/manager/monitor',
          name: 'monitor',
          component: () => import('@/views/manager/monitor/MonitorView.vue'),
          meta: {
            title: '监控面板',
            icon: 'pi pi-chart-line',
          }
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      meta:{
        title:'系统设置',
        icon:'pi pi-cog',
      },
      children: [
        {
          path: '/settings/site',
          name: 'site',
          component: () => import('@/views/settings/site/SiteView.vue'),
          meta: {
            title: '站点设置',
            icon: 'pi pi-cog',
          }
        },
        {
          path: '/settings/permissions',
          name: 'permissions',
          component: () => import('@/views/settings/permissions/PermissionsView.vue'),
          meta: {
            title: '权限配置',
            icon: 'pi pi-shield',
          }
        },
        {
          path: '/settings/alerts',
          name: 'alerts',
          component: () => import('@/views/settings/alerts/AlertsView.vue'),
          meta: {
            title: '告警设置',
            icon: 'pi pi-bell',
          }
        }
      ]
    }
  ],
})

export default router
