<script setup lang="ts">
interface Props {
  groupName: string
  count: number
  color?: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex items-center justify-between px-2">
    <div class="flex items-center gap-2">
      <span
        v-if="color"
        class="w-3 h-3 rounded-full flex-shrink-0"
        :style="{ backgroundColor: color }"
      ></span>
      <h3 class="text-lg font-semibold text-color">{{ groupName }}</h3>
    </div>
    <span class="text-sm text-muted-color">{{ count }} 台服务器</span>
  </div>
</template>
