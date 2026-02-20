<script setup lang="ts">
import { type Component, computed, h, onMounted, ref } from 'vue'
import { useRouter, RouterLink, useRoute } from 'vue-router'
import { useLayout } from '@/composables/useLayout'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from '@/composables/useNotifications'
import websocketManager from '@/services/websocket-manager'
import AdminLoginDialog from './AdminLoginDialog.vue'
import { NIcon } from 'naive-ui'
import { RiLogoutBoxLine, RiMoonLine, RiSunLine, RiUserLine } from '@remixicon/vue'

interface MenuItem {
  label: string
  icon?: Component | string
  route?: string
  items?: MenuItem[]
  roles?: string[]
}

const message = useMessage()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDarkMode, toggleDarkMode, initializeTheme, setupThemeListener } = useLayout()

const showAdminLoginDialog = ref(false)

const currentUser = computed(() => authStore.user)
const isAuthenticated = computed(() => authStore.isAuthenticated)

// 从路由配置生成菜单数据
const allMenuItems = computed(() => {
  const routes = router.getRoutes()
  const menuItems: MenuItem[] = []

  const homeRoute = routes.find((r) => r.path === '/')
  if (homeRoute?.meta?.title) {
    menuItems.push({
      label: homeRoute.meta.title as string,
      icon: homeRoute.meta.icon,
      route: homeRoute.path,
      roles: homeRoute.meta.roles,
    })
  }

  routes.forEach((r) => {
    if (
      r.path === '/' ||
      !r.meta?.title ||
      r.path.includes('/', 1) ||
      r.meta?.showToMenu === false
    ) {
      return
    }

    if (r.children && r.children.length > 0) {
      const childrenItems = r.children
        .filter((child) => child.meta?.title)
        .map((child) => ({
          label: child.meta?.title as string,
          icon: child.meta?.icon,
          route: child.path,
          roles: child.meta?.roles,
        }))

      if (childrenItems.length > 0) {
        menuItems.push({
          label: r.meta.title as string,
          icon: r.meta.icon,
          roles: r.meta.roles,
          items: childrenItems,
        })
      }
    } else {
      menuItems.push({
        label: r.meta.title as string,
        icon: r.meta.icon,
        route: r.path,
        roles: r.meta.roles,
      })
    }
  })

  return menuItems
})

// 根据用户权限过滤菜单项
const filteredMenuItems = computed(() => {
  if (!isAuthenticated.value) {
    return [{ label: '登录', icon: 'ri-login-box-line', route: '/login' }]
  }

  return allMenuItems.value.filter((item) => {
    if (item.roles && currentUser.value) {
      if (!item.roles.includes(currentUser.value.role)) return false
    }
    if (item.items) {
      item.items = item.items.filter((sub) => {
        if (sub.roles && currentUser.value) {
          return sub.roles.includes(currentUser.value.role)
        }
        return true
      })
      if (item.items.length === 0) return false
    }
    return true
  })
})

function renderIcon(icon: Component | string | undefined) {
  if (icon == null) return undefined
  return () =>
    h(NIcon, null, {
      default: () => (typeof icon === 'string' ? h('i', { class: icon }) : h(icon)),
    })
}

const naiveMenuOptions = computed(() =>
  filteredMenuItems.value.map((item) => ({
    label: item.route
      ? () => h(RouterLink, { to: item.route! }, { default: () => item.label })
      : item.label,
    key: item.route ?? item.label,
    icon: renderIcon(item.icon),
    children: item.items?.map((sub) => ({
      label: () => h(RouterLink, { to: sub.route! }, { default: () => sub.label }),
      key: sub.route ?? sub.label,
      icon: renderIcon(sub.icon),
    })),
  })),
)

// 当前激活的菜单 key
const activeMenuKey = computed(() => route.path)

// 处理退出登录
const handleLogout = () => {
  websocketManager.disconnect()
  authStore.logout()
  message.success('已安全退出登录', { duration: 3000 })
  router.push({ name: 'overview' })
}

onMounted(() => {
  initializeTheme()
  setupThemeListener()
})
</script>

<template>
  <div class="w-full max-w-7xl">
    <div class="flex items-center w-full">
      <div class="flex-1 overflow-hidden">
        <n-menu
          mode="horizontal"
          :options="naiveMenuOptions"
          :value="activeMenuKey"
          :indent="18"
          responsive
        />
      </div>

      <!-- 右侧控制区 -->
      <div class="flex items-center gap-4 flex-shrink-0">
        <!-- 深色模式切换 -->
        <n-tooltip>
          <template #trigger>
            <n-button text circle size="small" @click="toggleDarkMode">
              <template #icon>
                <ri-sun-line v-if="isDarkMode" />
                <ri-moon-line v-else />
              </template>
            </n-button>
          </template>
          {{ isDarkMode ? '切换到浅色模式' : '切换到深色模式' }}
        </n-tooltip>

        <!-- 访客：管理员登录 -->
        <n-tooltip v-if="isAuthenticated && currentUser?.role === 'guest'">
          <template #trigger>
            <n-button text circle size="small" @click="showAdminLoginDialog = true">
              <template #icon>
                <ri-user-line />
              </template>
            </n-button>
          </template>
          管理员登录
        </n-tooltip>

        <!-- 管理员：退出登录 -->
        <n-tooltip v-if="isAuthenticated && currentUser?.role === 'admin'">
          <template #trigger>
            <n-button text circle size="small" @click="handleLogout">
              <template #icon>
                <ri-logout-box-line />
              </template>
            </n-button>
          </template>
          退出登录 ({{ currentUser?.username }})
        </n-tooltip>
      </div>
    </div>
  </div>

  <AdminLoginDialog v-model:visible="showAdminLoginDialog" />
</template>
