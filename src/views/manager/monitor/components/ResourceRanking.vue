<script setup lang="ts">
import { ref } from 'vue'
import type { ResourceRanking } from './types'

interface Props {
  ranking: ResourceRanking
  loading?: boolean
}

interface TabOption {
  label: string
  value: string
}

defineProps<Props>()

const emit = defineEmits<{
  'server-click': [serverId: string]
}>()

// 选项卡管理
const activeTab = ref('cpu')
const tabOptions: TabOption[] = [
  { label: 'CPU', value: 'cpu' },
  { label: '内存', value: 'memory' },
  { label: '磁盘', value: 'disk' }
]

// 工具函数
const getRankBadgeClass = (index: number) => {
  switch (index) {
    case 0:
      return 'text-white bg-gradient-to-br from-red-500 to-red-600' // 红色（最高占用）
    case 1:
      return 'text-white bg-gradient-to-br from-orange-500 to-orange-600' // 橙色
    case 2:
      return 'text-white bg-gradient-to-br from-yellow-500 to-yellow-600' // 黄色
    default:
      return 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700' // 普通
  }
}

const getStatusIndicator = (status: string) => {
  const classes = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  }
  return classes[status as keyof typeof classes] || 'bg-gray-500'
}

const getStatusText = (status: string) => {
  const texts = {
    online: '在线',
    offline: '离线',
    error: '异常',
    warning: '警告'
  }
  return texts[status as keyof typeof texts] || '未知'
}

const getCpuColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 70) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getMemoryColorClass = (usage: number) => {
  if (usage >= 90) return 'text-red-600 dark:text-red-400'
  if (usage >= 80) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getDiskColorClass = (usage: number) => {
  if (usage >= 95) return 'text-red-600 dark:text-red-400'
  if (usage >= 85) return 'text-orange-600 dark:text-orange-400'
  if (usage >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const getCpuProgressColor = (usage: number) => {
  if (usage >= 90) return '#ef4444'
  if (usage >= 70) return '#f97316'
  if (usage >= 50) return '#eab308'
  return '#22c55e'
}

const getMemoryProgressColor = (usage: number) => {
  if (usage >= 90) return '#ef4444'
  if (usage >= 80) return '#f97316'
  if (usage >= 60) return '#eab308'
  return '#22c55e'
}

const getDiskProgressColor = (usage: number) => {
  if (usage >= 95) return '#ef4444'
  if (usage >= 85) return '#f97316'
  if (usage >= 70) return '#eab308'
  return '#22c55e'
}
</script>
<template>
  <div class="resource-ranking">
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-bar text-primary"></i>
            <span>资源使用排行</span>
          </div>
          <div class="flex items-center gap-2">
            <!-- 资源类型切换 -->
            <SelectButton
              v-model="activeTab"
              :options="tabOptions"
              optionLabel="label"
              optionValue="value"
              :allowEmpty="false"
              class="text-sm"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="!loading">
          <!-- 排行榜内容 -->
          <div class="space-y-3">
            <!-- CPU 排行 -->
            <div v-if="activeTab === 'cpu'" class="ranking-list">
              <div class="text-sm font-medium text-muted-color mb-3 flex items-center gap-2">
                <i class="pi pi-microchip text-blue-600"></i>
                <span>CPU 使用率排行</span>
                <span class="text-xs">(前10名)</span>
              </div>
              <div v-if="ranking.cpu.length > 0" class="space-y-2">
                <div
                  v-for="(item, index) in ranking.cpu.slice(0, 10)"
                  :key="item.serverId"
                  class="ranking-item flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer"
                  @click="emit('server-click', item.serverId)"
                >
                  <!-- 排名和服务器信息 -->
                  <div class="flex items-center gap-3">
                    <!-- 排名徽章 -->
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      :class="getRankBadgeClass(index)"
                    >
                      {{ index + 1 }}
                    </div>
                    <!-- 服务器信息 -->
                    <div>
                      <div class="font-medium text-sm">{{ item.serverName }}</div>
                      <div class="flex items-center gap-2 text-xs text-muted-color">
                        <div
                          class="w-2 h-2 rounded-full"
                          :class="getStatusIndicator(item.status)"
                        ></div>
                        <span>{{ getStatusText(item.status) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 使用率信息 -->
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="text-lg font-bold" :class="getCpuColorClass(item.value)">
                        {{ item.value }}%
                      </div>
                      <div class="text-xs text-muted-color">使用率</div>
                    </div>
                    <!-- 进度条 -->
                    <div class="w-20">
                      <ProgressBar
                        :value="item.percentage"
                        :showValue="false"
                        class="h-2"
                        :pt="{
                          value: {
                            style: {
                              backgroundColor: getCpuProgressColor(item.value)
                            }
                          }
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-6 text-muted-color">
                <i class="pi pi-microchip text-2xl mb-2"></i>
                <div>暂无 CPU 数据</div>
              </div>
            </div>

            <!-- 内存排行 -->
            <div v-if="activeTab === 'memory'" class="ranking-list">
              <div class="text-sm font-medium text-muted-color mb-3 flex items-center gap-2">
                <i class="pi pi-database text-green-600"></i>
                <span>内存使用率排行</span>
                <span class="text-xs">(前10名)</span>
              </div>
              <div v-if="ranking.memory.length > 0" class="space-y-2">
                <div
                  v-for="(item, index) in ranking.memory.slice(0, 10)"
                  :key="item.serverId"
                  class="ranking-item flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer"
                  @click="emit('server-click', item.serverId)"
                >
                  <!-- 排名和服务器信息 -->
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      :class="getRankBadgeClass(index)"
                    >
                      {{ index + 1 }}
                    </div>
                    <div>
                      <div class="font-medium text-sm">{{ item.serverName }}</div>
                      <div class="flex items-center gap-2 text-xs text-muted-color">
                        <div
                          class="w-2 h-2 rounded-full"
                          :class="getStatusIndicator(item.status)"
                        ></div>
                        <span>{{ getStatusText(item.status) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 使用率信息 -->
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="text-lg font-bold" :class="getMemoryColorClass(item.value)">
                        {{ item.value }}%
                      </div>
                      <div class="text-xs text-muted-color">使用率</div>
                    </div>
                    <div class="w-20">
                      <ProgressBar
                        :value="item.percentage"
                        :showValue="false"
                        class="h-2"
                        :pt="{
                          value: {
                            style: {
                              backgroundColor: getMemoryProgressColor(item.value)
                            }
                          }
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-6 text-muted-color">
                <i class="pi pi-database text-2xl mb-2"></i>
                <div>暂无内存数据</div>
              </div>
            </div>

            <!-- 磁盘排行 -->
            <div v-if="activeTab === 'disk'" class="ranking-list">
              <div class="text-sm font-medium text-muted-color mb-3 flex items-center gap-2">
                <i class="pi pi-hdd text-orange-600"></i>
                <span>磁盘使用率排行</span>
                <span class="text-xs">(前10名)</span>
              </div>
              <div v-if="ranking.disk.length > 0" class="space-y-2">
                <div
                  v-for="(item, index) in ranking.disk.slice(0, 10)"
                  :key="item.serverId"
                  class="ranking-item flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer"
                  @click="emit('server-click', item.serverId)"
                >
                  <!-- 排名和服务器信息 -->
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      :class="getRankBadgeClass(index)"
                    >
                      {{ index + 1 }}
                    </div>
                    <div>
                      <div class="font-medium text-sm">{{ item.serverName }}</div>
                      <div class="flex items-center gap-2 text-xs text-muted-color">
                        <div
                          class="w-2 h-2 rounded-full"
                          :class="getStatusIndicator(item.status)"
                        ></div>
                        <span>{{ getStatusText(item.status) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 使用率信息 -->
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="text-lg font-bold" :class="getDiskColorClass(item.value)">
                        {{ item.value }}%
                      </div>
                      <div class="text-xs text-muted-color">使用率</div>
                    </div>
                    <div class="w-20">
                      <ProgressBar
                        :value="item.percentage"
                        :showValue="false"
                        class="h-2"
                        :pt="{
                          value: {
                            style: {
                              backgroundColor: getDiskProgressColor(item.value)
                            }
                          }
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-6 text-muted-color">
                <i class="pi pi-hdd text-2xl mb-2"></i>
                <div>暂无磁盘数据</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-else class="flex items-center justify-center py-8">
          <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
          <span class="ml-3 text-muted-color">正在加载排行数据...</span>
        </div>
      </template>
    </Card>
  </div>
</template>
<style scoped>
.resource-ranking {
  width: 100%;
}

.ranking-item {
  transform: scale(1);
  transition: all 0.2s ease-in-out;
}

.ranking-list {
  max-height: 24rem;
  overflow-y: auto;
}

.ranking-list::-webkit-scrollbar {
  width: 6px;
}

.ranking-list::-webkit-scrollbar-track {
  background: transparent;
}

.ranking-list::-webkit-scrollbar-thumb {
  background-color: rgb(var(--surface-400));
  border-radius: 3px;
}

.w-20 {
  min-width: 5rem;
}
</style>
