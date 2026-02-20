<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import type { Notifications } from '@/types/settings/alerts'
import alertsApi from '@/apis/settings/alerts'
import { RiSaveLine, RiSendPlaneLine } from '@remixicon/vue'

const alertsFormRef = ref<FormInst | null>(null)
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

const alertRules: FormRules = {
  'email.smtp': [
    {
      validator: (_rule, value: string) => {
        if (notifications.value.email.enabled && !value?.trim()) {
          return new Error('请输入 SMTP 服务器地址')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  'email.port': [
    {
      validator: (_rule, value: number) => {
        if (notifications.value.email.enabled && (value < 1 || value > 65535)) {
          return new Error('端口号必须在 1-65535 之间')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  'email.from': [
    {
      validator: (_rule, value: string) => {
        if (notifications.value.email.enabled && !value?.trim()) {
          return new Error('请输入发件人邮箱')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  'email.to': [
    {
      validator: (_rule, value: string) => {
        if (notifications.value.email.enabled && !value?.trim()) {
          return new Error('请输入收件人邮箱')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  'webhook.webhook': [
    {
      validator: (_rule, value: string) => {
        if (!notifications.value.webhook.enabled) return true
        if (!value?.trim()) return new Error('请输入 Webhook URL')
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return new Error('Webhook URL 必须以 http:// 或 https:// 开头')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

const saving = ref(false)
const loading = ref(false)
const testing = ref({
  email: false,
  webhook: false,
})
const message = useMessage()

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
    message.warning('该用户已添加', { duration: 2000 })
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
    message.error(errorMessage, { duration: 5000 })
  } finally {
    loading.value = false
  }
}

// 校验表单（保存或测试前调用）
const validateAlertsForm = async (): Promise<boolean> => {
  try {
    await alertsFormRef.value?.validate()
    return true
  } catch {
    return false
  }
}

// 测试告警设置
const testAlert = async (type: 'email' | 'webhook') => {
  const valid = await validateAlertsForm()
  if (!valid) return

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
      message.success('测试消息已发送', { duration: 3000 })
    } else {
      const errorMsg =
        res && typeof res === 'object' && 'message' in res ? String(res.message) : '测试失败'
      throw new Error(errorMsg)
    }
  } catch (error: unknown) {
    console.error(`Failed to test ${type} alert:`, error)
    const errorMessage = error instanceof Error ? error.message : '测试发送失败，请检查配置'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    testing.value[type] = false
  }
}

// 保存告警设置
const saveAlertSettings = async () => {
  const valid = await validateAlertsForm()
  if (!valid) return

  updateMentionedString()

  saving.value = true
  try {
    const res = await alertsApi.saveAlertsSettings({
      notifications: notifications.value,
      alertServerOfflineEnabled: alertServerOfflineEnabled.value,
      alertServerOnlineEnabled: alertServerOnlineEnabled.value,
    })

    if (res && typeof res === 'object' && 'status' in res && res.status) {
      message.success('告警设置已更新', { duration: 3000 })
      await loadAlertSettings()
    } else {
      const errorMsg =
        res && typeof res === 'object' && 'message' in res ? String(res.message) : '保存失败'
      throw new Error(errorMsg)
    }
  } catch (error: unknown) {
    console.error('Failed to save alert settings:', error)
    const errorMessage = error instanceof Error ? error.message : '保存告警设置失败，请重试'
    message.error(errorMessage, { duration: 5000 })
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
        <n-button type="primary" :loading="saving" :disabled="loading" @click="saveAlertSettings">
          <template #icon>
            <ri-save-line />
          </template>
          保存设置
        </n-button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <n-spin size="large" />
    </div>

    <div v-else class="space-y-2">
      <!-- 服务器离线/上线告警 -->
      <n-card>
        <template #header>
          <div class="flex items-center gap-2">
            <span>服务器状态告警</span>
          </div>
        </template>
        <n-alert v-if="!hasNotificationChannel" type="info" class="mb-4">
          请先在上方「通知设置」中配置并启用至少一个通知渠道（邮件或 Webhook）后，方可开启以下告警。
        </n-alert>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-color">服务器离线告警</label>
              <p class="text-sm text-muted-color mt-1">当服务器 Agent 断开连接时发送告警通知</p>
            </div>
            <n-switch
              v-model:value="alertServerOfflineEnabled"
              :disabled="!hasNotificationChannel"
            />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-color">服务器上线告警</label>
              <p class="text-sm text-muted-color mt-1">当服务器从离线恢复上线时发送通知</p>
            </div>
            <n-switch
              v-model:value="alertServerOnlineEnabled"
              :disabled="!hasNotificationChannel"
            />
          </div>
        </div>
      </n-card>

      <!-- 通知设置 -->
      <n-card>
        <template #header>
          <div class="flex items-center gap-2">
            <span>通知设置</span>
          </div>
        </template>
        <n-form
          ref="alertsFormRef"
          :model="notifications"
          :rules="alertRules"
          label-placement="top"
        >
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 邮件通知 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">邮件通知</label>
                  <p class="text-sm text-muted-color mt-1">通过邮件发送告警通知</p>
                </div>
                <n-switch v-model:value="notifications.email.enabled" />
              </div>

              <div
                v-if="notifications.email.enabled"
              >
                <n-form-item label="SMTP 服务器" path="email.smtp" required>
                  <n-input
                    v-model:value="notifications.email.smtp"
                    placeholder="smtp.example.com"
                  />
                </n-form-item>
                <div class="grid grid-cols-2 gap-3">
                  <n-form-item label="端口" path="email.port" required>
                    <n-input-number
                      v-model:value="notifications.email.port"
                      :min="1"
                      :max="65535"
                      class="w-full"
                    />
                  </n-form-item>
                  <n-form-item label="加密方式" path="email.security">
                    <n-select
                      v-model:value="notifications.email.security"
                      :options="securityOptions"
                    />
                  </n-form-item>
                </div>
                <n-form-item label="SMTP 密码" path="email.password">
                  <n-input
                    v-model:value="notifications.email.password"
                    type="password"
                    show-password-on="click"
                    :placeholder="
                      notifications.email.hasPassword ? '已设置，留空则不修改' : '请输入 SMTP 密码'
                    "
                  />
                </n-form-item>
                <n-form-item label="发件人邮箱" path="email.from" required>
                  <n-input
                    v-model:value="notifications.email.from"
                    placeholder="alert@example.com"
                  />
                </n-form-item>
                <n-form-item label="收件人邮箱" path="email.to" required>
                  <n-input v-model:value="notifications.email.to" placeholder="admin@example.com" />
                </n-form-item>
                <div class="w-full flex justify-end">
                  <n-button
                    secondary
                    :loading="testing.email"
                    :disabled="testing.email"
                    @click="testAlert('email')"
                  >
                    <template #icon>
                      <ri-send-plane-line />
                    </template>
                    发送测试邮件
                  </n-button>
                </div>
              </div>
            </div>

            <!-- Webhook 通知 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">Webhook 通知</label>
                  <p class="text-sm text-muted-color mt-1">通过 Webhook 发送告警通知</p>
                </div>
                <n-switch v-model:value="notifications.webhook.enabled" />
              </div>

              <div
                v-if="notifications.webhook.enabled"
              >
                <n-form-item label="平台类型" path="webhook.platform">
                  <n-select
                    v-model:value="notifications.webhook.platform"
                    :options="webhookPlatformOptions"
                    placeholder="选择平台"
                  />
                </n-form-item>
                <n-form-item label="Webhook URL" path="webhook.webhook" required>
                  <n-input
                    v-model:value="notifications.webhook.webhook"
                    :placeholder="webhookPlaceholder"
                  />
                </n-form-item>
                <div v-if="supportsMention" class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-color">提及用户</label>
                  <n-input
                    v-model:value="mentionedInput"
                    placeholder="输入用户ID后按回车添加"
                    @keydown.enter.prevent="addMentionedUser"
                  />
                  <div v-if="mentionedUsers.length > 0" class="flex flex-wrap gap-2 mt-2">
                    <n-tag
                      v-for="(user, index) in mentionedUsers"
                      :key="index"
                      closable
                      @close="removeMentionedUser(index)"
                    >
                      {{ user }}
                    </n-tag>
                  </div>
                </div>
                <div class="w-full flex justify-end">
                  <n-button
                    secondary
                    :loading="testing.webhook"
                    :disabled="testing.webhook"
                    @click="testAlert('webhook')"
                  >
                    <template #icon>
                      <ri-send-plane-line />
                    </template>
                    发送测试消息
                  </n-button>
                </div>
              </div>
            </div>
          </div>
        </n-form>
      </n-card>
    </div>
  </div>
</template>
<style scoped>
.alerts-view {
  margin: 0 auto;
}
</style>
