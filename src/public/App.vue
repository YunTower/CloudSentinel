<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui'
import { useTheme } from '@/shared/composables/useTheme'

const { isDarkMode } = useTheme()
const naiveTheme = computed(() => (isDarkMode.value ? darkTheme : null))
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN" :theme="naiveTheme">
    <NMessageProvider>
      <NNotificationProvider>
        <NDialogProvider>
          <div
            class="isolate min-h-dvh antialiased bg-[var(--surface-0)] text-[var(--surface-800)]"
          >
            <RouterView />
          </div>
        </NDialogProvider>
      </NNotificationProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
