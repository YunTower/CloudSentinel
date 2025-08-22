<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime } from '@/utils/formatters'
import type { AlertInfo } from '@/types/manager/monitor'

interface Props {
  visible: boolean
  alert: AlertInfo | null
  loading?: boolean
}

interface Emits {
  'update:visible': [value: boolean]
  'mark-read': [alertId: string]
  'view-server': [serverId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 弹窗可见性管理
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const getAlertSeverity = (type: string) => {
  const severities = {
    error: 'danger',
    warning: 'warn',
    info: 'info',
  }
  return severities[type as keyof typeof severities] || 'info'
}

// 操作函数
const handleMarkRead = () => {
  if (props.alert && !props.alert.isRead) {
    emit('mark-read', props.alert.id)
  }
}

const handleViewServer = () => {
  if (props.alert) {
    emit('view-server', props.alert.serverId)
    dialogVisible.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="alert ? alert.title : '告警详情'"
    :style="{ width: '80vw', maxWidth: '600px' }"
    :dismissableMask="true"
  >
    <div v-if="alert && !loading">
      <!-- 告警基本信息 -->
      <div class="flex items-start gap-3 mb-6">
        <div class="flex-1">
          <p class="text-color mb-3">{{ alert.message }}</p>

          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-muted-color">服务器:</span>
                <span class="font-medium">{{ alert.serverName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-color">时间:</span>
                <span class="font-medium">{{ formatDateTime(alert.timestamp) }}</span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-muted-color">类型:</span>
                <Tag :value="alert.type" :severity="getAlertSeverity(alert.type)" class="text-xs" />
              </div>
              <div class="flex justify-between">
                <span class="text-muted-color">状态:</span>
                <span class="font-medium" :class="alert.isRead ? 'text-green-600' : 'text-red-600'">
                  {{ alert.isRead ? '已读' : '未读' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="flex items-center justify-center py-8">
      <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-8">
      <i class="pi pi-bell-slash text-4xl text-muted-color mb-4"></i>
      <div class="text-lg font-medium text-muted-color">未选择告警</div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <Button
            v-if="alert && !alert.isRead"
            label="标记已读"
            icon="pi pi-check"
            severity="success"
            @click="handleMarkRead"
          />
          <Button
            label="查看服务器"
            icon="pi pi-server"
            severity="secondary"
            @click="handleViewServer"
            :disabled="!alert"
          />
        </div>
        <Button
          label="关闭"
          icon="pi pi-times"
          severity="secondary"
          @click="dialogVisible = false"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* 响应式调整 */
@media (max-width: 768px) {
  .grid-cols-1.md\\:grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>
