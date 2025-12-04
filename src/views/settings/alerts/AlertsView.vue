<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { Notifications } from '@/types/settings/alerts'
import alertsApi from '@/apis/settings/alerts'

const notifications = ref<Notifications>({
  email: {
    enabled: false,
    smtp: '',
    port: 587,
    security: 'STARTTLS',
    from: '',
    to: '',
    password: '',
  },
  webhook: {
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
const loading = ref(false)
const testing = ref({
  email: false,
  webhook: false,
})
const toast = useToast()

// 检查是否至少配置了一个通知渠道
const hasNotificationChannel = (): boolean => {
  // 检查邮件通知是否已启用且配置完整
  if (notifications.value.email.enabled) {
    const email = notifications.value.email
    if (
      email.smtp.trim() &&
      email.port > 0 &&
      email.port <= 65535 &&
      email.from.trim() &&
      email.to.trim()
    ) {
      return true
    }
  }

  // 检查企业微信通知是否已启用且配置完整
  if (notifications.value.webhook.enabled) {
    const webhook = notifications.value.webhook
    if (
      webhook.webhook.trim() &&
      (webhook.webhook.startsWith('http://') || webhook.webhook.startsWith('https://'))
    ) {
      return true
    }
  }

  return false
}


// 加载告警设置
const loadAlertSettings = async () => {
  loading.value = true
  try {
    const res = await alertsApi.getAlertsSettings()
    if (res?.status && res?.data) {
      const data = res.data

      // 加载通知配置
      if (data.notifications) {
        if (data.notifications.email) {
          notifications.value.email.enabled = data.notifications.email.enabled
          notifications.value.email.smtp = String(data.notifications.email.smtp || '')
          notifications.value.email.port = Number(data.notifications.email.port) || 587
          notifications.value.email.security = String(
            data.notifications.email.security || 'STARTTLS',
          )
          notifications.value.email.from = String(data.notifications.email.from || '')
          notifications.value.email.to = String(data.notifications.email.to || '')
          notifications.value.email.password = '' // 不从后端加载密码
        }
        if (data.notifications.webhook) {
          notifications.value.webhook.enabled = data.notifications.webhook.enabled
          notifications.value.webhook.webhook = String(data.notifications.webhook.webhook || '')
          notifications.value.webhook.mentioned = String(
            data.notifications.webhook.mentioned || '@all',
          )
        }
      }
    }
  } catch (error: unknown) {
    console.error('Failed to load alert settings:', error)
    const errorMessage = error instanceof Error ? error.message : '加载告警设置失败，请刷新页面重试'
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: errorMessage,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}


// 验证通知配置
const validateNotifications = (): boolean => {
  // 验证邮件配置
  if (notifications.value.email.enabled) {
    if (!notifications.value.email.smtp.trim()) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '请输入 SMTP 服务器地址',
        life: 3000,
      })
      return false
    }
    if (notifications.value.email.port < 1 || notifications.value.email.port > 65535) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '端口号必须在 1-65535 之间',
        life: 3000,
      })
      return false
    }
    if (!notifications.value.email.from.trim()) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '请输入发件人邮箱',
        life: 3000,
      })
      return false
    }
    if (!notifications.value.email.to.trim()) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '请输入收件人邮箱',
        life: 3000,
      })
      return false
    }
  }

  // 验证 Webhook 配置
  if (notifications.value.webhook.enabled) {
    if (!notifications.value.webhook.webhook.trim()) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '请输入 Webhook URL',
        life: 3000,
      })
      return false
    }
    if (
      !notifications.value.webhook.webhook.startsWith('http://') &&
      !notifications.value.webhook.webhook.startsWith('https://')
    ) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: 'Webhook URL 必须以 http:// 或 https:// 开头',
        life: 3000,
      })
      return false
    }
  }

  return true
}

// 测试告警设置
const testAlert = async (type: 'email' | 'webhook') => {
  // 验证配置
  if (type === 'email') {
    if (
      !notifications.value.email.smtp.trim() ||
      notifications.value.email.port < 1 ||
      notifications.value.email.port > 65535 ||
      !notifications.value.email.from.trim() ||
      !notifications.value.email.to.trim()
    ) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '请填写完整的邮件配置信息',
        life: 3000,
      })
      return
    }
  } else {
    if (!notifications.value.webhook.webhook.trim()) {
      toast.add({
        severity: 'warn',
        summary: '验证失败',
        detail: '请填写 Webhook URL',
        life: 3000,
      })
      return
    }
  }

  testing.value[type] = true
  try {
    // 准备配置数据
    const config = type === 'email' ? notifications.value.email : notifications.value.webhook

    const res = await alertsApi.testAlertSettings({
      type,
      config,
    })

    if (res && typeof res === 'object' && 'status' in res && res.status) {
      toast.add({
        severity: 'success',
        summary: '测试成功',
        detail: '测试消息已发送',
        life: 3000,
      })
    } else {
      const errorMsg =
        res && typeof res === 'object' && 'message' in res ? String(res.message) : '测试失败'
      throw new Error(errorMsg)
    }
  } catch (error: unknown) {
    console.error(`Failed to test ${type} alert:`, error)
    const errorMessage = error instanceof Error ? error.message : '测试发送失败，请检查配置'
    toast.add({
      severity: 'error',
      summary: '测试失败',
      detail: errorMessage,
      life: 5000,
    })
  } finally {
    testing.value[type] = false
  }
}

// 保存告警设置
const saveAlertSettings = async () => {
  // 验证通知配置
  if (!validateNotifications()) {
    return
  }

  saving.value = true
  try {
    const res = await alertsApi.saveAlertsSettings({
      notifications: notifications.value,
    })

    if (res && typeof res === 'object' && 'status' in res && res.status) {
      toast.add({
        severity: 'success',
        summary: '保存成功',
        detail: '告警设置已更新',
        life: 3000,
      })
    } else {
      const errorMsg =
        res && typeof res === 'object' && 'message' in res ? String(res.message) : '保存失败'
      throw new Error(errorMsg)
    }
  } catch (error: unknown) {
    console.error('Failed to save alert settings:', error)
    const errorMessage = error instanceof Error ? error.message : '保存告警设置失败，请重试'
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: errorMessage,
      life: 5000,
    })
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
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">告警设置</h1>
        <p class="text-muted-color">配置告警通知方式</p>
      </div>
      <div>
        <Button
          size="small"
          class="px-6"
          label="保存设置"
          icon="pi pi-save"
          @click="saveAlertSettings"
          :loading="saving"
          :disabled="loading"
        />
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <div v-else class="space-y-6">
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
                  <Message size="small" severity="secondary" variant="simple"
                    >通过邮件发送告警通知</Message
                  >
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
                  <label class="text-sm font-medium text-color">SMTP 密码</label>
                  <Password
                    v-model="notifications.email.password"
                    :feedback="false"
                    toggleMask
                    placeholder="若已设置，留空则不修改"
                    inputClass="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">发件人邮箱</label>
                  <InputText v-model="notifications.email.from" placeholder="alert@example.com" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">收件人邮箱</label>
                  <InputText v-model="notifications.email.to" placeholder="admin@example.com" />
                </div>
                <div class="pt-2">
                  <Button
                    label="发送测试邮件"
                    icon="pi pi-send"
                    severity="secondary"
                    size="small"
                    :loading="testing.email"
                    :disabled="testing.email"
                    @click="testAlert('email')"
                  />
                </div>
              </div>
            </div>

            <!-- Webhook 通知 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">Webhook 通知</label>
                  <Message size="small" severity="secondary" variant="simple"
                    >通过 Webhook 发送告警通知</Message
                  >
                </div>
                <ToggleSwitch v-model="notifications.webhook.enabled" />
              </div>

              <div
                v-if="notifications.webhook.enabled"
                class="space-y-3 ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">Webhook URL</label>
                  <InputText
                    v-model="notifications.webhook.webhook"
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">提及用户</label>
                  <InputText
                    v-model="notifications.webhook.mentioned"
                    placeholder="@all 或 用户ID"
                  />
                </div>
                <div class="pt-2">
                  <Button
                    label="发送测试消息"
                    icon="pi pi-send"
                    severity="secondary"
                    size="small"
                    :loading="testing.webhook"
                    :disabled="testing.webhook"
                    @click="testAlert('webhook')"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
<style scoped>
.alerts-view {
  padding: 2rem;
  margin: 0 auto;
}
</style>
