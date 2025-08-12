<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="card">
    <Menubar :model="items">
      <template #item="{ item, props, hasSubmenu, root }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
          <a v-ripple class="flex items-center" :href="href" v-bind="props.action" @click="navigate">
            <span v-if="item.icon" :class="item.icon" class="mr-2"/>
            <span>{{ item.label }}</span>
            <i v-if="hasSubmenu"
               :class="['pi pi-angle-down ml-auto', { 'pi-angle-down': root, 'pi-angle-right': !root }]"></i>
          </a>
        </router-link>
        <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
          <span v-if="item.icon" :class="item.icon" class="mr-2"/>
          <span>{{ item.label }}</span>
          <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down"/>
        </a>
      </template>
      <template #end>
        <div class="flex items-center gap-2">
          <Avatar
            image="https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png"
            shape="circle"/>
        </div>
      </template>
    </Menubar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface MenuItem {
  label: string
  icon?: string
  route?: string
  items?: MenuItem[]
}

// 从路由配置生成菜单数据
const items = computed(() => {
  const routes = router.getRoutes()
  const menuItems: MenuItem[] = []

  // 添加首页
  const homeRoute = routes.find(route => route.path === '/')
  if (homeRoute?.meta?.title) {
    menuItems.push({
      label: homeRoute.meta.title as string,
      icon: homeRoute.meta.icon as string,
      route: homeRoute.path
    })
  }

  // 处理处理子路由的其他顶级路由
  routes.forEach(route => {
    // 跳过首页、没有 meta.title 的路由、以及子路由
    if (route.path === '/' || !route.meta?.title || route.path.includes('/', 1)) {
      return
    }

    // 如果有子路由，构建带 items 的菜单
    if (route.children && route.children.length > 0) {
      const childrenItems = route.children
        .filter(child => child.meta?.title)
        .map(child => ({
          label: child.meta?.title as string,
          icon: child.meta?.icon as string,
          route: child.path
        }))

      if (childrenItems.length > 0) {
        menuItems.push({
          label: route.meta.title as string,
          icon: route.meta.icon as string,
          items: childrenItems
        })
      }
    } else {
      // 单独的菜单项
      menuItems.push({
        label: route.meta.title as string,
        icon: route.meta.icon as string,
        route: route.path
      })
    }
  })

  return menuItems
})
</script>
