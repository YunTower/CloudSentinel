<script setup lang="ts">
import { computed } from 'vue'
import { NEmpty, NTag } from 'naive-ui'
import type { ProcessStatus } from '@/shared/types/manager/servers'
import { RiServerLine } from '@remixicon/vue'

interface Props {
  processStatus?: Record<string, ProcessStatus>
}

const props = withDefaults(defineProps<Props>(), {
  processStatus: () => ({}),
})

const hasProcessStatus = computed(
  () => !!props.processStatus && Object.keys(props.processStatus).length > 0,
)
</script>

<template>
  <n-card size="small" :bordered="false">
    <div class="flex flex-col h-full min-h-0">
      <div v-if="hasProcessStatus" class="flex flex-wrap gap-2 content-start min-h-0 overflow-auto">
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
      <div v-else class="flex-1 min-h-0 flex items-center justify-center">
        <n-empty description="暂无进程监控数据" />
      </div>
    </div>
  </n-card>
</template>
