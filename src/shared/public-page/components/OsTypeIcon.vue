<script setup lang="ts">
/**
 * 系统图标：使用 Devicon 彩色官方图形标（无 *-wordmark）。
 * 每个图标为独立的 SVG 静态资源（见 ./os-icons/），按需加载。
 * https://devicon.dev/
 */
import { computed } from 'vue'
import { resolveOsIconKind, type OsIconKind } from '@/shared/server-display/utils'

const iconAssets = import.meta.glob('../../assets/os-icons/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/** 图标展示种类 → Devicon 集合文件名 */
const iconNameMap: Record<OsIconKind, string> = {
  windows: 'windows11',
  apple: 'apple',
  ubuntu: 'ubuntu',
  debian: 'debian',
  centos: 'centos',
  almalinux: 'almalinux',
  rockylinux: 'rockylinux',
  redhat: 'redhat',
  fedora: 'fedora',
  arch: 'archlinux',
  suse: 'opensuse',
  android: 'android',
  linuxmint: 'linuxmint',
  linux: 'linux',
}

const props = defineProps<{
  systemName?: string
  os?: string
}>()

const kind = computed(() => resolveOsIconKind(props.systemName, props.os))
const src = computed(() => iconAssets[`./os-icons/${iconNameMap[kind.value]}.svg`])
const alt = computed(() => {
  const name = (props.systemName || props.os || '').trim()
  return name ? `系统：${name}` : '系统'
})
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    class="size-4 shrink-0"
  />
</template>
