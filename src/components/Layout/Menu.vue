<template>
  <div class="card">
    <Menubar :model="items">
      <template #item="{ item, props, hasSubmenu, root }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
          <a v-ripple class="flex items-center" v-bind="props.action">
            <span v-if="item.icon" :class="item.icon" class="mr-2"/>
            <span>{{ item.label }}</span>
            <i v-if="hasSubmenu"
               :class="['pi pi-angle-down ml-auto', { 'pi-angle-down': root, 'pi-angle-right': !root }]"></i>
          </a>
        </router-link>
        <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
          <span :class="item.icon" />
          <span>{{ item.label }}</span>
          <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down" />
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

<script setup>
import {ref} from "vue";

const items = ref([
  {
    label: '首页',
    icon: 'pi pi-home',
    route: '/'
  },
  {
    label: '服务器管理',
    icon: 'pi pi-server',
    items: [
      {
        label: '服务器列表',
        icon: 'pi pi-list',
        route: '/manager/servers'
      },
      {
        label: '监控面板',
        icon: 'pi pi-chart-line',
        route: '/manager/monitor'
      }
    ]
  },
  {
    label: '系统设置',
    icon: 'pi pi-cog',
    items: [
      {
        label: '站点设置',
        icon: 'pi pi-cog',
        route: '/settings/site'
      },
      {
        label: '权限配置',
        icon: 'pi pi-shield',
        route: '/settings/permissions'
      },
      {
        label: '告警设置',
        icon: 'pi pi-bell',
        route: '/settings/alerts'
      }
    ]
  },
  {
    label: '帮助',
    icon: 'pi pi-question-circle'
  }
]);
</script>
