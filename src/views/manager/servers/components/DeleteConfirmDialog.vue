<script setup lang="ts">
import { computed } from 'vue'
import type { Server } from '@/types/manager/servers'

interface Props {
  visible: boolean
  server?: Server | null
  deleting?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>
<template>
  <Dialog
    v-model:visible="isVisible"
    header="确认删除"
    modal
    class="w-md"
  >
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-red-500 text-xl"></i>
        <div>
          <p class="font-medium">确定要删除服务器吗？</p>
          <p class="text-sm text-muted-color mt-1">
            服务器：<span class="font-medium">{{ server?.name }}</span>
          </p>
        </div>
      </div>
      <p class="text-sm text-muted-color">此操作无法撤销，删除后将无法恢复。</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="取消" text @click="handleCancel" />
        <Button
          label="删除"
          severity="danger"
          @click="handleConfirm"
          :loading="deleting"
        />
      </div>
    </template>
  </Dialog>
</template>
