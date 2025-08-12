<script setup lang="ts">
import { ref } from 'vue'

interface AlertRule {
  enabled: boolean
  warning: number
  critical: number
}

interface AlertRules {
  cpu: AlertRule
  memory: AlertRule
  disk: AlertRule
}

interface EmailNotification {
  enabled: boolean
  smtp: string
  port: number
  security: string
  from: string
  to: string
}

interface WechatNotification {
  enabled: boolean
  webhook: string
  mentioned: string
}

interface Notifications {
  email: EmailNotification
  wechat: WechatNotification
}

const alertRules = ref<AlertRules>({
  cpu: {
    enabled: true,
    warning: 80,
    critical: 90
  },
  memory: {
    enabled: true,
    warning: 85,
    critical: 95
  },
  disk: {
    enabled: true,
    warning: 85,
    critical: 95
  }
})

const notifications = ref<Notifications>({
  email: {
    enabled: false,
    smtp: '',
    port: 587,
    security: 'STARTTLS',
    from: '',
    to: ''
  },
  wechat: {
    enabled: false,
    webhook: '',
    mentioned: '@all'
  }
})

const securityOptions = [
  { label: 'None', value: 'NONE' },
  { label: 'STARTTLS', value: 'STARTTLS' },
  { label: 'SSL/TLS', value: 'SSL' }
]

const saving = ref(false)

// 保存告警设置
const saveAlertSettings = async () => {
  saving.value = true
  try {
    // 实际项目中这里会调用 API 保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Alert settings saved:', {
      alertRules: alertRules.value,
      notifications: notifications.value
    })
    // 可以添加 Toast 提示
  } catch (error) {
    console.error('Failed to save alert settings:', error)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="alerts-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-color mb-2">告警设置</h1>
      <p class="text-muted-color">配置系统监控告警规则和通知方式</p>
    </div>

    <div class="space-y-6">
      <!-- 告警规则 -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-bell text-primary"></i>
            <span>告警规则</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- CPU 告警 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">CPU 使用率告警</label>
                  <p class="text-xs text-muted-color mt-1">监控服务器 CPU 使用率</p>
                </div>
                <ToggleSwitch v-model="alertRules.cpu.enabled" />
              </div>

              <div v-if="alertRules.cpu.enabled" class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">告警阈值 (%)</label>
                    <InputNumber v-model="alertRules.cpu.warning" :min="1" :max="100" suffix="%" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">严重阈值 (%)</label>
                    <InputNumber v-model="alertRules.cpu.critical" :min="1" :max="100" suffix="%" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 内存告警 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">内存使用率告警</label>
                  <p class="text-xs text-muted-color mt-1">监控服务器内存使用率</p>
                </div>
                <ToggleSwitch v-model="alertRules.memory.enabled" />
              </div>

              <div v-if="alertRules.memory.enabled" class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">告警阈值 (%)</label>
                    <InputNumber v-model="alertRules.memory.warning" :min="1" :max="100" suffix="%" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">严重阈值 (%)</label>
                    <InputNumber v-model="alertRules.memory.critical" :min="1" :max="100" suffix="%" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 磁盘告警 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">磁盘使用率告警</label>
                  <p class="text-xs text-muted-color mt-1">监控服务器磁盘使用率</p>
                </div>
                <ToggleSwitch v-model="alertRules.disk.enabled" />
              </div>

              <div v-if="alertRules.disk.enabled" class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">告警阈值 (%)</label>
                    <InputNumber v-model="alertRules.disk.warning" :min="1" :max="100" suffix="%" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">严重阈值 (%)</label>
                    <InputNumber v-model="alertRules.disk.critical" :min="1" :max="100" suffix="%" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- 通知设置 -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-send text-primary"></i>
            <span>通知设置</span>
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 邮件通知 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">邮件通知</label>
                  <p class="text-xs text-muted-color mt-1">通过邮件发送告警通知</p>
                </div>
                <ToggleSwitch v-model="notifications.email.enabled" />
              </div>

              <div v-if="notifications.email.enabled" class="space-y-3 ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">SMTP 服务器</label>
                  <InputText v-model="notifications.email.smtp" placeholder="smtp.example.com" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">端口</label>
                    <InputNumber v-model="notifications.email.port" :min="1" :max="65535" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">加密方式</label>
                    <Select v-model="notifications.email.security" :options="securityOptions" optionLabel="label" optionValue="value" />
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">发件人邮箱</label>
                  <InputText v-model="notifications.email.from" placeholder="alert@example.com" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">收件人邮箱</label>
                  <InputText v-model="notifications.email.to" placeholder="admin@example.com" />
                </div>
              </div>
            </div>

            <!-- 企业微信通知 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">企业微信通知</label>
                  <p class="text-xs text-muted-color mt-1">通过企业微信机器人发送告警</p>
                </div>
                <ToggleSwitch v-model="notifications.wechat.enabled" />
              </div>

              <div v-if="notifications.wechat.enabled" class="space-y-3 ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">Webhook URL</label>
                  <InputText v-model="notifications.wechat.webhook" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">提及用户</label>
                  <InputText v-model="notifications.wechat.mentioned" placeholder="@all 或 用户ID" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end mt-6">
      <Button
        label="保存告警设置"
        icon="pi pi-save"
        @click="saveAlertSettings"
        :loading="saving"
        class="px-6"
      />
    </div>
  </div>
</template>
<style scoped>
.alerts-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
