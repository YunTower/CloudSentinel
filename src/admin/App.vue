<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { darkTheme, zhCN } from 'naive-ui'
import { initChartThemeWatcher } from '@/shared/utils/vcharts'
import BaseLayout from '@/admin/layout/BaseLayout.vue'
import BlankLayout from '@/admin/layout/BlankLayout.vue'
import { useLayout } from '@/admin/composables/useLayout'

const route = useRoute()
const { isDarkMode } = useLayout()

const naiveTheme = computed(() => (isDarkMode.value ? darkTheme : null))

const layout = computed(() => {
  if (
    route.path.startsWith('/public') ||
    route.name === 'login' ||
    route.meta?.layout === 'blank'
  ) {
    return BlankLayout
  }
  return BaseLayout
})

onMounted(() => {
  initChartThemeWatcher()
})
</script>

<template>
  <n-config-provider :locale="zhCN" :theme="naiveTheme">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <component :is="layout" class="min-h-dvh h-full w-full">
            <router-view v-slot="{ Component }">
              <component :is="Component" :key="$route.fullPath" />
            </router-view>
          </component>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
