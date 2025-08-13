<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import {useRouter} from 'vue-router'
import Loading from '@/components/Loading/Loading.vue'
import BaseLayout from "@/layout/BaseLayout.vue"
import { useLayout } from '@/composables/useLayout'

const router = useRouter()
const loading = ref(true)
const pageLoading = ref(false)

// 初始化主题布局
useLayout()

const layout = computed(() => {
  return BaseLayout
})

const isLoading = computed(() => loading.value || pageLoading.value)

router.beforeEach((to, from) => {
  if (to.path !== from.path && from.path !== '/') {
    pageLoading.value = true
  }
  return true
})

router.afterEach(() => {
  setTimeout(() => {
    pageLoading.value = false
  }, 100)
})

onMounted(() => {
  loading.value = false
})
</script>

<template>
  <component :is="layout" class="app-container">
    <Loading
      :loading="isLoading"
      :size="50"
      :strokeWidth="8"
      animationDuration="0.5s"
      :overlay="true"
    />

    <div class="main-content" :class="{ 'loading': isLoading }">
      <router-view v-slot="{ Component }" v-if="!pageLoading">
        <Transition
          name="page"
          mode="out-in"
          appear
        >
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
