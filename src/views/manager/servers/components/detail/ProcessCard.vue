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
  <n-card class="process-card-fill">
    <div class="flex flex-col h-full min-h-0">
      <div class="mb-3 flex items-center gap-2 shrink-0">
        <ri-server-line size="14px" />
        <span class="text-sm font-semibold text-color">进程监控</span>
      </div>
      <div
        v-if="hasProcessStatus"
        class="flex flex-wrap gap-2 content-start min-h-0 overflow-auto"
      >
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
      <div
        v-else
        class="flex-1 min-h-0 flex items-center justify-center"
      >
        <n-empty description="暂无进程监控数据" />
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.process-card-fill {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.process-card-fill :deep(.n-card__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
