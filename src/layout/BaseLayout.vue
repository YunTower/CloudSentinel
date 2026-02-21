<script setup lang="ts">
import Menu from '@/components/Layout/Menu.vue'
</script>

<template>
  <n-layout>
    <n-layout-header class="base-layout-header" bordered>
      <Menu />
    </n-layout-header>
    <n-layout-content class="base-layout-content flex justify-center p-4" content-class="container">
      <slot />
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
.base-layout-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
}

.base-layout-content {
  padding-top: var(--header-height, 56px);
}
</style>
