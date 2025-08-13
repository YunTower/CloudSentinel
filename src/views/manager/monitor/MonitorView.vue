<template>
  <div class="monitor-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-color mb-2">监控面板</h1>
      <p class="text-muted-color">实时监控服务器状态和性能指标</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <!-- 这里可以放置监控图表和指标 -->
      <Card>
        <template #title>系统概览</template>
        <template #content>
          <p class="text-muted-color">监控面板功能开发中...</p>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
// 监控面板逻辑
</script>

<style scoped>
.monitor-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
