<template>
  <div class="flex flex-col min-h-dvh">
    <header class="fixed-header">
      <Menu />
    </header>

    <main class="flex-1 main-content">
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

.main-content {
  padding-top: 65px;
}
</style>
