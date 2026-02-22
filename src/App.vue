<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { darkTheme } from 'naive-ui'
import { initChartThemeWatcher } from '@/utils/vcharts'
import BaseLayout from '@/layout/BaseLayout.vue'
import BlankLayout from '@/layout/BlankLayout.vue'
import { useLayout } from '@/composables/useLayout'

const loading = ref(true)
const route = useRoute()
const router = useRouter()
const { isDarkMode } = useLayout()

const naiveTheme = computed(() => (isDarkMode.value ? darkTheme : null))

const layout = computed(() => {
  if (route.name === 'login') {
    return BlankLayout
  }
  return BaseLayout
})

const isLoading = computed(() => loading.value)

// 检查资源加载状态
const checkResourceLoading = (): boolean => {
  if (document.readyState !== 'complete') {
    return true
  }

  const images = document.querySelectorAll('img')
  for (let i = 0; i < images.length; i++) {
    const img = images[i] as HTMLImageElement
    if (!img.complete || img.naturalWidth === 0) {
      return true
    }
  }

  return false
}

// 等待资源加载完成
const waitForResources = async (): Promise<void> => {
  return new Promise((resolve) => {
    if (!checkResourceLoading()) {
      resolve()
      return
    }

    const handleLoad = () => {
      setTimeout(() => {
        resolve()
      }, 100)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad, { once: true })
    }

    setTimeout(() => {
      resolve()
    }, 3000)
  })
}

// 等待字体加载完成
const waitForFonts = async (): Promise<void> => {
  if (!document.fonts) {
    return Promise.resolve()
  }

  try {
    await document.fonts.ready
  } catch (error) {
    console.warn('字体加载检查失败:', error)
  }
}

// 初始化加载状态
const initializeLoading = async () => {
  loading.value = true
  await Promise.all([waitForResources(), waitForFonts()])
  await nextTick()
}

// 路由切换时的加载处理
let routeLoadingTimer: ReturnType<typeof setTimeout> | null = null

router.beforeEach(() => {
  if (routeLoadingTimer) {
    clearTimeout(routeLoadingTimer)
  }
  loading.value = true
})

router.afterEach(async () => {
  await nextTick()
  await Promise.all([waitForResources(), waitForFonts()])

  routeLoadingTimer = setTimeout(() => {
    loading.value = false
    routeLoadingTimer = null
  }, 200)
})

onMounted(() => {
  initChartThemeWatcher()
  initializeLoading()
})
</script>

<template>
  <n-config-provider :theme="naiveTheme">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <component :is="layout" class="min-h-dvh h-full w-full">
            <n-spin :show="isLoading" size="large">
              <router-view v-slot="{ Component }">
                <component :is="Component" :key="$route.fullPath" />
              </router-view>
            </n-spin>
          </component>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
