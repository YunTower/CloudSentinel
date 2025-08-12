<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import {useRouter} from 'vue-router'
import Loading from '@/components/Loading/Loading.vue'
import BaseLayout from "@/layout/BaseLayout.vue";

const router = useRouter()
const loading = ref(true)
const pageLoading = ref(false)

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
      <router-view v-show="!pageLoading"/>
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
</style>
