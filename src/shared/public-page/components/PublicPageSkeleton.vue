<script setup lang="ts">
withDefaults(
  defineProps<{
    includeHeader?: boolean
  }>(),
  {
    includeHeader: false,
  },
)
</script>

<template>
  <div
    class="w-full"
    :class="
      includeHeader
        ? 'mx-auto max-w-3xl space-y-8 px-4 py-8 sm:max-w-4xl sm:px-6 sm:py-10 lg:max-w-5xl lg:px-8'
        : 'space-y-8'
    "
    aria-busy="true"
    aria-label="正在加载公开状态页"
  >
    <header v-if="includeHeader" class="flex items-center justify-between gap-4" aria-hidden="true">
      <div class="flex items-center gap-2.5">
        <span class="public-skeleton-bar size-8 rounded-full" />
        <span class="public-skeleton-bar h-5 w-32 rounded-md" />
      </div>
      <div class="flex items-center gap-2">
        <span class="public-skeleton-bar h-8 w-14 rounded-lg" />
        <span class="public-skeleton-bar size-9 rounded-lg" />
      </div>
    </header>

    <div class="space-y-8" aria-hidden="true">
      <div
        class="rounded-[1.25rem] bg-zinc-950/[0.035] p-4 sm:p-5 dark:bg-white/[0.055]"
      >
        <div class="flex items-start gap-3 sm:gap-4">
          <span class="public-skeleton-bar size-8 shrink-0 rounded-full sm:size-9" />
          <div class="flex-1 space-y-2">
            <div class="public-skeleton-bar h-8 w-52 max-w-full rounded-lg" />
            <div class="public-skeleton-bar h-4 w-72 max-w-full rounded-md" />
          </div>
        </div>
      </div>

      <div
        class="overflow-hidden rounded-[1.25rem] bg-zinc-950/[0.035] p-2 dark:bg-white/[0.055]"
      >
        <div
          class="flex items-center justify-between px-3 py-3 sm:px-4"
        >
          <div class="public-skeleton-bar h-5 w-28 rounded-md" />
          <div class="public-skeleton-bar h-7 w-16 rounded-full" />
        </div>
        <div class="space-y-1">
          <div
            v-for="index in 3"
            :key="index"
            class="space-y-3 rounded-[0.875rem] bg-white px-3 py-5 dark:bg-zinc-950/45 sm:px-4"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="public-skeleton-bar h-5 w-40 max-w-[60%] rounded-md" />
              <div class="public-skeleton-bar h-4 w-20 rounded-md" />
            </div>
            <div class="public-skeleton-bar h-7 w-full rounded-sm" />
          </div>
        </div>
      </div>
    </div>

    <span class="sr-only" role="status">正在加载公开状态页</span>
  </div>
</template>
