<script setup lang="ts">
import { NEmpty, NTag } from 'naive-ui'
import type { ProcessStatus } from '@/types/manager/servers'
import { RiServerLine } from '@remixicon/vue'

interface Props {
  processStatus?: Record<string, ProcessStatus>
}

const props = withDefaults(defineProps<Props>(), {
  processStatus: () => ({}),
})

const hasProcessStatus = props.processStatus && Object.keys(props.processStatus).length > 0
</script>

<template>
  <n-card>
    <div class="mb-3 flex items-center gap-2">
      <ri-server-line size="14px" />
      <span class="text-sm font-semibold text-color">进程监控</span>
    </div>
    <div v-if="hasProcessStatus" class="flex flex-wrap gap-2">
      <n-tag
        v-for="(status, name) in processStatus"
        :key="name"
        :type="status.running ? 'success' : 'error'"
        class="cursor-help"
        :title="`CPU: ${status.cpu.toFixed(1)}%, Mem: ${status.memory.toFixed(1)}%`"
      >
        <i :class="status.running ? 'ri-check-line mr-1' : 'ri-close-line mr-1'" />
        {{ name }}
      </n-tag>
    </div>
    <n-empty v-else description="暂无进程监控数据" />
  </n-card>
</template>
