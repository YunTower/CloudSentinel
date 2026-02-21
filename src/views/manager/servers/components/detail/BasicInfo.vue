<script setup lang="ts">
import { NCard, NDescriptions, NDescriptionsItem, NTag } from 'naive-ui'
import type { Server } from '@/types/manager/servers'
import { getStatusText, getStatusSeverity } from '@/utils/version.ts'
import { RiInformationLine } from '@remixicon/vue'

interface Props {
  server: Server
}

defineProps<Props>()

const severityToTagType = (
  severity: string,
): 'success' | 'error' | 'default' | 'warning' | 'info' => {
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
  <n-card>
    <n-descriptions :column="2" label-placement="left" >
      <n-descriptions-item label="服务器名称">
        <span class="font-medium">{{ server.name || '-' }}</span>
      </n-descriptions-item>
      <n-descriptions-item label="IP地址">
        <span class="font-mono text-sm">{{ server.ip || '-' }}</span>
      </n-descriptions-item>
      <n-descriptions-item label="状态">
        <n-tag :type="severityToTagType(getStatusSeverity(server.status))" size="small">
          {{ getStatusText(server.status) }}
        </n-tag>
      </n-descriptions-item>
      <n-descriptions-item label="地域">
        {{ server.location || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="操作系统">
        {{ server.os || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="系统架构">
        {{ server.architecture || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="运行时间">
        {{ server.uptime || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="内核版本">
        {{ server.kernel || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="主机名">
        {{ server.hostname || '-' }}
      </n-descriptions-item>
    </n-descriptions>
  </n-card>
</template>
