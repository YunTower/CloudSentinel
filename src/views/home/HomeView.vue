<template>
  <div class="space-y-6 p-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      <ServerCard
        v-for="server in servers"
        :key="server.id"
        :server-name="server.name"
        :status="server.status"
        :cpu-usage="server.cpuUsage"
        :memory-usage="server.memoryUsage"
        :disk-usage="server.diskUsage"
        :total-storage="server.totalStorage"
        :cores="server.cores"
        :location="server.location"
        :os="server.os"
        :architecture="server.architecture"
        :network-i-o="server.networkIO"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import ServerCard from './components/ServerCard.vue'

// 模拟服务器数据
const servers = ref([
  {
    id: 1,
    name: 'Production Server Alpha',
    status: 'online' as const,
    cpuUsage: 45,
    memoryUsage: 78,
    diskUsage: 52,  // 综合多个磁盘的平均使用率
    totalStorage: '1.5TB',
    cores: 16,
    location: '中国香港',
    os: 'Ubuntu 22.04 LTS',
    architecture: 'x64',
    networkIO: {upload: 1250, download: 2340}
  },
  {
    id: 2,
    name: 'Database Server Beta',
    status: 'online' as const,
    cpuUsage: 23,
    memoryUsage: 89,
    diskUsage: 78,  // 综合使用率
    totalStorage: '7TB',
    cores: 32,
    location: '新加坡',
    os: 'CentOS 8',
    architecture: 'x64',
    networkIO: {upload: 890, download: 1560}
  },
  {
    id: 3,
    name: 'Web Server Gamma',
    status: 'maintenance' as const,
    cpuUsage: 12,
    memoryUsage: 34,
    diskUsage: 28,
    totalStorage: '256GB',
    cores: 8,
    location: '日本东京',
    os: 'Ubuntu 20.04 LTS',
    architecture: 'x64',
    networkIO: {upload: 45, download: 120}
  },
  {
    id: 4,
    name: 'Cache Server Delta',
    status: 'offline' as const,
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 15,
    totalStorage: '128GB',
    cores: 4,
    location: '美国洛杉矶',
    os: 'Debian 11',
    architecture: 'x64',
    networkIO: {upload: 0, download: 0}
  },
  {
    id: 5,
    name: 'Load Balancer Echo',
    status: 'online' as const,
    cpuUsage: 67,
    memoryUsage: 56,
    diskUsage: 33,
    totalStorage: '512GB',
    cores: 12,
    location: '德国法兰克福',
    os: 'RHEL 9',
    architecture: 'x64',
    networkIO: {upload: 3420, download: 5670}
  },
  {
    id: 6,
    name: 'File Storage Server Foxtrot',
    status: 'online' as const,
    cpuUsage: 18,
    memoryUsage: 42,
    diskUsage: 76,  // 两个8TB磁盘的综合使用率
    totalStorage: '16TB',
    cores: 24,
    location: '英国伦敦',
    os: 'Windows Server 2022',
    architecture: 'x64',
    networkIO: {upload: 567, download: 890}
  }
])
</script>
