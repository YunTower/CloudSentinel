<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import Loading from '@/components/Loading/Loading.vue'
import BaseLayout from "@/layout/BaseLayout.vue";

const loading = ref(true)
const layout = computed(() => {
  return BaseLayout
})

onMounted(() => {
  loading.value = false
})
</script>

<template>
  <component :is="layout" class="app-container">
    <Loading
      :loading="loading"
      :size="50"
      :strokeWidth="8"
      animationDuration="0.5s"
      :overlay="true"
      text="加载中..."
    />

    <div class="main-content" :class="{ 'loading': loading }">
      <router-view/>
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
