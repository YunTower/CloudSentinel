<script setup lang="ts">
/**
 * 系统图标：统一使用 Iconify Devicon 彩色图形标（无 *-wordmark）
 * https://icon-sets.iconify.design/devicon/
 */
import { computed } from 'vue'
import { Icon, addCollection } from '@iconify/vue/offline'
import type { IconifyJSON } from '@iconify/types'
import colored from '@/shared/data/devicon-os.json'
import { resolveOsIconKind, type OsIconKind } from '@/shared/server-display/utils'

addCollection(colored as IconifyJSON)

const props = defineProps<{
  systemName?: string
  os?: string
}>()

/** 仅图形标，保留官方配色，不做额外 CSS 着色 */
const iconNameMap: Record<OsIconKind, string> = {
  windows: 'devicon:windows11',
  apple: 'devicon:apple',
  ubuntu: 'devicon:ubuntu',
  debian: 'devicon:debian',
  centos: 'devicon:centos',
  almalinux: 'devicon:almalinux',
  rockylinux: 'devicon:rockylinux',
  redhat: 'devicon:redhat',
  fedora: 'devicon:fedora',
  arch: 'devicon:archlinux',
  suse: 'devicon:opensuse',
  android: 'devicon:android',
  linuxmint: 'devicon:linuxmint',
  linux: 'devicon:linux',
}

const kind = computed(() => resolveOsIconKind(props.systemName, props.os))
const iconName = computed(() => iconNameMap[kind.value])
const label = computed(() => {
  const name = (props.systemName || props.os || '').trim()
  return name ? `系统：${name}` : '系统'
})
</script>

<template>
  <Icon
    :icon="iconName"
    class="size-4 shrink-0"
    :aria-label="label"
    role="img"
  />
</template>
