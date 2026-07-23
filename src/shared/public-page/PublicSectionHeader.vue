<script setup lang="ts">
interface Props {
  title: string
  count?: number
  unit?: string
}

withDefaults(defineProps<Props>(), {
  unit: '项',
})
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <n-h3 prefix="bar" class="!mb-0 min-w-0 truncate">{{ title }}</n-h3>
    <n-text v-if="typeof count === 'number'" depth="3" class="shrink-0 tabular-nums">
      {{ count }} {{ unit }}
    </n-text>
  </div>
</template>
