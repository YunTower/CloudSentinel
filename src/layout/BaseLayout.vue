<script setup lang="ts">
import Menu from '@/components/Layout/Menu.vue'
</script>

<template>
  <n-layout>
    <n-layout-header
      class="flex justify-center"
      bordered style="position: sticky; top: 0; z-index: 1000">
      <Menu />
    </n-layout-header>
    <n-layout-content class="flex justify-center p-4" content-class="container">
      <slot />
    </n-layout-content>
  </n-layout>
</template>
