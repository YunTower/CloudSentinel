<template>
  <div class="flex flex-col min-h-dvh">
    <header class="flex-shrink-0">
      <Menu/>
    </header>

    <main class="flex-1">
      <slot/>
    </main>

    <footer class="flex-shrink-0">
      <slot name="footer"/>
    </footer>
  </div>
</template>
