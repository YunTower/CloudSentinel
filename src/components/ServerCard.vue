<template>
  <Card class="server-card h-full">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :class="statusClass"></div>
          <span class="text-sm text-gray-600">{{ statusText }}</span>
        </div>
        <div class="text-xs text-gray-500">{{ location }}</div>
      </div>
    </template>

    <template #title>
      <div class="truncate" :title="serverName">{{ serverName }}</div>
    </template>

    <template #content>
      <div class="space-y-4">
        <!-- CPU 和内存 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ cpuUsage }}%</div>
            <div class="text-xs text-gray-500">CPU</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ memoryUsage }}%</div>
            <div class="text-xs text-gray-500">内存</div>
          </div>
        </div>

        <!-- 磁盘使用 -->
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">磁盘使用</span>
            <span class="font-medium">{{ diskUsage }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-orange-500 h-2 rounded-full transition-all duration-300" :style="{ width: diskUsage + '%' }"></div>
          </div>
        </div>

        <!-- 服务器规格 -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-gray-500">核心数:</span>
            <span class="font-medium">{{ cores }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500">位置:</span>
            <span class="font-medium truncate" :title="location">{{ location }}</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface ServerCardProps {
  serverName: string
  status: 'online' | 'offline' | 'maintenance'
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  cores: number
  location: string
}

const props = defineProps<ServerCardProps>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'online':
      return 'bg-green-500'
    case 'offline':
      return 'bg-red-500'
    case 'maintenance':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-500'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'online':
      return '在线'
    case 'offline':
      return '离线'
    case 'maintenance':
      return '维护中'
    default:
      return '未知'
  }
})
</script>

<style scoped>
.server-card {
  min-height: 320px;
}

.server-card :deep(.p-card) {
  height: 100%;
}

.server-card :deep(.p-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.server-card :deep(.p-card-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.server-card :deep(.p-card-content > div) {
  flex: 1;
}
</style>
