<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useNotifications } from '@/composables/useNotifications'
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
    hasPassword: false,
  },
  webhook: {
    enabled: false,
    webhook: '',
    mentioned: '@all',
    platform: 'generic',
  },
})

const securityOptions = [
  { label: 'None', value: 'NONE' },
  { label: 'STARTTLS', value: 'STARTTLS' },
  { label: 'SSL/TLS', value: 'SSL' },
]

const webhookPlatformOptions = [
  { label: '企业微信', value: 'wechat' },
  { label: '飞书', value: 'feishu' },
  { label: '通用', value: 'generic' },
]

// 根据选择的平台返回不同的 placeholder
const webhookPlaceholder = computed(() => {
  const platform = notifications.value.webhook.platform
  switch (platform) {
    case 'feishu':
      return 'https://open.feishu.cn/open-apis/bot/v2/hook/...'
    case 'wechat':
      return 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...'
    case 'generic':
      return 'https://example.com/webhook'
    default:
      return '请输入 Webhook URL'
  }
})

// 判断当前平台是否支持提及功能
const supportsMention = computed(() => {
  const platform = notifications.value.webhook.platform
  return platform === 'feishu' || platform === 'wechat'
})

const saving = ref(false)
const loading = ref(false)
const testing = ref({
  email: false,
  webhook: false,
})
const { toast } = useNotifications()

// 服务器离线/上线告警开关
const hasNotificationChannel = ref(false)
const alertServerOfflineEnabled = ref(false)
const alertServerOnlineEnabled = ref(false)

// 提及用户列表
const mentionedUsers = ref<string[]>([])
// 当前输入的提及用户ID
const mentionedInput = ref('')

// 添加提及用户
const addMentionedUser = () => {
  const value = mentionedInput.value.trim()
  if (!value) {
    return
  }

  // 检查是否已存在
  if (mentionedUsers.value.includes(value)) {
    toast.add({
      severity: 'warn',
      summary: '提示',
      detail: '该用户已添加',
      life: 2000,
    })
    return
  }

  // 添加用户
  mentionedUsers.value.push(value)
  mentionedInput.value = ''

  updateMentionedString()
}

// 删除提及用户
const removeMentionedUser = (index: number) => {
  mentionedUsers.value.splice(index, 1)
  updateMentionedString()
}

// 更新 mentioned 字符串
const updateMentionedString = () => {
  if (mentionedUsers.value.length === 0) {
    notifications.value.webhook.mentioned = ''
  } else {
    notifications.value.webhook.mentioned = mentionedUsers.value.join(',')
  }
}

// 从字符串加载提及用户数组
const loadMentionedUsers = () => {
  const mentioned = notifications.value.webhook.mentioned || ''
  if (mentioned === '@all') {
    mentionedUsers.value = ['@all']
  } else if (mentioned) {
    mentionedUsers.value = mentioned
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id)
  } else {
    mentionedUsers.value = []
  }
}

// 监听平台类型变化，动态处理提及用户
watch(
  () => notifications.value.webhook.platform,
  (newPlatform, oldPlatform) => {
    // 如果切换到不支持提及的平台，清空提及用户
    if (newPlatform === 'generic' || !newPlatform) {
      if (oldPlatform === 'feishu' || oldPlatform === 'wechat') {
        mentionedUsers.value = []
        notifications.value.webhook.mentioned = ''
      }
    }
  },
)

// 加载告警设置
const loadAlertSettings = async () => {
  loading.value = true
  try {
    const res = await alertsApi.getAlertsSettings()
    if (!res?.status || !res?.data?.notifications) {
      return
    }

    const { email, webhook } = res.data.notifications

    // 加载邮件配置
    if (email) {
      Object.assign(notifications.value.email, {
        enabled: email.enabled || false,
        smtp: String(email.smtp || ''),
        port: Number(email.port) || 587,
        security: String(email.security || 'STARTTLS'),
        from: String(email.from || ''),
        to: String(email.to || ''),
        password: '',
        hasPassword: email.hasPassword || false,
      })
    }

    // 加载 Webhook 配置
    if (webhook) {
      Object.assign(notifications.value.webhook, {
        enabled: webhook.enabled || false,
        webhook: String(webhook.webhook || ''),
        mentioned: String(webhook.mentioned || ''),
        platform: webhook.platform
          ? (webhook.platform as 'feishu' | 'wechat' | 'generic')
          : 'generic',
      })
      // 加载提及用户列表
      loadMentionedUsers()
    }

    // 服务器离线/上线告警开关
    hasNotificationChannel.value = res.data.hasNotificationChannel ?? false
    alertServerOfflineEnabled.value = res.data.alertServerOfflineEnabled ?? false
    alertServerOnlineEnabled.value = res.data.alertServerOnlineEnabled ?? false
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
    // 如果是 webhook，需要先同步提及用户数组到字符串
    if (type === 'webhook') {
      updateMentionedString()
    }
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

  // 同步提及用户数组到字符串
  updateMentionedString()

  saving.value = true
  try {
    const res = await alertsApi.saveAlertsSettings({
      notifications: notifications.value,
      alertServerOfflineEnabled: alertServerOfflineEnabled.value,
      alertServerOnlineEnabled: alertServerOnlineEnabled.value,
    })

    if (res && typeof res === 'object' && 'status' in res && res.status) {
      toast.add({
        severity: 'success',
        summary: '保存成功',
        detail: '告警设置已更新',
        life: 3000,
      })
      await loadAlertSettings()
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
      <!-- 服务器离线/上线告警 -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-desktop text-primary"></i>
            <span>服务器状态告警</span>
          </div>
        </template>
        <template #content>
          <Message v-if="!hasNotificationChannel" severity="info" variant="simple" class="mb-4">
            请先在上方「通知设置」中配置并启用至少一个通知渠道（邮件或 Webhook）后，方可开启以下告警。
          </Message>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-color">开启服务器离线告警</label>
                <Message size="small" severity="secondary" variant="simple">
                  当服务器 Agent 断开连接时发送告警通知
                </Message>
              </div>
              <ToggleSwitch
                v-model="alertServerOfflineEnabled"
                :disabled="!hasNotificationChannel"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-color">开启服务器上线告警</label>
                <Message size="small" severity="secondary" variant="simple">
                  当服务器从离线恢复上线时发送通知
                </Message>
              </div>
              <ToggleSwitch
                v-model="alertServerOnlineEnabled"
                :disabled="!hasNotificationChannel"
              />
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
                    :placeholder="
                      notifications.email.hasPassword ? '已设置，留空则不修改' : '请输入 SMTP 密码'
                    "
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
                  <label class="text-sm font-medium text-color">平台类型</label>
                  <Select
                    v-model="notifications.webhook.platform"
                    :options="webhookPlatformOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="选择平台"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">Webhook URL</label>
                  <InputText
                    v-model="notifications.webhook.webhook"
                    :placeholder="webhookPlaceholder"
                  />
                </div>
                <div v-if="supportsMention" class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">提及用户</label>
                  <InputText
                    v-model="mentionedInput"
                    placeholder="输入用户ID后按回车添加"
                    @keydown.enter.prevent="addMentionedUser"
                  />
                  <div v-if="mentionedUsers.length > 0" class="flex flex-wrap gap-2 mt-2">
                    <Chip
                      v-for="(user, index) in mentionedUsers"
                      :key="index"
                      :label="user"
                      removable
                      @remove="removeMentionedUser(index)"
                    />
                  </div>
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
  margin: 0 auto;
}
</style>
