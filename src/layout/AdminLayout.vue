
<template>
  <div class="flex min-h-dvh">
    <aside class="flex-shrink-0">
      <slot name="sidebar" />
    </aside>

    <div class="flex-1">
      <BaseLayout>
        <slot />
      </BaseLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseLayout from './BaseLayout.vue'
</script>
