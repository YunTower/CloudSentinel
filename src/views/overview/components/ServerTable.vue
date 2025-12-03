<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressBar from 'primevue/progressbar'
import type { ServerItem } from '@/types/server'
import { formatSpeed, formatOS, getStatusColor } from '../utils'
import { getProgressBarColor, getProgressTextColor } from '@/utils/version.ts'

interface Props {
  servers: ServerItem[]
}

defineProps<Props>()
</script>

<template>
  <DataTable
    :value="servers"
    striped-rows
    :pt="{
      root: {
        class: 'rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden',
      },
    }"
  >
    <Column field="name" header="服务器" sortable style="min-width: 150px">
      <template #body="{ data }">
        <div class="flex flex-row items-center gap-2">
          <div
            :class="getStatusColor(data.status)"
            class="w-2 h-2 rounded-full shadow-sm animate-pulse-slow"
          ></div>
          <span class="font-medium text-color">{{ data.name }}</span>
        </div>
      </template>
    </Column>
    <Column field="location" header="地域" sortable style="width: 120px">
      <template #body="{ data }">
        <div class="flex items-center gap-1">
          <i class="pi pi-map-marker text-xs text-muted-color"></i>
          <span class="text-muted-color">{{ data.location || '-' }}</span>
        </div>
      </template>
    </Column>
    <Column field="os" header="系统" sortable style="width: 120px">
      <template #body="{ data }">
        <span class="text-color">{{ formatOS(data.os) || '-' }}</span>
      </template>
    </Column>
    <Column field="cpuUsage" header="CPU" sortable>
      <template #body="{ data }">
        <div class="flex flex-row gap-2 w-full">
          <span class="text-sm font-semibold" :class="getProgressTextColor(data.cpuUsage)">
            {{ data.cpuUsage }}%
          </span>
          <ProgressBar
            :show-value="false"
            :value="data.cpuUsage"
            class="w-full"
            :pt="{
              value: {
                class: getProgressBarColor(data.cpuUsage) + ' transition-all duration-500',
              },
            }"
          />
        </div>
      </template>
    </Column>
    <Column field="memoryUsage" header="内存" sortable>
      <template #body="{ data }">
        <div class="flex flex-row gap-2 w-full">
          <span class="text-sm font-semibold" :class="getProgressTextColor(data.memoryUsage)">
            {{ data.memoryUsage }}%
          </span>
          <ProgressBar
            :show-value="false"
            :value="data.memoryUsage"
            class="w-full"
            :pt="{
              value: {
                class: getProgressBarColor(data.memoryUsage) + ' transition-all duration-500',
              },
            }"
          />
        </div>
      </template>
    </Column>
    <Column field="diskUsage" header="磁盘" sortable>
      <template #body="{ data }">
        <div class="flex flex-row gap-2 w-full">
          <span class="text-sm font-semibold" :class="getProgressTextColor(data.diskUsage)">
            {{ data.diskUsage }}%
          </span>
          <ProgressBar
            :show-value="false"
            :value="data.diskUsage"
            class="w-full"
            :pt="{
              value: {
                class: getProgressBarColor(data.diskUsage) + ' transition-all duration-500',
              },
            }"
          />
        </div>
      </template>
    </Column>
    <Column field="networkIO" header="网络" style="width: 150px">
      <template #body="{ data }">
        <div class="flex flex-row text-xs gap-2">
          <div class="flex flex-center gap-1">
            <i class="pi pi-arrow-up !text-sm text-green-600 dark:text-green-400"></i>
            <span class="text-muted-color">{{ formatSpeed(data.networkIO.upload) }}</span>
          </div>
          <div class="flex flex-center gap-1">
            <i class="pi pi-arrow-down !text-sm text-blue-600 dark:text-blue-400"></i>
            <span class="text-muted-color">{{ formatSpeed(data.networkIO.download) }}</span>
          </div>
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}

:deep(.p-datatable-table-container .p-datatable-tbody > tr:last-child > td) {
  border-bottom-width: 0 !important;
}
</style>
