<template>
  <div class="flex flex-col min-h-dvh">
    <header class="fixed-header">
      <Menu />
    </header>
    <main class="pt-[65px] flex-1 flex justify-center">
      <slot />
    </main>
    <footer class="flex-shrink-0"></footer>
  </div>
</template>

<style scoped>
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.container {
  margin-top: 65px;
}
</style>
<script setup lang="ts">
</script>
