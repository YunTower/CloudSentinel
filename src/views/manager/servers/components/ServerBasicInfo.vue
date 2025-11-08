<script setup lang="ts">
import type { Server } from '@/types/manager/servers'
import { getStatusText, getStatusSeverity, formatUptime } from '../utils'

interface Props {
  server: Server
}

defineProps<Props>()
</script>

<template>
  <div
    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <h4
      class="text-lg font-semibold text-color border-b border-surface-200 dark:border-surface-700 pb-2 mb-3"
    >
      <i class="pi pi-info-circle text-primary mr-2"></i>基本信息
    </h4>
    <div class="space-y-3">
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">服务器名称</span>
        <span class="font-medium">{{ server.name }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">IP地址</span>
        <span class="font-mono text-sm">{{ server.ip }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">状态</span>
        <Tag :value="getStatusText(server.status)" :severity="getStatusSeverity(server.status)" />
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">位置</span>
        <span>{{ server.location == '' ? '-' : server.location }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">操作系统</span>
        <span>{{ server.os }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">系统架构</span>
        <span>{{ server.architecture || '-' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">运行时间</span>
        <span>{{ formatUptime(server.uptime || '') }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">内核版本</span>
        <span>{{ server.kernel || '5.15.0' }}</span>
      </div>
      <div
        class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
      >
        <span class="text-muted-color">主机名</span>
        <span>{{ server.hostname || 'unknown' }}</span>
      </div>
    </div>
  </div>
</template>


