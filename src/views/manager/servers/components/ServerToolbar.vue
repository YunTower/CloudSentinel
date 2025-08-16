<script setup lang="ts">
import type { StatusOption } from './types'

interface Props {
  searchQuery: string
  statusFilter: string
  statusOptions: StatusOption[]
  filteredCount: number
  totalCount: number
  filterLoading?: boolean
  statistics: {
    online: number
    offline: number
    error: number
  }
}

const props = defineProps<Props>()

defineEmits<{
  'update:searchQuery': [value: string]
  'update:statusFilter': [value: string]
  refresh: []
  'add-server': []
}>()
</script>
<template>
  <div class="space-y-4">
    <!-- 快速统计行 -->
    <Card>
      <template #content>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- 在线服务器 -->
            <div class="relative group">
              <div
                class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 min-w-[80px] text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 cursor-pointer"
              >
                <div class="flex items-center justify-center gap-2 mb-1">
                  <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span class="text-xs font-medium text-green-700 dark:text-green-300">在线</span>
                </div>
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-xl font-bold text-green-600 dark:text-green-400">{{
                    statistics.online
                  }}</span>
                  <span class="text-sm text-green-600 dark:text-green-400">台</span>
                </div>
              </div>
              <div
                class="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium"
              >
                {{ Math.round((statistics.online / totalCount) * 100) }}%
              </div>
            </div>

            <!-- 离线服务器 -->
            <div class="relative group">
              <div
                class="bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 min-w-[80px] text-center hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-all duration-200 cursor-pointer"
              >
                <div class="flex items-center justify-center gap-2 mb-1">
                  <div class="w-2 h-2 rounded-full bg-gray-500"></div>
                  <span class="text-xs font-medium text-gray-700 dark:text-gray-300">离线</span>
                </div>
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-xl font-bold text-gray-600 dark:text-gray-400">{{
                    statistics.offline
                  }}</span>
                  <span class="text-sm text-gray-600 dark:text-gray-400">台</span>
                </div>
              </div>
            </div>

            <!-- 异常服务器 -->
            <div class="relative group">
              <div
                class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 min-w-[80px] text-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 cursor-pointer"
              >
                <div class="flex items-center justify-center gap-2 mb-1">
                  <div class="w-2 h-2 rounded-full bg-red-500"></div>
                  <span class="text-xs font-medium text-red-700 dark:text-red-300">异常</span>
                </div>
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-xl font-bold text-red-600 dark:text-red-400">{{
                    statistics.error
                  }}</span>
                  <span class="text-sm text-red-600 dark:text-red-400">台</span>
                </div>
              </div>
              <div
                v-if="statistics.error > 0"
                class="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full h-[20px] w-[20px] text-center font-medium"
              >
                !
              </div>
            </div>

            <!-- 总计 -->
            <div class="ml-3 pl-4 border-l border-surface-200 dark:border-surface-700">
              <div
                class="bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2 min-w-[80px] text-center hover:from-surface-100 hover:to-surface-200 dark:hover:from-surface-700 dark:hover:to-surface-800 transition-all duration-200 cursor-pointer group"
              >
                <div class="flex items-center justify-center gap-2 mb-1">
                  <i class="pi pi-server text-primary text-sm"></i>
                  <span class="text-xs font-medium text-muted-color">总计</span>
                </div>
                <div class="flex items-baseline justify-center gap-1">
                  <span class="text-xl font-bold text-primary">{{ totalCount }}</span>
                  <span class="text-sm text-muted-color">台</span>
                </div>

                <!-- 状态分布指示器 -->
                <div class="mt-1 flex items-center justify-center gap-1">
                  <div
                    class="w-1.5 h-1.5 rounded-full bg-green-500"
                    :style="{ opacity: statistics.online / totalCount }"
                  ></div>
                  <div
                    class="w-1.5 h-1.5 rounded-full bg-gray-500"
                    :style="{ opacity: statistics.offline / totalCount }"
                  ></div>
                  <div
                    class="w-1.5 h-1.5 rounded-full bg-red-500"
                    :style="{ opacity: statistics.error / totalCount }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧统计信息 -->
          <div class="text-right">
            <div class="text-sm text-muted-color">
              筛选结果：<span class="font-medium text-primary">{{ filteredCount }}</span> /
              <span class="font-medium">{{ totalCount }}</span>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- 搜索和操作区域 -->
    <Card>
      <template #content>
        <div class="flex items-center justify-between">
          <!-- 左侧搜索和筛选 -->
          <div class="flex items-center gap-4">
            <!-- 搜索框 -->
            <div class="relative">
              <InputText
                :model-value="searchQuery"
                @update:model-value="(value) => $emit('update:searchQuery', value as string)"
                placeholder="搜索服务器名称、IP或位置..."
                class="w-80 pl-10 pr-4 py-2.5 border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-lg"
              />
            </div>

            <!-- 状态筛选 -->
            <div class="relative">
              <Select
                :model-value="statusFilter"
                @update:model-value="(value) => $emit('update:statusFilter', value as string)"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="状态筛选"
                :loading="props.filterLoading"
                class="w-44 border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          </div>

          <!-- 右侧操作按钮 -->
          <div class="flex items-center gap-3">
            <Button
              icon="pi pi-refresh"
              text
              @click="$emit('refresh')"
              v-tooltip.top="'刷新数据'"
            />
            <Button
              label="添加服务器"
              icon="pi pi-plus"
              @click="$emit('add-server')"
              class="px-6 py-2.5 font-medium"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
