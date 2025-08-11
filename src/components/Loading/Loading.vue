<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  loading?: boolean
  size?: string | number
  strokeWidth?: string | number
  animationDuration?: string
  overlay?: boolean
  text?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  size: 50,
  strokeWidth: 8,
  animationDuration: '0.5s',
  overlay: true,
  text: ''
})

const spinnerStyle = computed(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size
}))

const strokeWidthValue = computed(() =>
  typeof props.strokeWidth === 'number' ? props.strokeWidth : props.strokeWidth
)
</script>

<template>
  <Teleport to="body" :disabled="!overlay">
    <Transition name="loading-fade">
      <div v-if="loading" class="loading-container" :class="{ overlay }">
        <div class="loading-wrapper">
          <ProgressSpinner
            :style="spinnerStyle"
            :strokeWidth="strokeWidthValue"
            fill="transparent"
            :animationDuration="animationDuration"
            aria-label="Loading spinner"
            class="loading-spinner"
          />
          <p v-if="text" class="loading-text">{{ text }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-container.overlay {
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(2px);
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  /* 继承传入的样式 */
}

.loading-text {
  margin: 0;
  color: var(--p-text-color, #333);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

/* 过渡动画 */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: all 0.3s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.loading-fade-enter-to,
.loading-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
