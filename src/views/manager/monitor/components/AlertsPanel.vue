<script setup lang="ts">
import { ref, computed } from 'vue'
import AlertDetailDialog from './AlertDetailDialog.vue'
import type { AlertInfo } from '@/types/manager/monitor'

interface Props {
  alerts: AlertInfo[]
  loading?: boolean
}

interface AlertTypeOption {
  label: string
  value: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'alert-click': [alert: AlertInfo]
  'alert-detail': [alert: AlertInfo]
  'mark-read': [alertId: string]
  'mark-all-read': []
  refresh: []
  'view-all': []
  'view-server': [serverId: string]
}>()

// 告警类型筛选
const alertTypeFilter = ref('all')
const alertTypeOptions: AlertTypeOption[] = [
  { label: '全部', value: 'all' },
  { label: '错误', value: 'error' },
  { label: '警告', value: 'warning' },
  { label: '信息', value: 'info' },
]

// 弹窗状态管理
const alertDetailVisible = ref(false)
const selectedAlert = ref<AlertInfo | null>(null)
const alertDetailLoading = ref(false)

// 过滤后的告警列表
const filteredAlerts = computed(() => {
  let filtered = props.alerts

  // 按类型筛选
  if (alertTypeFilter.value !== 'all') {
    filtered = filtered.filter((alert) => alert.type === alertTypeFilter.value)
  }

  // 按时间排序（最新的在前）
  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// 未读告警数量
const unreadCount = computed(() => {
  return filteredAlerts.value.filter((alert) => !alert.isRead).length
})

// 事件处理
const handleAlertClick = (alert: AlertInfo) => {
  selectedAlert.value = alert
  alertDetailVisible.value = true
  emit('alert-click', alert)
}

const markAsRead = (alert: AlertInfo) => {
  emit('mark-read', alert.id)
}

const markAllAsRead = () => {
  emit('mark-all-read')
}

// 弹窗事件处理
const handleMarkRead = (alertId: string) => {
  emit('mark-read', alertId)
  // 同步更新选中的告警状态
  if (selectedAlert.value && selectedAlert.value.id === alertId) {
    selectedAlert.value.isRead = true
  }
}

const handleViewServer = (serverId: string) => {
  emit('view-server', serverId)
}

// 样式和工具函数
const getAlertIcon = (type: string) => {
  const icons = {
    error: 'pi pi-exclamation-triangle text-red-600',
    warning: 'pi pi-exclamation-circle text-yellow-600',
    info: 'pi pi-info-circle text-blue-600',
  }
  return icons[type as keyof typeof icons] || icons.info
}

const getAlertTitleClass = (type: string) => {
  const classes = {
    error: 'text-red-700 dark:text-red-400',
    warning: 'text-yellow-700 dark:text-yellow-400',
    info: 'text-blue-700 dark:text-blue-400',
  }
  return classes[type as keyof typeof classes] || classes.info
}

const getAlertCardClass = (alert: AlertInfo) => {
  const baseClass = 'border-surface-200 dark:border-surface-700'

  const typeClasses = {
    error: 'hover:border-red-300 dark:hover:border-red-600',
    warning: 'hover:border-yellow-300 dark:hover:border-yellow-600',
    info: 'hover:border-blue-300 dark:hover:border-blue-600',
  }

  const typeClass = typeClasses[alert.type as keyof typeof typeClasses] || typeClasses.info

  return `${baseClass} ${typeClass}`
}

const getAlertTypeText = (type: string) => {
  const texts = {
    error: '错误',
    warning: '警告',
    info: '信息',
  }
  return texts[type as keyof typeof texts] || '未知'
}

const getAlertSeverity = (type: string) => {
  const severities = {
    error: 'danger',
    warning: 'warn',
    info: 'info',
  }
  return severities[type as keyof typeof severities] || 'info'
}

const formatAlertTime = (timestamp: string) => {
  const now = new Date()
  const alertTime = new Date(timestamp)
  const diffMs = now.getTime() - alertTime.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return `${diffSeconds}秒前`
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    // 显示具体日期时间
    return alertTime.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
</script>
<template>
  <div class="alerts-panel">
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-bell text-primary"></i>
            <span>告警信息</span>
            <Badge v-if="unreadCount > 0" :value="unreadCount" severity="danger" class="ml-2" />
          </div>
          <div class="flex items-center gap-2">
            <!-- 告警类型筛选 -->
            <Select
              v-model="alertTypeFilter"
              :options="alertTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="类型筛选"
              class="w-32"
              size="small"
            />
            <!-- 标记全部已读 -->
            <Button
              v-if="unreadCount > 0"
              icon="pi pi-check"
              size="small"
              text
              @click="markAllAsRead"
              v-tooltip.top="'标记全部已读'"
            />
            <!-- 刷新按钮 -->
            <Button
              icon="pi pi-refresh"
              size="small"
              text
              @click="$emit('refresh')"
              v-tooltip.top="'刷新'"
              :loading="loading"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="!loading">
          <!-- 告警列表 -->
          <div v-if="filteredAlerts.length > 0" class="space-y-3 max-h-100 overflow-y-auto">
            <div
              v-for="alert in filteredAlerts"
              :key="alert.id"
              class="alert-item p-4 rounded-lg border transition-all duration-200 cursor-pointer"
              :class="getAlertCardClass(alert)"
              @click="handleAlertClick(alert)"
            >
              <!-- 告警头部 -->
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i :class="getAlertIcon(alert.type)" class="text-lg"></i>
                  <div>
                    <div class="font-medium text-sm" :class="getAlertTitleClass(alert.type)">
                      {{ alert.title }}
                    </div>
                    <div class="text-xs text-muted-color mt-1">
                      {{ alert.serverName }} ({{ alert.serverId }})
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <!-- 未读指示器 -->
                  <div v-if="!alert.isRead" class="w-2 h-2 rounded-full bg-red-500"></div>
                  <!-- 告警类型标签 -->
                  <Tag
                    :value="getAlertTypeText(alert.type)"
                    :severity="getAlertSeverity(alert.type)"
                    class="text-xs"
                  />
                </div>
              </div>

              <!-- 告警内容 -->
              <div class="text-sm text-color mb-3">
                {{ alert.message }}
              </div>

              <!-- 告警时间 -->
              <div class="flex items-center justify-between text-xs text-muted-color">
                <div class="flex items-center gap-1">
                  <i class="pi pi-clock"></i>
                  <span>{{ formatAlertTime(alert.timestamp) }}</span>
                </div>
                <!-- 操作按钮 -->
                <div class="flex items-center gap-1">
                  <Button
                    v-if="!alert.isRead"
                    icon="pi pi-check"
                    size="small"
                    text
                    @click.stop="markAsRead(alert)"
                    v-tooltip.top="'标记已读'"
                    class="text-xs p-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="text-center py-8">
            <i class="pi pi-bell-slash text-4xl text-muted-color mb-4"></i>
            <div class="text-lg font-medium text-muted-color mb-2">
              {{ alertTypeFilter === 'all' ? '暂无告警信息' : '没有匹配的告警' }}
            </div>
            <div class="text-sm text-muted-color">
              {{ alertTypeFilter === 'all' ? '系统运行正常' : '请尝试其他筛选条件' }}
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-else class="flex items-center justify-center py-8">
          <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
        </div>
      </template>
      <template #footer v-if="filteredAlerts.length > 0">
        <div
          class="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700"
        >
          <div class="text-sm text-muted-color">
            共 {{ filteredAlerts.length }} 条告警，{{ unreadCount }} 条未读
          </div>
          <Button
            label="查看全部"
            icon="pi pi-arrow-right"
            text
            size="small"
            @click="$emit('view-all')"
          />
        </div>
      </template>
    </Card>

    <!-- 告警详情弹窗 -->
    <AlertDetailDialog
      v-model:visible="alertDetailVisible"
      :alert="selectedAlert"
      :loading="alertDetailLoading"
      @mark-read="handleMarkRead"
      @view-server="handleViewServer"
    />
  </div>
</template>
<style scoped>
.alerts-panel {
  width: 100%;
}

.alert-item {
  transform: scale(1);
  transition: all 0.2s ease-in-out;
}

.alerts-panel ::-webkit-scrollbar {
  width: 6px;
}

.alerts-panel ::-webkit-scrollbar-track {
  background: transparent;
}

.alerts-panel ::-webkit-scrollbar-thumb {
  background-color: rgb(var(--surface-400));
  border-radius: 3px;
}

@keyframes pulse-red {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
