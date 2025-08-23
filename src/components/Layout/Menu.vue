<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLayout } from '@/composables/useLayout'
import { authManager } from '@/utils/auth'
import { useToast } from 'primevue/usetoast'
import type { UserSession } from '@/types/auth'

interface MenuItem {
  label: string
  icon?: string
  route?: string
  items?: MenuItem[]
  roles?: string[]
}

const router = useRouter()
const { isDarkMode, toggleDarkMode, initializeTheme, setupThemeListener } = useLayout()
const toast = useToast()

// 用户状态
const currentUser = ref<UserSession | null>(null)
const isAuthenticated = ref(false)

// 从路由配置生成菜单数据
const allMenuItems = computed(() => {
  const routes = router.getRoutes()
  const menuItems: MenuItem[] = []

  // 添加首页
  const homeRoute = routes.find((route) => route.path === '/')
  if (homeRoute?.meta?.title) {
    menuItems.push({
      label: homeRoute.meta.title as string,
      icon: homeRoute.meta.icon as string,
      route: homeRoute.path,
      roles: homeRoute.meta.roles as string[],
    })
  }

  // 处理其他顶级路由
  routes.forEach((route) => {
    // 跳过首页、没有 meta.title 的路由、以及子路由
    if (
      route.path === '/' ||
      !route.meta?.title ||
      route.path.includes('/', 1) ||
      route.meta?.showToMenu === false
    ) {
      return
    }

    // 如果有子路由，构建带 items 的菜单
    if (route.children && route.children.length > 0) {
      const childrenItems = route.children
        .filter((child) => child.meta?.title)
        .map((child) => ({
          label: child.meta?.title as string,
          icon: child.meta?.icon as string,
          route: child.path,
          roles: child.meta?.roles as string[],
        }))

      if (childrenItems.length > 0) {
        menuItems.push({
          label: route.meta.title as string,
          icon: route.meta.icon as string,
          roles: route.meta?.roles as string[],
          items: childrenItems,
        })
      }
    } else {
      // 单独的菜单项
      menuItems.push({
        label: route.meta.title as string,
        icon: route.meta.icon as string,
        route: route.path,
        roles: route.meta?.roles as string[],
      })
    }
  })

  return menuItems
})

// 根据用户权限过滤菜单项
const filteredMenuItems = computed(() => {
  if (!isAuthenticated.value) {
    // 未登录用户只显示登录菜单
    return [
      {
        label: '登录',
        icon: 'pi pi-sign-in',
        route: '/login',
      },
    ]
  }

  return allMenuItems.value.filter((item) => {
    // 检查角色权限
    if (item.roles && currentUser.value) {
      if (!item.roles.includes(currentUser.value.role)) {
        return false
      }
    }

    // 递归检查子菜单
    if (item.items) {
      item.items = item.items.filter((subItem) => {
        if (subItem.roles && currentUser.value) {
          if (!subItem.roles.includes(currentUser.value.role)) {
            return false
          }
        }

        return true
      })

      // 如果子菜单为空，隐藏父菜单
      if (item.items.length === 0) {
        return false
      }
    }

    return true
  })
})

// 处理退出登录
const handleLogout = () => {
  authManager.logout()
  isAuthenticated.value = false
  currentUser.value = null

  toast.add({
    severity: 'success',
    summary: '退出成功',
    detail: '已安全退出登录',
    life: 3000,
  })

  router.push('/login')
}

// 更新用户状态
const updateUserState = () => {
  isAuthenticated.value = authManager.isAuthenticated()
  currentUser.value = authManager.getCurrentUser()
}

// 监听认证状态变化
const checkAuthState = () => {
  updateUserState()
}

onMounted(() => {
  updateUserState()
  initializeTheme()
  setupThemeListener()
  setInterval(checkAuthState, 5000)
})
</script>
<template>
  <div class="card">
    <Menubar :model="filteredMenuItems">
      <template #item="{ item, props, hasSubmenu, root }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
          <a
            v-ripple
            class="flex items-center"
            :href="href"
            v-bind="props.action"
            @click="navigate"
          >
            <span v-if="item.icon" :class="item.icon" class="mr-2" />
            <span>{{ item.label }}</span>
            <i
              v-if="hasSubmenu"
              :class="[
                'pi pi-angle-down ml-auto',
                { 'pi-angle-down': root, 'pi-angle-right': !root },
              ]"
            ></i>
          </a>
        </router-link>
        <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
          <span v-if="item.icon" :class="item.icon" class="mr-2" />
          <span>{{ item.label }}</span>
          <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down" />
        </a>
      </template>
      <template #end>
        <div class="flex items-center gap-2">
          <Button
            class="h-[35px] w-[35px]"
            type="button"
            @click="toggleDarkMode"
            text
            rounded
            severity="secondary"
            size="small"
            v-tooltip.bottom="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          >
            <i :class="['pi', { 'pi-moon': !isDarkMode, 'pi-sun': isDarkMode }]" />
          </Button>

          <!-- 用户信息 -->
          <div class="flex items-center gap-2">
            <Button
              v-if="isAuthenticated"
              class="h-[35px] w-[35px]"
              type="button"
              @click="handleLogout"
              text
              rounded
              severity="secondary"
              size="small"
              v-tooltip.bottom="'退出登录'"
            >
              <i class="pi pi-sign-out" />
            </Button>
          </div>
        </div>
      </template>
    </Menubar>
  </div>
</template>
