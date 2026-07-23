<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { RiMoonLine, RiSunLine } from '@remixicon/vue'
import type { PublicPageV1, PublicPagesConfigV1 } from '@/shared/types/settings/public-pages'
import { useTheme } from '@/shared/composables/useTheme'
import {
  companionIncidentsPath,
  isIncidentsOnlyPage,
} from '@/shared/public-page/filterPublicIncidents'

const props = defineProps<{
  page: PublicPageV1
  pages?: PublicPagesConfigV1['pages']
  compact?: boolean
}>()

const route = useRoute()
const { isDarkMode, toggleDarkMode } = useTheme()

const accent = computed(() => props.page.accentColor || '#18a058')

/** 当前页所属的「状态页 + 事件页」导航对 */
const navItems = computed(() => {
  const list = props.pages?.length ? props.pages : [props.page]
  const current = list.find((p) => p.path === route.path) || props.page

  let statusPage: PublicPageV1 | undefined
  let incidentsPage: PublicPageV1 | undefined

  if (isIncidentsOnlyPage(current)) {
    incidentsPage = current
    const path = current.path.replace(/\/+$/, '')
    const statusPath =
      path === '/public/incidents'
        ? '/public'
        : path.endsWith('/incidents')
          ? path.slice(0, -'/incidents'.length) || '/public'
          : '/public'
    statusPage = list.find((p) => p.path === statusPath)
  } else {
    statusPage = current
    const incidentsPath = companionIncidentsPath(current.path)
    incidentsPage = list.find((p) => p.path === incidentsPath)
  }

  if (!statusPage && !incidentsPage) {
    statusPage = list.find((p) => p.path === '/public')
    incidentsPage = list.find((p) => p.path === '/public/incidents')
  }

  const items: Array<{ path: string; label: string }> = []
  if (statusPage) items.push({ path: statusPage.path, label: statusPage.title || '状态' })
  if (incidentsPage) items.push({ path: incidentsPage.path, label: incidentsPage.title || '事件' })
  if (items.length === 0) items.push({ path: props.page.path, label: props.page.title || '状态' })
  return items
})

const homePath = computed(() => navItems.value[0]?.path || props.page.path || '/public')
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
        class="flex min-w-0 items-center gap-2.5 text-[var(--surface-900)]"
      >
        <span
          v-if="page.logoUrl"
          class="size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-950/10 dark:ring-white/10"
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
            class="rounded-lg px-3 py-1.5 text-sm text-[var(--surface-500)] hover:bg-zinc-950/5 hover:text-[var(--surface-800)] dark:hover:bg-white/10"
            :class="
              route.path === item.path
                ? 'bg-zinc-950/5 text-[var(--surface-900)] dark:bg-white/10'
                : undefined
            "
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <button
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-lg text-[var(--surface-500)] hover:bg-zinc-950/5 hover:text-[var(--surface-800)] dark:hover:bg-white/10"
          :aria-label="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          :title="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleDarkMode"
        >
          <RiSunLine v-if="isDarkMode" class="size-4" />
          <RiMoonLine v-else class="size-4" />
        </button>
      </div>
    </header>

    <slot />
  </div>
</template>
