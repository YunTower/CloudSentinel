<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { AlertRules, Notifications } from '@/types/settings/alerts'
import alertsApi from '@/apis/settings/alerts'
import { useToast } from 'primevue/usetoast'

const alertRules = ref<AlertRules>({
  cpu: {
    enabled: true,
    warning: 80,
    critical: 90,
  },
  memory: {
    enabled: true,
    warning: 85,
    critical: 95,
  },
  disk: {
    enabled: true,
    warning: 85,
    critical: 95,
  },
})

const notifications = ref<Notifications>({
  email: {
    enabled: false,
    smtp: '',
    port: 587,
    security: 'STARTTLS',
    from: '',
    to: '',
  },
  wechat: {
    enabled: false,
    webhook: '',
    mentioned: '@all',
  },
})

const securityOptions = [
  { label: 'None', value: 'NONE' },
  { label: 'STARTTLS', value: 'STARTTLS' },
  { label: 'SSL/TLS', value: 'SSL' },
]

const saving = ref(false)
const toast = useToast()

// 加载告警设置
const loadAlertSettings = async () => {
  try {
    const res = await alertsApi.getAlertsSettings()
    const data = res?.data
    if (data?.rules) {
      alertRules.value.cpu.enabled = !!data.rules.cpu?.enabled
      alertRules.value.cpu.warning = Number(data.rules.cpu?.warning) || alertRules.value.cpu.warning
      alertRules.value.cpu.critical = Number(data.rules.cpu?.critical) || alertRules.value.cpu.critical

      alertRules.value.memory.enabled = !!data.rules.memory?.enabled
      alertRules.value.memory.warning = Number(data.rules.memory?.warning) || alertRules.value.memory.warning
      alertRules.value.memory.critical = Number(data.rules.memory?.critical) || alertRules.value.memory.critical

      alertRules.value.disk.enabled = !!data.rules.disk?.enabled
      alertRules.value.disk.warning = Number(data.rules.disk?.warning) || alertRules.value.disk.warning
      alertRules.value.disk.critical = Number(data.rules.disk?.critical) || alertRules.value.disk.critical
    }
    if (data?.notifications) {
      notifications.value.email.enabled = !!data.notifications.email?.enabled
      notifications.value.email.smtp = String(data.notifications.email?.smtp || '')
      notifications.value.email.port = Number(data.notifications.email?.port) || notifications.value.email.port
      notifications.value.email.security = String(data.notifications.email?.security || 'STARTTLS')
      notifications.value.email.from = String(data.notifications.email?.from || '')
      notifications.value.email.to = String(data.notifications.email?.to || '')

      notifications.value.wechat.enabled = !!data.notifications.wechat?.enabled
      notifications.value.wechat.webhook = String(data.notifications.wechat?.webhook || '')
      notifications.value.wechat.mentioned = String(data.notifications.wechat?.mentioned || '@all')
    }
  } catch (error) {
    console.error('Failed to load alert settings:', error)
  }
}

// 保存告警设置
const saveAlertSettings = async () => {
  saving.value = true
  try {
    await alertsApi.saveAlertsSettings({
      rules: {
        cpu: alertRules.value.cpu,
        memory: alertRules.value.memory,
        disk: alertRules.value.disk,
      },
      notifications: notifications.value,
    })
    toast.add({ severity: 'success', summary: '保存成功', detail: '告警设置已更新', life: 3000 })
  } catch (error) {
    console.error('Failed to save alert settings:', error)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadAlertSettings()
})
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

              <div
                v-if="alertRules.cpu.enabled"
                class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
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

              <div
                v-if="alertRules.memory.enabled"
                class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">告警阈值 (%)</label>
                    <InputNumber
                      v-model="alertRules.memory.warning"
                      :min="1"
                      :max="100"
                      suffix="%"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">严重阈值 (%)</label>
                    <InputNumber
                      v-model="alertRules.memory.critical"
                      :min="1"
                      :max="100"
                      suffix="%"
                    />
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

              <div
                v-if="alertRules.disk.enabled"
                class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">告警阈值 (%)</label>
                    <InputNumber v-model="alertRules.disk.warning" :min="1" :max="100" suffix="%" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-color">严重阈值 (%)</label>
                    <InputNumber
                      v-model="alertRules.disk.critical"
                      :min="1"
                      :max="100"
                      suffix="%"
                    />
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

              <div
                v-if="notifications.email.enabled"
                class="space-y-3 ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
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
                    <Select
                      v-model="notifications.email.security"
                      :options="securityOptions"
                      optionLabel="label"
                      optionValue="value"
                    />
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

              <div
                v-if="notifications.wechat.enabled"
                class="space-y-3 ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">Webhook URL</label>
                  <InputText
                    v-model="notifications.wechat.webhook"
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">提及用户</label>
                  <InputText
                    v-model="notifications.wechat.mentioned"
                    placeholder="@all 或 用户ID"
                  />
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
        label="保存设置"
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
  margin: 0 auto;
}
</style>
