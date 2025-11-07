<script setup lang="ts">
import { ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import type { Server } from '@/types/manager/servers'

interface Props {
  servers: Server[]
  loading?: boolean
  deletingServerId?: string
  restartingServerId?: string
  expandingServerId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'delete-server': [server: Server]
  'edit-server': [server: Server]
  'restart-server': [server: Server]
  'expand-server': [serverId: string]
}>()

const confirm = useConfirm()
const expandedRows = ref<{ [key: string]: boolean }>({})

// 处理行展开事件
const onRowExpand = (event: { data: Server }) => {
  emit('expand-server', event.data.id)
}

// 自动展开指定服务器详情
const autoExpandServer = (serverId: string) => {
  const server = props.servers.find((s) => s.id === serverId)
  if (server) {
    expandedRows.value[serverId] = true
    emit('expand-server', serverId)
  }
}

// 暴露方法给父组件
defineExpose({
  autoExpandServer,
})

// 工具函数
const getStatusColor = (status: string) => {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500'
}

const getStatusText = (status: string) => {
  const texts = {
    all: '全部',
    online: '在线',
    offline: '离线',
    error: '异常',
  }
  return texts[status as keyof typeof texts] || '未知'
}

const getStatusSeverity = (status: string) => {
  const severities = {
    online: 'success',
    offline: 'secondary',
    error: 'danger',
  }
  return severities[status as keyof typeof severities] || 'secondary'
}

const getCpuTextColorClass = (cpu: number) => {
  if (cpu >= 90) return 'text-red-600 dark:text-red-400'
  if (cpu >= 70) return 'text-orange-600 dark:text-orange-400'
  if (cpu >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getMemoryTextColorClass = (memory: number) => {
  if (memory >= 90) return 'text-red-600 dark:text-red-400'
  if (memory >= 70) return 'text-orange-600 dark:text-orange-400'
  if (memory >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getDiskTextColorClass = (disk: number) => {
  if (disk >= 90) return 'text-red-600 dark:text-red-400'
  if (disk >= 70) return 'text-orange-600 dark:text-orange-400'
  if (disk >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const formatSpeed = (bytes: number) => {
  if (bytes === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatUptime = (uptime: string) => {
  if (!uptime) return '0天0时0分'
  const uptimeParts = uptime.split('天')
  const days = uptimeParts[0]
  const timeParts = uptimeParts[1]?.split('时') || ['0', '0分']
  const hours = timeParts[0]
  const minutes = timeParts[1]?.replace('分', '') || '0'
  return `${days}天${hours}时${minutes}分`
}

// 确认删除
const confirmDelete = (event: Event, server: Server) => {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `确定要删除服务器 "${server.name}" 吗？`,
    header: '删除确认',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '删除',
      severity: 'danger',
    },
    accept: () => {
      emit('delete-server', server)
    },
  })
}

// 确认重启
const confirmRestart = (event: Event, server: Server) => {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `确定要重启服务器 "${server.name}" 吗？`,
    header: '重启确认',
    icon: 'pi pi-refresh',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '重启',
      severity: 'warn',
    },
    accept: () => {
      emit('restart-server', server)
    },
  })
}
</script>
<template>
  <Card>
    <template #content>
      <DataTable
        :value="servers"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[5, 10, 20, 50]"
        :loading="loading"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="显示第 {first} 到 {last} 条，共 {totalRecords} 条"
        class="w-full"
        stripedRows
        hover
        v-model:expandedRows="expandedRows"
        dataKey="id"
        scrollable
        @row-expand="onRowExpand"
      >
        <!-- 空数据占位 -->
        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 px-4">
            <p class="text-lg font-medium text-color mb-2">暂无服务器数据</p>
            <p class="text-sm text-muted-color text-center max-w-md">
              {{
                loading
                  ? '正在加载服务器列表...'
                  : '点击右上角"添加服务器"按钮来添加您的第一台服务器'
              }}
            </p>
          </div>
        </template>

        <!-- 展开列 -->
        <Column expander style="width: 3rem" />

        <!-- 服务器名称列 -->
        <Column field="name" header="服务器名称" sortable class="w-fil">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full" :class="getStatusColor(data.status)"></div>
              <p class="flex-1 min-w-0 space-x-1">
                <span class="font-medium text-color truncate">{{ data.name }}</span>
                <span class="text-muted-color truncate"> ({{ data.ip }}) </span>
              </p>
            </div>
          </template>
        </Column>

        <!-- 状态列 -->
        <Column field="status" header="状态" sortable class="w-24">
          <template #body="{ data }">
            <Tag
              :value="getStatusText(data.status)"
              :severity="getStatusSeverity(data.status)"
              class="text-xs"
            />
          </template>
        </Column>

        <!-- 位置列 -->
        <Column field="location" header="位置" sortable class="w-32">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i v-if="data.location !== ''" class="pi pi-map-marker text-muted-color text-xs"></i>
              <span class="text-sm truncate">{{ data.location == '' ? '-' : data.location }}</span>
            </div>
          </template>
        </Column>

        <!-- 系统列 -->
        <Column field="os" header="系统" sortable class="w-40">
          <template #body="{ data }">
            <div class="space-y-1">
              <div class="text-sm font-medium text-color">
                {{ data.os }} ({{ data.architecture || 'x86_64' }})
              </div>
            </div>
          </template>
        </Column>

        <!-- 运行时间列 -->
        <Column field="uptime" header="运行时间" sortable class="w-32">
          <template #body="{ data }">
            <div class="text-left">
              <div class="text-sm font-medium text-color">{{ formatUptime(data.uptime) }}</div>
            </div>
          </template>
        </Column>

        <!-- 操作列 -->
        <Column header="操作" class="w-24">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                @click="confirmDelete($event, data)"
                v-tooltip.top="'删除'"
                :loading="props.deletingServerId === data.id"
                class="hover:bg-red-50"
              />
            </div>
          </template>
        </Column>

        <!-- 展开行内容 -->
        <template #expansion="{ data }">
          <div
            class="p-6 bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700"
          >
            <!-- 展开时的Loading状态 -->
            <div
              v-if="props.expandingServerId === data.id"
              class="flex items-center justify-center py-8"
            >
              <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
            </div>
            <!-- 正常内容 -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- 左侧：基本信息 -->
              <div class="space-y-4">
                <h4
                  class="text-lg font-semibold text-color border-b border-surface-200 dark:border-surface-700 pb-2"
                >
                  <i class="pi pi-info-circle text-primary mr-2"></i>基本信息
                </h4>
                <div class="space-y-3">
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">服务器名称</span>
                    <span class="font-medium">{{ data.name }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">IP地址</span>
                    <span class="font-mono text-sm">{{ data.ip }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">状态</span>
                    <Tag
                      :value="getStatusText(data.status)"
                      :severity="getStatusSeverity(data.status)"
                    />
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">位置</span>
                    <span>{{ data.location == '' ? '-' : data.location }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">操作系统</span>
                    <span>{{ data.os }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">系统架构</span>
                    <span>{{ data.architecture || 'x86_64' }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">运行时间</span>
                    <span>{{ formatUptime(data.uptime) }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">内核版本</span>
                    <span>{{ data.kernel || '5.15.0' }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700"
                  >
                    <span class="text-muted-color">主机名</span>
                    <span>{{ data.hostname || 'unknown' }}</span>
                  </div>
                </div>
              </div>

              <!-- 右侧：系统资源 -->
              <div class="space-y-4">
                <h4
                  class="text-lg font-semibold text-color border-b border-surface-200 dark:border-surface-700 pb-2"
                >
                  <i class="pi pi-chart-line text-primary mr-2"></i>系统资源
                </h4>
                <div class="space-y-4">
                  <!-- CPU 详细 -->
                  <div
                    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <i class="pi pi-microchip text-primary"></i>
                        <span class="font-medium">CPU 使用率</span>
                      </div>
                      <span class="text-2xl font-bold" :class="getCpuTextColorClass(data.cpu)">
                        {{ data.cpu }}%
                      </span>
                    </div>
                    <ProgressBar
                      :value="data.cpu"
                      :showValue="false"
                      class="h-3"
                      :pt="{
                        value: {
                          style: {
                            backgroundColor:
                              data.cpu >= 90
                                ? '#ef4444'
                                : data.cpu >= 70
                                  ? '#f97316'
                                  : data.cpu >= 50
                                    ? '#eab308'
                                    : '#22c55e',
                          },
                        },
                      }"
                    />
                  </div>

                  <!-- 内存详细 -->
                  <div
                    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <i class="pi pi-history text-primary"></i>
                        <span class="font-medium">内存使用率</span>
                      </div>
                      <span
                        class="text-2xl font-bold"
                        :class="getMemoryTextColorClass(data.memory)"
                      >
                        {{ data.memory }}%
                      </span>
                    </div>
                    <ProgressBar
                      :value="data.memory"
                      :showValue="false"
                      class="h-3"
                      :pt="{
                        value: {
                          style: {
                            backgroundColor:
                              data.memory >= 90
                                ? '#ef4444'
                                : data.memory >= 70
                                  ? '#f97316'
                                  : data.memory >= 50
                                    ? '#eab308'
                                    : '#22c55e',
                          },
                        },
                      }"
                    />
                  </div>

                  <!-- 磁盘详细 -->
                  <div
                    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <i class="pi pi-database text-primary"></i>
                        <span class="font-medium">磁盘使用率</span>
                      </div>
                      <span class="text-2xl font-bold" :class="getDiskTextColorClass(data.disk)">
                        {{ data.disk }}%
                      </span>
                    </div>
                    <ProgressBar
                      :value="data.disk"
                      :showValue="false"
                      class="h-3"
                      :pt="{
                        value: {
                          style: {
                            backgroundColor:
                              data.disk >= 90
                                ? '#ef4444'
                                : data.disk >= 70
                                  ? '#f97316'
                                  : data.disk >= 50
                                    ? '#eab308'
                                    : '#22c55e',
                          },
                        },
                      }"
                    />
                  </div>

                  <!-- 网络信息 -->
                  <div
                    class="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700"
                  >
                    <div class="flex items-center gap-2 mb-3">
                      <i class="pi pi-wifi text-primary"></i>
                      <span class="font-medium">网络 I/O</span>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="text-center">
                        <div class="flex items-center justify-center gap-2 mb-1">
                          <i class="pi pi-arrow-up text-green-600 text-sm"></i>
                          <span class="text-xs text-muted-color">上传</span>
                        </div>
                        <div class="text-xl font-bold text-green-600">
                          {{ formatSpeed(data.networkIO?.upload || 0) }}
                        </div>
                      </div>
                      <div class="text-center">
                        <div class="flex items-center justify-center gap-2 mb-1">
                          <i class="pi pi-arrow-down text-blue-600 text-sm"></i>
                          <span class="text-xs text-muted-color">下载</span>
                        </div>
                        <div class="text-xl font-bold text-blue-600">
                          {{ formatSpeed(data.networkIO?.download || 0) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div
              class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3"
            >
              <Button
                label="重启服务"
                icon="pi pi-refresh"
                text
                severity="warn"
                @click="confirmRestart($event, data)"
                :loading="props.restartingServerId === data.id"
                class="shadow-sm"
              />
              <Button label="查看日志" icon="pi pi-file-text" text class="shadow-sm" />
              <Button
                label="编辑服务器"
                icon="pi pi-pencil"
                @click="$emit('edit-server', data)"
                class="shadow-sm"
              />
            </div>
          </div>
        </template>
      </DataTable>
    </template>
  </Card>

  <!-- 确认弹窗 -->
  <ConfirmPopup />
</template>
