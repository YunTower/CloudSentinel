<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { RiMoonLine, RiSunLine } from '@remixicon/vue'
import type { PublicPageV1, PublicPagesConfigV1 } from '@/shared/types/settings/public-pages'
import { useTheme } from '@/shared/composables/useTheme'
import { companionIncidentsPath } from '@/shared/public-page/filterPublicIncidents'
import type { PublicPageViewMode } from '@/shared/public-page/ensureIncidentsSeparated'

const props = defineProps<{
  page: PublicPageV1
  pages?: PublicPagesConfigV1['pages']
  view?: PublicPageViewMode
  compact?: boolean
}>()

const route = useRoute()
const { isDarkMode, toggleDarkMode } = useTheme()

const accent = computed(() => props.page.accentColor || '#18a058')
const viewMode = computed<PublicPageViewMode>(() => props.view || 'status')

/** 事件时间线为页面级全局设置；未开启时导航不展示“事件”入口 */
const showIncidentsNav = computed(() => props.page.showIncidents !== false)

/** 同一绑定页下的状态 / 事件视图导航 */
const navItems = computed(() => {
  const items: Array<{ path: string; label: string; view: PublicPageViewMode }> = [
    { path: props.page.path, label: props.page.title || '状态', view: 'status' },
  ]
  if (showIncidentsNav.value) {
    items.push({
      path: companionIncidentsPath(props.page.path),
      label: '事件',
      view: 'incidents',
    })
  }
  return items
})

const homePath = computed(() => props.page.path || '/public')

const isNavActive = (item: { path: string; view: PublicPageViewMode }) => {
  if (viewMode.value === item.view) return true
  return route.path === item.path
}

const togglePublicTheme = () => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    toggleDarkMode()
    return
  }
  document.startViewTransition(toggleDarkMode)
}
</script>

<template>
  <div
    class="w-full"
    :class="
      compact
        ? 'space-y-5'
        : 'mx-auto max-w-3xl space-y-8 px-4 py-8 sm:max-w-4xl sm:px-6 sm:py-10 lg:max-w-5xl lg:px-8'
    "
  >
    <header class="flex items-center justify-between gap-4">
      <component
        :is="compact ? 'div' : RouterLink"
        v-bind="compact ? {} : { to: homePath, 'aria-label': 'Homepage' }"
        class="public-interactive flex min-w-0 items-center gap-2.5 rounded-lg text-[var(--surface-900)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--public-accent)]"
        :style="{ '--public-accent': accent }"
      >
        <span
          v-if="page.logoUrl"
          class="size-8 shrink-0 overflow-hidden rounded-full bg-zinc-950/[0.04] dark:bg-white/[0.06]"
        >
          <img :src="page.logoUrl" alt="" class="size-full object-cover" />
        </span>
        <span
          v-else
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          :style="{ backgroundColor: accent }"
        >
          {{ (page.brandName || page.title || 'C').slice(0, 1).toUpperCase() }}
        </span>
        <span class="truncate text-base font-semibold tracking-tight sm:text-lg">
          {{ page.brandName || page.title || 'CloudSentinel' }}
        </span>
      </component>

      <div class="flex shrink-0 items-center gap-1">
        <nav v-if="!compact && navItems.length > 1" class="flex items-center gap-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="public-interactive rounded-lg px-3 py-1.5 text-sm text-[var(--surface-500)] transition-colors duration-150 hover:bg-zinc-950/5 hover:text-[var(--surface-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-accent)] dark:hover:bg-white/10"
            :style="{ '--public-accent': accent }"
            :class="
              isNavActive(item)
                ? 'bg-zinc-950/5 text-[var(--surface-900)] dark:bg-white/10'
                : undefined
            "
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <button
          type="button"
          class="public-interactive inline-flex size-9 items-center justify-center rounded-lg text-[var(--surface-500)] transition-colors duration-150 hover:bg-zinc-950/5 hover:text-[var(--surface-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-accent)] dark:hover:bg-white/10"
          :style="{ '--public-accent': accent }"
          :aria-label="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          :title="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          @click="togglePublicTheme"
        >
          <RiSunLine v-if="isDarkMode" class="size-4" />
          <RiMoonLine v-else class="size-4" />
        </button>
      </div>
    </header>

    <slot />
  </div>
</template>
