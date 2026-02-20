<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { marked } from 'marked'
import panelApi from '@/apis/settings/panel'
import { useAuthStore } from '@/stores/auth'
import type { PanelSettings } from '@/types/settings/panel'
import type { GetUpdateData } from '@/types/settings/api'
import { hasUpdate as checkHasUpdate, getVersionTypeConfig } from '@/utils/version.ts'
import {
  RiAlignLeft,
  RiCheckboxCircleLine,
  RiDownloadCloudLine,
  RiErrorWarningLine,
  RiSaveLine,
  RiSearchLine,
} from '@remixicon/vue'

export interface VersionInfo extends GetUpdateData {
  has_update: boolean
}

/**
 * 判断是否需要更新
 * 规则：
 * 1. 如果最新版本号 > 当前版本号，需要更新
 * 2. 如果版本号相同，但最新版本类型优先级 > 当前版本类型优先级，需要更新
 */
const hasUpdate = computed(() => {
  if (!versionInfo.value) return false

  const { latest_version, latest_version_type, current_version, current_version_type } =
    versionInfo.value

  return checkHasUpdate(current_version, latest_version, current_version_type, latest_version_type)
})
const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const panelFormRef = ref<FormInst | null>(null)
const panelSettings = ref<PanelSettings>({
  title: 'CloudSentinel',
})
const panelRules: FormRules = {
  title: [{ required: true, message: '请输入面板标题', trigger: 'blur' }],
  log_retention_days: [
    { type: 'number', min: 1, max: 365, message: '范围 1-365 天', trigger: ['blur', 'input'] },
  ],
}
const saving = ref(false)
const checkingUpdate = ref(false)
const updating = ref(false)
const hasCheckedUpdate = ref(false)
const updateProgress = ref(0)
const updateStep = ref('')
const currentStep = ref('')

// 版本信息
const versionInfo = ref<VersionInfo>({
  change_log: '',
  current_version: '',
  current_version_type: 'dev',
  has_update: false,
  latest_version: '',
  latest_version_type: 'dev',
  publish_time: '',
})

// 检查更新
const checkForUpdate = async () => {
  checkingUpdate.value = true
  try {
    const response = await panelApi.checkUpdate()
    if (!response?.status) {
      message.warning(response?.message || '无法获取版本信息', { duration: 3000 })
      return
    }
    versionInfo.value = { ...response?.data, has_update: false }
    hasCheckedUpdate.value = true

    message.info('检查到最新的版本信息喽~', { duration: 3000 })
  } catch (error) {
    console.error('Failed to check for updates:', error)
    message.error('检查更新时出错，请稍后重试', { duration: 3000 })
  } finally {
    checkingUpdate.value = false
  }
}

// 执行更新
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

  // 标记是否进入重启阶段
  let isRestarting = false
  // 记录连续失败次数（非重启阶段）
  let consecutiveFailures = 0
  // 最大允许的连续失败次数（非重启阶段）
  const maxConsecutiveFailures = 120
  // 重启阶段的等待时间（秒）
  let restartingWaitTime = 0
  // 重启阶段最大等待时间（秒）
  const maxRestartingWaitTime = 180
  // 服务恢复后的检查次数
  let recoveryChecks = 0
  const maxRecoveryChecks = 2

  try {
    await panelApi.updatePanel()

    const pollInterval = setInterval(async () => {
      try {
        const res = await panelApi.getUpdateStatus()
        // 请求成功，重置失败计数
        consecutiveFailures = 0

        // 如果之前在重启阶段，现在请求成功了，说明服务可能已恢复
        if (isRestarting) {
          recoveryChecks++
          if (recoveryChecks >= maxRecoveryChecks) {
            // 服务已恢复，检查更新状态
            isRestarting = false
            updateStep.value = '服务已恢复，正在验证更新结果...'
          }
        }

        if (res.status && res.data) {
          const { step, progress, message: stepMessage } = res.data
          updateStep.value = stepMessage
          updateProgress.value = progress

          // 记录当前步骤，用于UI控制
          currentStep.value = step

          // 检测是否进入重启阶段
          if (step === 'restarting') {
            isRestarting = true
            recoveryChecks = 0 // 重置恢复检查计数
            restartingWaitTime = 0 // 重置重启等待时间
            consecutiveFailures = 0 // 重置失败计数，因为重启阶段的失败是正常的
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
          // 服务已恢复，但没有更新状态（可能已被清除），说明更新已完成
          clearInterval(pollInterval)
          updating.value = false

          message.success('服务已重启，页面即将刷新以加载新版本', { duration: 3000 })

          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch (error) {
        if (isRestarting) {
          // 重启阶段：网络请求失败是正常的，不累计失败次数
          restartingWaitTime++
          updateStep.value = `服务正在重启中，请稍候... (已等待 ${restartingWaitTime} 秒)`
          console.log(`服务重启中，继续等待... (${restartingWaitTime}/${maxRestartingWaitTime})`)

          // 如果重启等待时间超过限制，停止轮询
          if (restartingWaitTime >= maxRestartingWaitTime) {
            console.warn('服务重启等待时间超过限制，停止轮询')
            clearInterval(pollInterval)
            updating.value = false
            message.warning(
              `服务重启已等待 ${maxRestartingWaitTime} 秒。如果服务已重启，请手动刷新页面。`,
              { duration: 8000 },
            )
          }
          return
        }

        // 非重启阶段：累计失败次数
        consecutiveFailures++
        // 如果服务已恢复但再次失败，重置恢复检查计数
        if (recoveryChecks > 0) {
          recoveryChecks = 0
        }

        // 如果失败次数未超过限制，继续轮询
        if (consecutiveFailures <= maxConsecutiveFailures) {
          console.warn(
            `获取更新状态失败，继续重试... (${consecutiveFailures}/${maxConsecutiveFailures}):`,
            error,
          )
          return
        }

        // 失败次数超过限制，停止轮询
        console.error('Polling update status failed after max retries:', error)
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

// 加载设置
const loadPanelSettings = async () => {
  try {
    const res = await panelApi.getPanelSettings()
    const title = res?.data?.panel_title
    const logRetentionDays = res?.data?.log_retention_days

    if (typeof title === 'string' && title.length > 0) {
      panelSettings.value.title = title
    }

    if (logRetentionDays !== undefined) {
      panelSettings.value.log_retention_days = Number(logRetentionDays)
    }

    if (versionInfo.value) {
      versionInfo.value.current_version = res?.data?.current_version || ''
      versionInfo.value.current_version_type = res?.data?.current_version_type || ''
    }
  } catch (error) {
    console.error('Failed to load panel settings:', error)
  }
}

// 保存设置
const savePanelSettings = async () => {
  try {
    await panelFormRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    await panelApi.savePanelSettings({
      title: panelSettings.value.title,
      log_retention_days: panelSettings.value.log_retention_days,
    })

    const publicSettings = authStore.getPublicSettings()
    if (publicSettings) {
      publicSettings.panel_title = panelSettings.value.title
      document.title = panelSettings.value.title
    }

    message.success('面板设置已更新', { duration: 3000 })
  } catch (error) {
    console.error('Failed to save panel settings:', error)
    message.error('无法保存面板设置，请稍后重试', { duration: 3000 })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPanelSettings()
  checkForUpdate()
})
</script>
<template>
  <div class="panel-view">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">面板设置</h1>
        <p class="text-muted-color">配置面板的基本信息和外观设置</p>
      </div>
      <div>
        <n-button type="primary" @click="savePanelSettings" :loading="saving">
          <template #icon>
            <ri-save-line />
          </template>
          保存设置
        </n-button>
      </div>
    </div>

    <div class="grid grid-cols-1">
      <!-- 基本信息设置 -->
      <n-card class="h-fit">
        <template #header>
          <div class="flex items-center gap-2">
            <span>基本设置</span>
          </div>
        </template>
        <n-form ref="panelFormRef" :model="panelSettings" :rules="panelRules" label-placement="top">
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
              <template #suffix> 天 </template>
            </n-input-number>
          </n-form-item>
        </n-form>
      </n-card>

      <!-- 版本更新 -->
      <n-card class="h-fit mt-2">
        <template #header>
          <div class="flex items-center gap-2">
            <span>版本更新</span>
          </div>
        </template>
        <div class="space-y-2">
          <!-- 版本信息 -->
          <n-card>
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-color">当前版本:</span>
                <span class="text-xs not-even:rounded-md text-primary font-semibold">
                  {{
                    versionInfo?.current_version ? 'v' + versionInfo?.current_version : 'unknown'
                  }}
                </span>
              </div>
              <n-button secondary size="small" @click="checkForUpdate" :loading="checkingUpdate">
                <template #icon>
                  <ri-search-line />
                </template>
                检查更新
              </n-button>
            </div>
          </n-card>

          <!-- 更新状态展示 -->
          <div v-if="hasCheckedUpdate && versionInfo" class="animate-fade-in">
            <!-- 可用更新 -->
            <n-card v-if="hasUpdate">
              <!-- 头部：版本信息与操作 -->
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
                  <p class="text-xs text-muted-color flex items-center gap-1.5">
                    发布于 {{ versionInfo.publish_time }}
                  </p>
                  <div
                    v-if="versionInfo.latest_version_type !== 'release'"
                    class="flex items-center gap-2 text-orange-500 text-sm mt-1"
                  >
                    <ri-error-warning-line size="14px" />
                    <span>此版本为非正式版，可能包含实验性功能或大量缺陷，请谨慎更新</span>
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <n-button type="primary" size="small" @click="performUpdate" :loading="updating">
                    <template #icon>
                      <ri-download-cloud-line />
                    </template>
                    立即更新
                  </n-button>
                </div>
              </div>

              <!-- 更新进行中提示 -->
              <div
                v-if="updating"
                class="mx-5 mb-5 p-4 rounded-lg bg-surface-0 dark:bg-surface-800/50 border border-gray-200 dark:border-gray-700"
              >
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
                  class="mt-2"
                  v-if="currentStep === 'downloading'"
                  type="line"
                  :percentage="updateProgress"
                  :show-indicator="false"
                  :height="6"
                />
              </div>

              <!-- 分隔线 -->
              <n-divider />

              <!-- 更新内容 -->
              <div class="space-y-2">
                <h4 class="text-sm font-medium text-color flex items-center gap-2">
                  <ri-align-left size="14px" />
                  <span>更新内容</span>
                </h4>
                <div
                  v-html="marked.parse(versionInfo.change_log)"
                  class="text-sm text-color-secondary prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                ></div>
              </div>
            </n-card>

            <!-- 无更新状态 -->
            <div
              v-else
              class="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-surface-0 dark:bg-surface-800"
            >
              <div
                class="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4"
              >
                <i class="ri-check-line text-4xl text-green-500 dark:text-green-400"></i>
              </div>
              <h3 class="text-lg font-medium text-color mb-1">当前已是最新版本</h3>
              <p class="text-sm text-muted-color">
                您的系统版本 v{{ versionInfo.current_version }} 是最新的，无需更新
              </p>
            </div>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>
<style scoped>
.panel-view {
  margin: 0 auto;
}
</style>
