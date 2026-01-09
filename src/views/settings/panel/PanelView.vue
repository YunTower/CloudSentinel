<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { marked } from 'marked'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import ConfirmDialog from 'primevue/confirmdialog'
import panelApi from '@/apis/settings/panel'
import { useAuthStore } from '@/stores/auth'
import type { PanelSettings } from '@/types/settings/panel'
import type { GetUpdateData } from '@/types/settings/api'
import { hasUpdate as checkHasUpdate, getVersionTypeConfig } from '@/utils/version.ts'

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
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const panelSettings = ref<PanelSettings>({
  title: 'CloudSentinel',
})
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
      toast.add({
        severity: 'warn',
        summary: '检查更新失败',
        detail: response?.message || '无法获取版本信息',
        life: 3000,
      })
      return
    }
    versionInfo.value = { ...response?.data, has_update: false }
    hasCheckedUpdate.value = true

    toast.add({
      severity: 'info',
      summary: '成功！！！',
      detail: '检查到最新的版本信息喽~',
      life: 3000,
    })
  } catch (error) {
    console.error('Failed to check for updates:', error)
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '检查更新时出错，请稍后重试',
      life: 3000,
    })
  } finally {
    checkingUpdate.value = false
  }
}

// 执行更新
const performUpdate = async () => {
  if (versionInfo.value?.latest_version_type !== 'release') {
    confirm.require({
      message: '当前更新版本非正式版（Release），可能存在不稳定因素，是否确认更新？',
      header: '高风险操作确认',
      acceptClass: 'p-button-danger',
      acceptLabel: '确认继续操作',
      rejectLabel: '取消',
      accept: () => {
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

  try {
    await panelApi.updatePanel()

    const pollInterval = setInterval(async () => {
      try {
        const res = await panelApi.getUpdateStatus()
        if (res.status && res.data) {
          const { step, progress, message } = res.data
          updateStep.value = message
          updateProgress.value = progress

          // 记录当前步骤，用于UI控制
          currentStep.value = step

          if (step === 'completed') {
            clearInterval(pollInterval)
            updating.value = false

            toast.add({
              severity: 'success',
              summary: '更新成功',
              detail: '系统已更新到最新版本，页面即将刷新',
              life: 3000,
            })

            setTimeout(() => {
              window.location.reload()
            }, 1500)
          } else if (step === 'error') {
            clearInterval(pollInterval)
            throw new Error(message)
          }
        }
      } catch (error) {
        console.error('Polling update status failed:', error)
        clearInterval(pollInterval)
        updating.value = false
        toast.add({
          severity: 'error',
          summary: '更新失败',
          detail: `获取更新状态失败（${error}）`,
          life: 6000,
        })
      }
    }, 1000)
  } catch (error) {
    console.error('Failed to start update:', error)
    updating.value = false
    toast.add({
      severity: 'error',
      summary: '启动更新失败',
      detail: `无法启动更新任务（${error}）`,
      life: 5000,
    })
  }
}

// 加载设置
const loadPanelSettings = async () => {
  try {
    const res = await panelApi.getPanelSettings()
    const title = res?.data?.panel_title
    if (typeof title === 'string' && title.length > 0) {
      panelSettings.value.title = title
      if (versionInfo.value) {
        versionInfo.value.current_version = res?.data?.current_version || ''
        versionInfo.value.current_version_type = res?.data?.current_version_type || ''
      }
    }
  } catch (error) {
    console.error('Failed to load panel settings:', error)
  }
}

// 保存设置
const savePanelSettings = async () => {
  saving.value = true
  try {
    await panelApi.savePanelSettings({ title: panelSettings.value.title })

    const publicSettings = authStore.getPublicSettings()
    if (publicSettings) {
      publicSettings.panel_title = panelSettings.value.title
      document.title = panelSettings.value.title
    }

    toast.add({ severity: 'success', summary: '保存成功', detail: '面板设置已更新', life: 3000 })
  } catch (error) {
    console.error('Failed to save panel settings:', error)
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: '无法保存面板设置，请稍后重试',
      life: 3000,
    })
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
    <ConfirmDialog></ConfirmDialog>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">面板设置</h1>
        <p class="text-muted-color">配置面板的基本信息和外观设置</p>
      </div>
      <div>
        <Button
          size="small"
          class="px-6"
          label="保存设置"
          icon="pi pi-save"
          @click="savePanelSettings"
          :loading="saving"
        />
      </div>
    </div>

    <div class="grid grid-cols-1">
      <!-- 基本信息设置 -->
      <Card class="h-fit">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-cog text-primary"></i>
            <span>基本设置</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- 面板标题 -->
            <div class="flex flex-col gap-2">
              <label for="panelTitle" class="text-sm font-medium text-color">面板标题</label>
              <InputText
                id="panelTitle"
                v-model="panelSettings.title"
                placeholder="请输入面板p标题"
                class="w-full"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- 版本更新 -->
      <Card class="h-fit mt-6">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-box text-primary"></i>
            <span>版本更新</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-3">
            <!-- 版本信息 -->
            <div
              class="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-color">当前版本:</span>
                  <span class="text-xs not-even:rounded-md text-primary font-semibold">
                    {{
                      versionInfo?.current_version ? 'v' + versionInfo?.current_version : 'unknown'
                    }}
                  </span>
                </div>
              </div>

              <Button
                label="检查更新"
                icon="pi pi-search"
                @click="checkForUpdate"
                :loading="checkingUpdate"
                severity="secondary"
                outlined
                size="small"
              />
            </div>

            <!-- 更新状态展示 -->
            <div v-if="hasCheckedUpdate && versionInfo" class="animate-fade-in">
              <!-- 可用更新 -->
              <div
                v-if="hasUpdate"
                class="rounded-xl bg-surface-50 dark:bg-surface-800 overflow-hidden"
              >
                <!-- 头部：版本信息与操作 -->
                <div class="p-5 flex items-start justify-between gap-4">
                  <div class="space-y-2">
                    <div class="flex items-center gap-3">
                      <span class="text-base font-medium text-color">发现新版本</span>
                      <div
                        class="flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30"
                      >
                        <span class="text-sm font-bold text-primary-700 dark:text-primary-300">
                          v{{ versionInfo.latest_version }}
                        </span>
                        <Tag
                          :value="getVersionTypeConfig(versionInfo.latest_version_type).label"
                          :severity="getVersionTypeConfig(versionInfo.latest_version_type).severity"
                          class="!text-[10px] !h-5 !min-w-[auto] !px-1.5"
                        />
                      </div>
                    </div>
                    <p class="text-xs text-muted-color flex items-center gap-1.5">
                      发布于 {{ versionInfo.publish_time }}
                    </p>
                    <div
                      v-if="versionInfo.latest_version_type !== 'release'"
                      class="flex items-center gap-2 text-orange-500 text-sm mt-1"
                    >
                      <i class="pi pi-exclamation-triangle"></i>
                      <span>此版本为非正式版，可能包含实验性功能或大量缺陷，请谨慎更新</span>
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <Button
                      label="立即更新"
                      icon="pi pi-cloud-download"
                      @click="performUpdate"
                      :loading="updating"
                      size="small"
                    />
                  </div>
                </div>

                <!-- 更新进行中提示 -->
                <div
                  v-if="updating"
                  class="mx-5 mb-5 p-4 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i
                        v-if="currentStep !== 'completed'"
                        class="pi pi-spin pi-spinner text-primary"
                      ></i>
                      <i v-else class="pi pi-check-circle text-green-500"></i>
                      <span class="text-sm font-medium text-color">{{ updateStep }}</span>
                    </div>
                    <span
                      v-if="currentStep === 'downloading'"
                      class="text-sm text-muted-color font-mono"
                    >
                      {{ updateProgress }}%
                    </span>
                  </div>
                  <ProgressBar
                    class="mt-2"
                    v-if="currentStep === 'downloading'"
                    :value="updateProgress"
                    :showValue="false"
                    style="height: 6px"
                  ></ProgressBar>
                </div>

                <!-- 分隔线 -->
                <div class="h-px bg-surface-100 dark:bg-surface-700 mx-5"></div>

                <!-- 更新内容 -->
                <div class="p-5 space-y-3">
                  <h4 class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-align-left text-primary"></i>
                    <span>更新内容</span>
                  </h4>
                  <div
                    v-html="marked.parse(versionInfo.change_log)"
                    class="text-sm text-color-secondary prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                  ></div>
                </div>
              </div>

              <!-- 无更新状态 -->
              <div
                v-else
                class="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-surface-50 dark:bg-surface-800"
              >
                <div
                  class="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4"
                >
                  <i class="pi pi-check text-4xl text-green-500 dark:text-green-400"></i>
                </div>
                <h3 class="text-lg font-medium text-color mb-1">当前已是最新版本</h3>
                <p class="text-sm text-muted-color">
                  您的系统版本 v{{ versionInfo.current_version }} 是最新的，无需更新
                </p>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
<style scoped>
.panel-view {
  margin: 0 auto;
}
</style>
