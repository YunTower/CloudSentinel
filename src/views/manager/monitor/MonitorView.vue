<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import OverviewStats from './components/OverviewStats.vue'
import SystemCharts from './components/SystemCharts.vue'
import ServerStatusGrid from './components/ServerStatusGrid.vue'
import AlertsPanel from './components/AlertsPanel.vue'
import ResourceRanking from './components/ResourceRanking.vue'
import DashboardSettings from './components/DashboardSettings.vue'
import { useDashboardConfig, type CardConfig } from '@/composables/useDashboardConfig'

import type {
  SystemOverview,
  PerformanceMetrics,
  MonitorServer,
  AlertInfo,
  ResourceRanking as ResourceRankingType,
  ChartDataPoint
} from './components/types'

// 服务和路由
const toast = useToast()
const router = useRouter()

// 仪表板配置
const { cards, visibleCards, saveConfig, resetConfig } = useDashboardConfig()
const settingsVisible = ref(false)

// 加载状态
const overviewLoading = ref(true)
const chartsLoading = ref(true)
const serversLoading = ref(true)
const alertsLoading = ref(true)
const rankingLoading = ref(true)

// 数据状态
const systemOverview = ref<SystemOverview>({
  totalServers: 0,
  onlineServers: 0,
  offlineServers: 0,
  errorServers: 0,
  warningServers: 0,
  avgCpuUsage: 0,
  avgMemoryUsage: 0,
  avgDiskUsage: 0,
  totalNetworkUpload: 0,
  totalNetworkDownload: 0
})

const performanceMetrics = ref<PerformanceMetrics>({
  cpu: [],
  memory: [],
  disk: [],
  network: {
    upload: [],
    download: []
  }
})

const servers = ref<MonitorServer[]>([])
const alerts = ref<AlertInfo[]>([])
const resourceRanking = ref<ResourceRankingType>({
  cpu: [],
  memory: [],
  disk: []
})

// 自动刷新定时器
let refreshTimer: number | null = null
const REFRESH_INTERVAL = 30000 // 30秒



// 初始化数据
const initializeData = async () => {
  try {
    await Promise.all([
      loadSystemOverview(),
      loadPerformanceMetrics(),
      loadServers(),
      loadAlerts(),
      loadResourceRanking()
    ])
  } catch (error) {
    console.error('初始化监控数据失败:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '监控数据加载失败，请稍后重试',
      life: 5000
    })
  }
}

// 加载系统概览
const loadSystemOverview = async () => {
  overviewLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    systemOverview.value = {
      totalServers: 8,
      onlineServers: 6,
      offlineServers: 1,
      errorServers: 1,
      warningServers: 0,
      avgCpuUsage: 45,
      avgMemoryUsage: 62,
      avgDiskUsage: 78,
      totalNetworkUpload: 1536000, // 1.5 MB/s
      totalNetworkDownload: 3072000, // 3 MB/s
    }
  } finally {
    overviewLoading.value = false
  }
}

// 加载性能指标
const loadPerformanceMetrics = async () => {
  chartsLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1200))

    // 生成模拟的时间序列数据
    const now = new Date()
    const points: ChartDataPoint[] = []

    for (let i = 29; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000) // 每分钟一个点
      points.push({
        time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        value: Math.random() * 100
      })
    }

    performanceMetrics.value = {
      cpu: points.map(p => ({ ...p, value: 30 + Math.random() * 40 })),
      memory: points.map(p => ({ ...p, value: 40 + Math.random() * 35 })),
      disk: points.map(p => ({ ...p, value: 60 + Math.random() * 25 })),
      network: {
        upload: points.map(p => ({ ...p, value: Math.random() * 2097152 })), // 0-2MB/s
        download: points.map(p => ({ ...p, value: Math.random() * 5242880 })) // 0-5MB/s
      }
    }
  } finally {
    chartsLoading.value = false
  }
}

// 加载服务器列表
const loadServers = async () => {
  serversLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 800))

    servers.value = [
      {
        id: '1',
        name: 'Web服务器-01',
        ip: '192.168.1.100',
        status: 'online',
        cpu: 45,
        memory: 62,
        disk: 78,
        networkIO: { upload: 1024000, download: 2048000 },
        location: '中国/北京',
        os: 'Ubuntu 22.04',
        architecture: 'x86_64',
        uptime: '15天2时30分',
        lastUpdate: new Date(Date.now() - 30000).toISOString()
      },
      {
        id: '2',
        name: '数据库服务器-01',
        ip: '192.168.1.101',
        status: 'online',
        cpu: 78,
        memory: 85,
        disk: 92,
        networkIO: { upload: 512000, download: 1024000 },
        location: '中国/北京',
        os: 'CentOS 8',
        architecture: 'x86_64',
        uptime: '10天5时15分',
        lastUpdate: new Date(Date.now() - 45000).toISOString()
      },
      {
        id: '3',
        name: '缓存服务器-01',
        ip: '192.168.1.102',
        status: 'offline',
        cpu: 0,
        memory: 0,
        disk: 0,
        networkIO: { upload: 0, download: 0 },
        location: '中国/上海',
        os: 'Ubuntu 20.04',
        architecture: 'x86_64',
        uptime: '0天0时0分',
        lastUpdate: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: '4',
        name: '监控服务器-01',
        ip: '192.168.1.104',
        status: 'error',
        cpu: 95,
        memory: 98,
        disk: 99,
        networkIO: { upload: 2048000, download: 4096000 },
        location: '中国/深圳',
        os: 'Debian 11',
        architecture: 'x86_64',
        uptime: '5天18时30分',
        lastUpdate: new Date(Date.now() - 120000).toISOString()
      }
    ]
  } finally {
    serversLoading.value = false
  }
}

// 加载告警信息
const loadAlerts = async () => {
  alertsLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 600))

    alerts.value = [
      {
        id: '1',
        type: 'error',
        title: 'CPU 使用率过高',
        message: '监控服务器-01 的 CPU 使用率已达到 95%，超过告警阈值',
        serverName: '监控服务器-01',
        serverId: '4',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        isRead: false
      },
      {
        id: '2',
        type: 'warning',
        title: '磁盘空间不足',
        message: '数据库服务器-01 的磁盘使用率达到 92%，建议清理空间',
        serverName: '数据库服务器-01',
        serverId: '2',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        isRead: false
      },
      {
        id: '3',
        type: 'error',
        title: '服务器离线',
        message: '缓存服务器-01 已离线超过 30 分钟，请检查网络连接',
        serverName: '缓存服务器-01',
        serverId: '3',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        isRead: true
      },
      {
        id: '4',
        type: 'info',
        title: '系统更新完成',
        message: 'Web服务器-01 已成功完成系统更新',
        serverName: 'Web服务器-01',
        serverId: '1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isRead: true
      }
    ]
  } finally {
    alertsLoading.value = false
  }
}

// 加载资源排行
const loadResourceRanking = async () => {
  rankingLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 700))

    resourceRanking.value = {
      cpu: [
        { serverId: '4', serverName: '监控服务器-01', value: 95, percentage: 100, status: 'error' },
        { serverId: '2', serverName: '数据库服务器-01', value: 78, percentage: 82, status: 'online' },
        { serverId: '1', serverName: 'Web服务器-01', value: 45, percentage: 47, status: 'online' },
        { serverId: '3', serverName: '缓存服务器-01', value: 0, percentage: 0, status: 'offline' }
      ],
      memory: [
        { serverId: '4', serverName: '监控服务器-01', value: 98, percentage: 100, status: 'error' },
        { serverId: '2', serverName: '数据库服务器-01', value: 85, percentage: 87, status: 'online' },
        { serverId: '1', serverName: 'Web服务器-01', value: 62, percentage: 63, status: 'online' },
        { serverId: '3', serverName: '缓存服务器-01', value: 0, percentage: 0, status: 'offline' }
      ],
      disk: [
        { serverId: '4', serverName: '监控服务器-01', value: 99, percentage: 100, status: 'error' },
        { serverId: '2', serverName: '数据库服务器-01', value: 92, percentage: 93, status: 'online' },
        { serverId: '1', serverName: 'Web服务器-01', value: 78, percentage: 79, status: 'online' },
        { serverId: '3', serverName: '缓存服务器-01', value: 0, percentage: 0, status: 'offline' }
      ]
    }
  } finally {
    rankingLoading.value = false
  }
}

// 事件处理函数
const handleServerClick = (server: MonitorServer) => {
  router.push(`/manager/servers?server=${server.id}`)
}

const handleServerClickById = (serverId: string) => {
  router.push(`/manager/servers?server=${serverId}`)
}

const handleAlertClick = (alert: AlertInfo) => {
  console.log('Alert clicked:', alert)
}

const handleAlertDetail = (alert: AlertInfo) => {
  router.push(`/manager/servers?server=${alert.serverId}`)
}

const handleMarkAlertRead = (alertId: string) => {
  const alert = alerts.value.find(a => a.id === alertId)
  if (alert) {
    alert.isRead = true
  }
}

const handleMarkAllAlertsRead = () => {
  alerts.value.forEach(alert => {
    alert.isRead = true
  })
  toast.add({
    severity: 'success',
    summary: '操作成功',
    detail: '所有告警已标记为已读',
    life: 3000
  })
}

const handleViewAllAlerts = () => {
  router.push('/settings/alerts')
}



const handleViewServerFromAlert = (serverId: string) => {
  router.push(`/manager/servers?server=${serverId}`)
}

// 仪表板设置事件处理
const handleOpenSettings = () => {
  settingsVisible.value = true
}

const handleSaveSettings = async (newCards: CardConfig[]) => {
  try {
    await saveConfig(newCards)
    toast.add({
      severity: 'success',
      summary: '保存成功',
      detail: '仪表板配置已保存',
      life: 3000
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: '仪表板配置保存失败，请重试',
      life: 5000
    })
  }
}

const handleResetSettings = async () => {
  try {
    await resetConfig()
    toast.add({
      severity: 'info',
      summary: '重置成功',
      detail: '仪表板已重置为默认布局',
      life: 3000
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '重置失败',
      detail: '仪表板重置失败，请重试',
      life: 5000
    })
  }
}



// 刷新函数
const refreshServers = () => {
  loadServers()
  toast.add({
    severity: 'info',
    summary: '刷新成功',
    detail: '服务器状态已更新',
    life: 2000
  })
}

const refreshAlerts = () => {
  loadAlerts()
  toast.add({
    severity: 'info',
    summary: '刷新成功',
    detail: '告警信息已更新',
    life: 2000
  })
}

const refreshAllData = async () => {
  await Promise.all([
    loadSystemOverview(),
    loadPerformanceMetrics(),
    loadServers(),
    loadAlerts(),
    loadResourceRanking()
  ])
}



// 自动刷新
const startAutoRefresh = () => {
  refreshTimer = setInterval(() => {
    refreshAllData()
  }, REFRESH_INTERVAL)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期
onMounted(() => {
  initializeData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>
<template>
  <div class="monitor-view">
    <Toast />

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">监控面板</h1>
        <p class="text-muted-color">实时监控服务器状态和性能指标</p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-cog"
          label="自定义"
          severity="secondary"
          outlined
          @click="handleOpenSettings"
          class="text-sm"
        />
      </div>
    </div>

    <div class="space-y-6">
      <!-- 所有卡片被隐藏时的提示 -->
      <div v-if="visibleCards.length === 0" class="text-center py-16">
        <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-8 border border-surface-200 dark:border-surface-700">
          <i class="pi pi-eye-slash text-6xl text-muted-color mb-4 block"></i>
          <h3 class="text-xl font-semibold text-color mb-3">没有可显示的卡片</h3>
          <p class="text-muted-color mb-6 max-w-md mx-auto">
            您已隐藏了所有监控卡片。点击右上角的"自定义"按钮来显示您需要的卡片。
          </p>
        </div>
      </div>

      <!-- 动态渲染卡片 -->
      <template v-else>
        <template v-for="card in visibleCards" :key="card.id">
          <!-- 概览统计卡片 -->
          <OverviewStats
            v-if="card.id === 'overview'"
            :overview="systemOverview"
            :loading="overviewLoading"
          />

          <!-- 系统图表卡片 -->
          <SystemCharts
            v-else-if="card.id === 'charts'"
            :metrics="performanceMetrics"
            :loading="chartsLoading"
          />

          <!-- 告警面板卡片 -->
          <AlertsPanel
            v-else-if="card.id === 'alerts'"
            :alerts="alerts"
            :loading="alertsLoading"
            @alert-click="handleAlertClick"
            @alert-detail="handleAlertDetail"
            @mark-read="handleMarkAlertRead"
            @mark-all-read="handleMarkAllAlertsRead"
            @refresh="refreshAlerts"
            @view-all="handleViewAllAlerts"
            @view-server="handleViewServerFromAlert"
          />

          <!-- 服务器状态网格卡片 -->
          <ServerStatusGrid
            v-else-if="card.id === 'servers'"
            :servers="servers"
            :loading="serversLoading"
            @server-click="handleServerClick"
            @refresh="refreshServers"
          />

          <!-- 资源排行榜卡片 -->
          <ResourceRanking
            v-else-if="card.id === 'ranking'"
            :ranking="resourceRanking"
            :loading="rankingLoading"
            @server-click="handleServerClickById"
          />
        </template>
      </template>
    </div>

    <!-- 仪表板设置对话框 -->
    <DashboardSettings
      v-model:visible="settingsVisible"
      :cards="cards"
      @update:cards="handleSaveSettings"
      @reset="handleResetSettings"
    />

  </div>
</template>
<style scoped>
.monitor-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .monitor-view {
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .monitor-view {
    padding: 0.75rem;
  }
}


.monitor-view > *:nth-child(2) {
  animation-delay: 0.1s;
}

.monitor-view > *:nth-child(3) {
  animation-delay: 0.2s;
}

.monitor-view > *:nth-child(4) {
  animation-delay: 0.3s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .monitor-view .grid {
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .monitor-view .grid {
    gap: 0.75rem;
  }

  .monitor-view .space-y-6 > * + * {
    margin-top: 1rem;
  }
}

@media (min-width: 1920px) {
  .monitor-view {
    max-width: 1600px;
    padding: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .monitor-view > * {
    animation: none;
  }
}

@media print {
  .monitor-view {
    padding: 0;
    max-width: none;
  }
}
</style>
