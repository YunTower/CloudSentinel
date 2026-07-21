<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import panelApi from '@/apis/settings/panel'
import settingsApi from '@/apis/settings/permissions'
import { useAuthStore } from '@/stores/auth'
import type { PanelSettings } from '@/types/settings/panel'
import type { PermissionSettings, AdminAccount } from '@/types/settings/permissions'
import type { GetUpdateData } from '@/types/settings/api'
import { renderMarkdownSafe } from '@/utils/safeMarkdown'
import {
  hasUpdate as checkHasUpdate,
  getVersionTypeConfig,
  isNoLatestVersionResponse,
  VERSION_TYPE_CONFIG,
} from '@/utils/version'
import type { VersionType } from '@/utils/version'
import {
  RiAlignLeft,
  RiCheckboxCircleLine,
  RiDownloadCloudLine,
  RiErrorWarningLine,
  RiSaveLine,
  RiSearchLine,
} from '@remixicon/vue'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

export interface VersionInfo extends GetUpdateData {
  has_update: boolean
}

const panelFormRef = ref<FormInst | null>(null)

const UPDATE_CHANNEL_OPTIONS: { value: VersionType; label: string }[] = [
  { value: 'release', label: VERSION_TYPE_CONFIG.release.label },
  { value: 'beta', label: VERSION_TYPE_CONFIG.beta.label },
  { value: 'dev', label: VERSION_TYPE_CONFIG.dev.label },
]

const panelSettings = ref<PanelSettings>({
  title: 'CloudSentinel',
  update_channel: 'release',
})

const panelRules: FormRules = {
  title: [{ required: true, message: '请输入面板标题', trigger: 'blur' }],
  log_retention_days: [
    { type: 'number', min: 1, max: 365, message: '范围 1-365 天', trigger: ['blur', 'input'] },
  ],
}

const activeTab = ref('panel')

const savingPanel = ref(false)
const checkingUpdate = ref(false)
const updating = ref(false)
const hasCheckedUpdate = ref(false)
const updateProgress = ref(0)
const updateStep = ref('')
const currentStep = ref('')

const versionInfo = ref<VersionInfo>({
  change_log: '',
  current_version: '',
  current_version_type: 'dev',
  has_update: false,
  latest_version: '',
  latest_version_type: 'dev',
  publish_time: '',
})

const sanitizedChangeLogHtml = computed(() =>
  renderMarkdownSafe(versionInfo.value?.change_log || ''),
)

const hasUpdate = computed(() => {
  if (!versionInfo.value) return false
  const { latest_version, latest_version_type, current_version, current_version_type } =
    versionInfo.value
  return checkHasUpdate(current_version, latest_version, current_version_type, latest_version_type)
})

const checkForUpdate = async () => {
  checkingUpdate.value = true
  try {
    const response = await panelApi.checkUpdate()
    if (!response?.status) {
      if (isNoLatestVersionResponse(response as { code?: string })) {
        hasCheckedUpdate.value = true
        versionInfo.value = {
          ...versionInfo.value,
          latest_version: versionInfo.value.current_version || '',
          latest_version_type: (versionInfo.value.current_version_type as VersionType) || 'release',
          has_update: false,
        }
        message.success('当前已是最新版本', { duration: 3000 })
      } else {
        message.warning(response?.message || '无法获取版本信息', { duration: 3000 })
      }
      return
    }
    versionInfo.value = { ...response?.data, has_update: response?.data?.has_update ?? false }
    hasCheckedUpdate.value = true
    message.info('检测到新版本，可以更新', { duration: 3000 })
  } catch (error) {
    console.error('Failed to check for updates:', error)
    message.error('检查更新时出错，请稍后重试', { duration: 3000 })
  } finally {
    checkingUpdate.value = false
  }
}

const performUpdate = async () => {
  if (versionInfo.value?.latest_version_type !== 'release') {
    dialog.warning({
      title: '高风险操作确认',
      content: '当前更新版本非正式版（Release），可能存在不稳定因素，是否确认更新？',
      positiveText: '确认继续操作',
      negativeText: '取消',
      onPositiveClick: () => {
        executeUpdate()
      },
    })
  } else {
    await executeUpdate()
  }
}

const executeUpdate = async () => {
  updating.value = true
  updateProgress.value = 0
  updateStep.value = '正在初始化更新...'
  let isRestarting = false
  let consecutiveFailures = 0
  const maxConsecutiveFailures = 120
  let restartingWaitTime = 0
  const maxRestartingWaitTime = 180
  let recoveryChecks = 0
  const maxRecoveryChecks = 2

  try {
    await panelApi.updatePanel()
    const pollInterval = setInterval(async () => {
      try {
        const res = await panelApi.getUpdateStatus()
        consecutiveFailures = 0
        if (isRestarting) {
          recoveryChecks++
          if (recoveryChecks >= maxRecoveryChecks) {
            isRestarting = false
            updateStep.value = '服务已恢复，正在验证更新结果...'
          }
        }
        if (res.status && res.data) {
          const { step, progress, message: stepMessage } = res.data
          updateStep.value = stepMessage
          updateProgress.value = progress
          currentStep.value = step
          if (step === 'restarting') {
            isRestarting = true
            recoveryChecks = 0
            restartingWaitTime = 0
            consecutiveFailures = 0
            updateStep.value = '服务正在重启，请稍候...'
          }
          if (step === 'completed') {
            clearInterval(pollInterval)
            updating.value = false
            message.success('系统已更新到最新版本，页面即将刷新', { duration: 3000 })
            setTimeout(() => {
              window.location.reload()
            }, 1500)
          } else if (step === 'error') {
            clearInterval(pollInterval)
            updating.value = false
            message.error(stepMessage || '更新过程中发生错误', { duration: 6000 })
          }
        } else if (isRestarting && recoveryChecks >= maxRecoveryChecks) {
          clearInterval(pollInterval)
          updating.value = false
          message.success('服务已重启，页面即将刷新以加载新版本', { duration: 3000 })
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch (error) {
        if (isRestarting) {
          restartingWaitTime++
          updateStep.value = `服务正在重启中，请稍候... (已等待 ${restartingWaitTime} 秒)`
          if (restartingWaitTime >= maxRestartingWaitTime) {
            clearInterval(pollInterval)
            updating.value = false
            message.warning(
              `服务重启已等待 ${maxRestartingWaitTime} 秒。如果服务已重启，请手动刷新页面。`,
              { duration: 8000 },
            )
          }
          return
        }
        consecutiveFailures++
        if (recoveryChecks > 0) recoveryChecks = 0
        if (consecutiveFailures <= maxConsecutiveFailures) return
        clearInterval(pollInterval)
        updating.value = false
        message.error(
          `获取更新状态失败，已重试 ${maxConsecutiveFailures} 次。请检查网络连接或稍后重试。`,
          { duration: 8000 },
        )
      }
    }, 1000)
  } catch (error) {
    console.error('Failed to start update:', error)
    updating.value = false
    message.error(`无法启动更新任务（${error}）`, { duration: 5000 })
  }
}

const loadPanelSettings = async () => {
  try {
    const res = await panelApi.getPanelSettings()
    const title = res?.data?.panel_title
    const logRetentionDays = res?.data?.log_retention_days
    if (typeof title === 'string' && title.length > 0) panelSettings.value.title = title
    if (logRetentionDays !== undefined)
      panelSettings.value.log_retention_days = Number(logRetentionDays)
    const updateChannel = res?.data?.update_channel
    if (updateChannel === 'dev' || updateChannel === 'beta' || updateChannel === 'release')
      panelSettings.value.update_channel = updateChannel
    if (versionInfo.value) {
      versionInfo.value.current_version = res?.data?.current_version || ''
      const vt = res?.data?.current_version_type
      versionInfo.value.current_version_type =
        vt === 'dev' || vt === 'beta' || vt === 'release' ? vt : 'release'
    }
  } catch (error) {
    console.error('Failed to load panel settings:', error)
  }
}

const savePanelSettings = async () => {
  try {
    await panelFormRef.value?.validate()
  } catch {
    return
  }
  savingPanel.value = true
  try {
    await panelApi.savePanelSettings({
      title: panelSettings.value.title,
      log_retention_days: panelSettings.value.log_retention_days,
      update_channel: panelSettings.value.update_channel ?? 'release',
    })
    // 刷新公共设置缓存，确保 panel_title 更新对其他组件可见
    await authStore.refreshPublicSettings()
    document.title = panelSettings.value.title
    message.success('面板设置已更新', { duration: 3000 })
  } catch (error) {
    console.error('Failed to save panel settings:', error)
    message.error('无法保存面板设置，请稍后重试', { duration: 3000 })
  } finally {
    savingPanel.value = false
  }
}

const sessionFormRef = ref<FormInst | null>(null)
const usernameFormRef = ref<FormInst | null>(null)
const passwordFormRef = ref<FormInst | null>(null)

const permissions = ref<PermissionSettings>({
  maxLoginAttempts: 5,
  lockoutDuration: 15,
})

const adminAccount = ref<AdminAccount>({
  username: 'admin',
  newUsername: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const savingPermissions = ref(false)
const updatingUsername = ref(false)
const updatingPassword = ref(false)

const sessionRules: FormRules = {
  maxLoginAttempts: [
    { required: true, type: 'number', message: '请输入最大登录尝试次数', trigger: 'blur' },
    { type: 'number', min: 1, max: 10, message: '范围 1-10 次', trigger: ['blur', 'input'] },
  ],
  lockoutDuration: [
    { required: true, type: 'number', message: '请输入锁定时间', trigger: 'blur' },
    { type: 'number', min: 0, max: 60, message: '范围 0-60 分钟', trigger: ['blur', 'input'] },
  ],
}

const usernameRules: FormRules = {
  newUsername: [
    { required: true, message: '请输入新用户名', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        if (value && value === adminAccount.value.username)
          return new Error('新用户名不能与当前用户名相同')
        return true
      },
      trigger: 'blur',
    },
  ],
  currentPassword: [{ required: true, message: '请输入当前密码以验证身份', trigger: 'blur' }],
}

const passwordRules: FormRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: ['blur', 'input'] },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        if (value !== adminAccount.value.newPassword) return new Error('两次输入的密码不一致')
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

const savePermissions = async () => {
  try {
    await sessionFormRef.value?.validate()
  } catch {
    return
  }
  savingPermissions.value = true
  try {
    await settingsApi.savePermissionsSettings({
      maxLoginAttempts: permissions.value.maxLoginAttempts,
      lockoutDuration: permissions.value.lockoutDuration,
    })
    message.success('权限设置已更新', { duration: 3000 })
  } catch {
    message.error('请稍后重试', { duration: 5000 })
  } finally {
    savingPermissions.value = false
  }
}

const updateUsername = async () => {
  try {
    await usernameFormRef.value?.validate()
  } catch {
    return
  }
  updatingUsername.value = true
  try {
    await settingsApi.savePermissionsSettings({
      maxLoginAttempts: permissions.value.maxLoginAttempts,
      lockoutDuration: permissions.value.lockoutDuration,
      newUsername: adminAccount.value.newUsername,
      currentPassword: adminAccount.value.currentPassword,
    })
    adminAccount.value.username = adminAccount.value.newUsername
    adminAccount.value.newUsername = ''
    adminAccount.value.currentPassword = ''
    message.success('用户名已更新', { duration: 3000 })
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) ||
      (error instanceof Error ? error.message : null) ||
      '请稍后重试'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    updatingUsername.value = false
  }
}

const updatePassword = async () => {
  try {
    await passwordFormRef.value?.validate()
  } catch {
    return
  }
  updatingPassword.value = true
  try {
    await settingsApi.savePermissionsSettings({
      maxLoginAttempts: permissions.value.maxLoginAttempts,
      lockoutDuration: permissions.value.lockoutDuration,
      newPassword: adminAccount.value.newPassword,
      confirmPassword: adminAccount.value.confirmPassword,
      currentPassword: adminAccount.value.currentPassword,
    })
    adminAccount.value.currentPassword = ''
    adminAccount.value.newPassword = ''
    adminAccount.value.confirmPassword = ''
    message.success('密码已更新', { duration: 3000 })
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) ||
      (error instanceof Error ? error.message : null) ||
      '请稍后重试'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    updatingPassword.value = false
  }
}

const loadPermissions = async () => {
  try {
    const res = await settingsApi.getPermissionsSettings()
    const data = res?.data
    if (data) {
      permissions.value.maxLoginAttempts =
        Number(data.maxLoginAttempts) || permissions.value.maxLoginAttempts
      permissions.value.lockoutDuration =
        Number(data.lockoutDuration) || permissions.value.lockoutDuration
      if (data.adminUsername) adminAccount.value.username = data.adminUsername
    }
  } catch (error) {
    console.error('加载权限设置失败:', error)
  }
}

onMounted(() => {
  loadPanelSettings()
  checkForUpdate()
  loadPermissions()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h1 class="text-3xl font-bold text-color mb-1">系统设置</h1>
        <p class="text-muted-color">配置面板基本信息、版本更新及登录安全</p>
      </div>
      <n-button
        v-if="activeTab === 'panel'"
        type="primary"
        :loading="savingPanel"
        @click="savePanelSettings"
      >
        <template #icon><ri-save-line /></template>
        保存设置
      </n-button>
      <n-button
        v-else-if="activeTab === 'permissions'"
        type="primary"
        :loading="savingPermissions"
        @click="savePermissions"
      >
        <template #icon><ri-save-line /></template>
        保存设置
      </n-button>
    </div>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="panel" tab="面板设置">
        <div class="space-y-2 pt-2">
          <n-card>
            <template #header>基本设置</template>
            <n-form
              ref="panelFormRef"
              :model="panelSettings"
              :rules="panelRules"
              label-placement="top"
            >
              <n-form-item label="面板标题" path="title" required>
                <n-input
                  v-model:value="panelSettings.title"
                  placeholder="请输入面板标题"
                  class="w-full"
                />
              </n-form-item>
              <n-form-item label="日志保留天数" path="log_retention_days">
                <n-input-number
                  v-model:value="panelSettings.log_retention_days"
                  placeholder="30"
                  class="w-full"
                  :min="1"
                  :max="365"
                  :show-button="false"
                >
                  <template #suffix>天</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="更新渠道" path="update_channel">
                <n-select
                  v-model:value="panelSettings.update_channel"
                  :options="UPDATE_CHANNEL_OPTIONS"
                  placeholder="请选择更新渠道"
                  class="w-full"
                />
                <template #feedback>
                  <span class="text-muted-color text-xs"
                    >检查更新与安装时将使用所选渠道的最新版本</span
                  >
                </template>
              </n-form-item>
            </n-form>
          </n-card>

          <n-card>
            <template #header>版本更新</template>
            <div class="space-y-2">
              <n-card>
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-color">当前版本:</span>
                    <span class="text-xs text-primary font-semibold">
                      {{
                        versionInfo?.current_version
                          ? 'v' + versionInfo?.current_version
                          : 'unknown'
                      }}
                    </span>
                  </div>
                  <n-button
                    secondary
                    size="small"
                    :loading="checkingUpdate"
                    @click="checkForUpdate"
                  >
                    <template #icon><ri-search-line /></template>
                    检查更新
                  </n-button>
                </div>
              </n-card>

              <div v-if="hasCheckedUpdate && versionInfo" class="animate-fade-in">
                <n-card v-if="hasUpdate">
                  <div class="flex items-start justify-between gap-4">
                    <div class="space-y-2">
                      <div class="flex items-center gap-2">
                        <span class="text-base font-medium text-color">新版本：</span>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-bold text-primary-700 dark:text-primary-300">
                            v{{ versionInfo.latest_version }}
                          </span>
                          <n-tag
                            :type="getVersionTypeConfig(versionInfo.latest_version_type).severity"
                            size="small"
                          >
                            {{ getVersionTypeConfig(versionInfo.latest_version_type).label }}
                          </n-tag>
                        </div>
                      </div>
                      <p class="text-xs text-muted-color">发布于 {{ versionInfo.publish_time }}</p>
                      <div
                        v-if="versionInfo.latest_version_type !== 'release'"
                        class="flex items-center gap-2 text-orange-500 text-sm"
                      >
                        <ri-error-warning-line size="14px" />
                        <span>此版本为非正式版，可能包含实验性功能或大量缺陷，请谨慎更新</span>
                      </div>
                    </div>
                    <div class="flex-shrink-0">
                      <n-button
                        type="primary"
                        size="small"
                        :loading="updating"
                        @click="performUpdate"
                      >
                        <template #icon><ri-download-cloud-line /></template>
                        立即更新
                      </n-button>
                    </div>
                  </div>

                  <n-card v-if="updating" size="small" class="mt-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <n-spin v-if="currentStep !== 'completed'" size="small" />
                        <ri-checkbox-circle-line v-else class="text-green-500" size="14px" />
                        <span class="text-sm font-medium text-color">{{ updateStep }}</span>
                      </div>
                      <span
                        v-if="currentStep === 'downloading'"
                        class="text-sm text-muted-color font-mono"
                      >
                        {{ updateProgress }}%
                      </span>
                    </div>
                    <n-progress
                      v-if="currentStep === 'downloading'"
                      class="mt-2"
                      type="line"
                      :percentage="updateProgress"
                      :show-indicator="false"
                      :height="6"
                    />
                  </n-card>

                  <n-divider />

                  <div class="space-y-2">
                    <h4 class="text-sm font-medium text-color flex items-center gap-2">
                      <ri-align-left size="14px" />
                      <span>更新内容</span>
                    </h4>
                    <div
                      v-html="sanitizedChangeLogHtml"
                      class="text-sm text-color-secondary prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                    ></div>
                  </div>
                </n-card>

                <n-result
                  v-else
                  class="mt-4"
                  size="small"
                  status="success"
                  title="当前已是最新版本"
                  :description="`您的系统版本 v${versionInfo.current_version} 是最新的，无需更新`"
                />
              </div>
            </div>
          </n-card>
        </div>
      </n-tab-pane>
      <n-tab-pane name="permissions" tab="权限配置">
        <div class="space-y-2 pt-2">
          <div class="columns-1 md:columns-2 gap-2">
            <n-card class="break-inside-avoid mb-2">
              <template #header>会话管理</template>
              <n-form
                ref="sessionFormRef"
                :model="permissions"
                :rules="sessionRules"
                label-placement="top"
              >
                <n-form-item label="最大登录尝试次数" path="maxLoginAttempts" required>
                  <n-input-number
                    v-model:value="permissions.maxLoginAttempts"
                    :min="1"
                    :max="10"
                    :show-button="false"
                    class="w-full"
                    placeholder="请输入最大登录尝试次数"
                  >
                    <template #suffix>次</template>
                  </n-input-number>
                </n-form-item>
                <n-form-item label="异常登录锁定时间" path="lockoutDuration" required>
                  <div class="w-full flex flex-col">
                    <n-input-number
                      v-model:value="permissions.lockoutDuration"
                      :min="0"
                      :max="60"
                      :show-button="false"
                      class="w-full"
                      placeholder="请输入锁定时间"
                    >
                      <template #suffix>分钟</template>
                    </n-input-number>
                    <n-alert type="default" :show-icon="false" class="mt-2">
                      管理员使用密码登录失败达到
                      <b>{{ permissions.maxLoginAttempts || 0 }}</b> 次后锁定IP
                      <b>{{ permissions.lockoutDuration || 0 }}</b> 分钟
                    </n-alert>
                  </div>
                </n-form-item>
              </n-form>
            </n-card>

            <n-card class="break-inside-avoid mb-2">
              <template #header>修改用户名</template>
              <n-form
                ref="usernameFormRef"
                :model="adminAccount"
                :rules="usernameRules"
                label-placement="top"
              >
                <n-form-item label="当前用户名" path="username">
                  <n-input :value="adminAccount.username" disabled class="w-full" />
                </n-form-item>
                <n-form-item label="新用户名" path="newUsername" required>
                  <n-input
                    v-model:value="adminAccount.newUsername"
                    placeholder="请输入新用户名"
                    class="w-full"
                  />
                </n-form-item>
                <n-form-item label="当前密码" path="currentPassword" required>
                  <n-input
                    v-model:value="adminAccount.currentPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入当前密码以验证身份"
                    class="w-full"
                  />
                </n-form-item>
                <n-button type="primary" block :loading="updatingUsername" @click="updateUsername">
                  修改用户名
                </n-button>
              </n-form>
            </n-card>

            <n-card class="break-inside-avoid mb-2">
              <template #header>修改密码</template>
              <n-form
                ref="passwordFormRef"
                :model="adminAccount"
                :rules="passwordRules"
                label-placement="top"
              >
                <n-form-item label="当前密码" path="currentPassword" required>
                  <n-input
                    v-model:value="adminAccount.currentPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入当前密码以验证身份"
                    class="w-full"
                  />
                </n-form-item>
                <n-form-item label="新密码" path="newPassword" required>
                  <n-input
                    v-model:value="adminAccount.newPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入新密码（至少6位）"
                    class="w-full"
                  />
                </n-form-item>
                <n-form-item label="确认新密码" path="confirmPassword" required>
                  <n-input
                    v-model:value="adminAccount.confirmPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="请再次输入新密码"
                    class="w-full"
                  />
                </n-form-item>
                <n-button type="primary" block :loading="updatingPassword" @click="updatePassword">
                  修改密码
                </n-button>
              </n-form>
            </n-card>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
