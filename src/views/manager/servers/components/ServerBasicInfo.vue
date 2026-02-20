<script setup lang="ts">
import type { Server } from '@/types/manager/servers'
import { getStatusText, getStatusSeverity } from '@/utils/version.ts'

interface Props {
  server: Server
}

defineProps<Props>()

const severityToTagType = (severity: string): 'success' | 'error' | 'default' | 'warning' | 'info' => {
  const map: Record<string, 'success' | 'error' | 'default' | 'warning' | 'info'> = {
    success: 'success',
    danger: 'error',
    secondary: 'default',
    warn: 'warning',
    info: 'info',
  }
  return map[severity] ?? 'default'
}
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <h4
      class="text-lg font-semibold text-color border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-3"
    >
      <i class="ri-information-line text-primary mr-2"></i>基本信息
    </h4>
    <div class="space-y-3">
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">服务器名称</span>
        <span class="font-medium">{{ server.name || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">IP地址</span>
        <span class="font-mono text-sm">{{ server.ip || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">状态</span>
        <n-tag :type="severityToTagType(getStatusSeverity(server.status))" size="small">
          {{ getStatusText(server.status) }}
        </n-tag>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">地域</span>
        <span>{{ server.location || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">操作系统</span>
        <span>{{ server.os || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">系统架构</span>
        <span>{{ server.architecture || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">运行时间</span>
        <span>{{ server.uptime || '' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">内核版本</span>
        <span>{{ server.kernel || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700"
      >
        <span class="text-muted-color">主机名</span>
        <span>{{ server.hostname || '-' }}</span>
      </div>
    </div>
  </div>
</template>
