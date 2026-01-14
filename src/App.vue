<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseLayout from '@/layout/BaseLayout.vue'
import BlankLayout from '@/layout/BlankLayout.vue'
import Loading from '@/components/Loading/Loading.vue'
import Toast from 'primevue/toast'

const loading = ref(true)
const route = useRoute()
const router = useRouter()

const layout = computed(() => {
  if (route.name === 'login') {
    return BlankLayout
  }
  return BaseLayout
})

const isLoading = computed(() => loading.value)

// 检查资源加载状态
const checkResourceLoading = (): boolean => {
  // 检查文档加载状态
  if (document.readyState !== 'complete') {
    return true
  }

  // 检查图片加载状态
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
    // 如果资源已加载完成，直接返回
    if (!checkResourceLoading()) {
      resolve()
      return
    }

    // 监听 window load 事件
    const handleLoad = () => {
      // 额外等待一小段时间，确保所有资源都已渲染
      setTimeout(() => {
        resolve()
      }, 100)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad, { once: true })
    }

    // 设置超时，避免无限等待
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
    // 如果字体加载失败，继续执行
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
  // 清除之前的定时器
  if (routeLoadingTimer) {
    clearTimeout(routeLoadingTimer)
  }
  // 路由切换开始时显示加载
  loading.value = true
})

router.afterEach(async () => {
  // 等待路由组件渲染
  await nextTick()

  // 等待资源加载和字体加载
  await Promise.all([waitForResources(), waitForFonts()])

  // 额外等待一小段时间，确保页面内容已渲染
  routeLoadingTimer = setTimeout(() => {
    loading.value = false
    routeLoadingTimer = null
  }, 200)
})

// // 监听路由变化
// watch(
//   () => route.fullPath,
//   async () => {
//     if (!loading.value) {
//       loading.value = true
//       await nextTick()
//       await Promise.all([waitForResources(), waitForFonts()])
//       setTimeout(() => {
//         loading.value = false
//       }, 200)
//     }
//   }
// )

onMounted(() => {
  initializeLoading()
})
</script>

<template>
  <component :is="layout" class="app-container">
    <Toast position="top-right" />
    <Loading
      :loading="isLoading"
      :size="50"
      :strokeWidth="8"
      animationDuration="0.5s"
      :overlay="true"
    />

    <div class="container" :class="{ loading: isLoading }">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in" appear>
          <component :is="Component" :key="$route.fullPath" />
        </Transition>
      </router-view>
    </div>
  </component>
</template>

<style scoped>
.app-container {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  transition: opacity 0.3s ease;
}

.main-content.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 全局页面过渡动画 */
.page-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.02);
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity 0.2s ease;
  }

  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}
</style>
