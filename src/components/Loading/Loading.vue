<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean
    size?: number | 'small' | 'medium' | 'large'
    overlay?: boolean
    text?: string
  }>(),
  {
    loading: false,
    size: 'large',
    overlay: true,
    text: '',
  },
)
</script>

<template>
  <Teleport to="body" :disabled="!overlay">
    <Transition name="loading-fade">
      <div v-if="loading" class="loading-container" :class="{ overlay }">
        <n-spin :size="size" :description="text || undefined" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-container {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-container.overlay {
  background-color: rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(2px);
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
