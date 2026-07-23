<script setup lang="ts">
interface Props {
  groupName: string
  count: number
  color?: string
  unit?: string
}

withDefaults(defineProps<Props>(), {
  unit: '台',
})
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <span
        v-if="color"
        class="size-2.5 shrink-0 rounded-full"
        :style="{ backgroundColor: color }"
      />
      <n-h4 class="!mb-0 truncate">{{ groupName }}</n-h4>
    </div>
    <n-text depth="3" class="shrink-0 tabular-nums">{{ count }} {{ unit }}</n-text>
  </div>
</template>
