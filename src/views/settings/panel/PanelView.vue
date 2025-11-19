<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { PanelSettings, UpdateSource } from '@/types/settings/panel'
import panelApi from '@/apis/settings/panel'
import type { GetUpdateData } from '@/types/settings/api'

export interface VersionInfo extends GetUpdateData {
  has_update: boolean
}

const toast = useToast()
const panelSettings = ref<PanelSettings>({
  title: 'CloudSentinel',
})
const saving = ref(false)
const checkingUpdate = ref(false)
const updating = ref(false)
const hasCheckedUpdate = ref(false)

// 更新源配置
const updateSources = ref<UpdateSource[]>([
  {
    label: 'GitHub',
    value: 'github',
    description: '官方源，更新及时，国外访问较快',
  },
  {
    label: 'Gitee',
    value: 'gitee',
    description: '国内镜像源，国内访问较快',
  },
])

const selectedUpdateSource = ref<'gitee' | 'github'>('github')

// 版本信息
const versionInfo = ref<VersionInfo>()

// 检查更新
const checkForUpdate = async () => {
  checkingUpdate.value = true
  try {
    const response = await panelApi.checkUpdate(selectedUpdateSource.value)
    if (!response?.status) {
      toast.add({
        severity: 'warn',
        summary: '失败了哦',
        detail: response?.message || '无法获取版本信息',
        life: 3000,
      })
      return
    }
    const hasUpdate = false
    versionInfo.value = { ...response?.data, has_update: hasUpdate }
    hasCheckedUpdate.value = true

    toast.add({
      severity: 'info',
      summary: '成功！！！',
      detail: '检查到最新版本信息喽~',
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
  updating.value = true
  try {
    // 实际项目中这里会调用 API 执行更新
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 更新成功后更新版本信息
    // versionInfo.value.current = versionInfo.value.latest
    // versionInfo.value.hasUpdate = false
    // versionInfo.value.changelog = []

    console.log('Update completed successfully')
    // 可以添加 Toast 提示和页面刷新
  } catch (error) {
    console.error('Failed to perform update:', error)
  } finally {
    updating.value = false
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
    toast.add({ severity: 'success', summary: '保存成功', detail: '面板设置已更新', life: 3000 })
  } catch (error) {
    console.error('Failed to save panel settings:', error)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPanelSettings()
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
          <div class="space-y-6">
            <!-- 更新线路设置 -->
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <label class="text-sm font-medium text-color">更新线路</label>
                </div>
                <p class="text-sm text-muted-color">
                  选择系统更新的下载源，{{
                    updateSources.find((s) => s.value === selectedUpdateSource)?.description
                  }}
                </p>
              </div>

              <div class="flex-shrink-0 ml-6">
                <Select
                  v-model="selectedUpdateSource"
                  :options="updateSources"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="选择更新线路"
                  size="small"
                  class="w-48"
                >
                  <template #option="{ option }">
                    <div class="flex items-center gap-3 w-full">
                      <i v-if="option.value === 'github'" class="pi pi-github"></i>
                      <i v-else-if="option.value === 'gitee'" class="pi pi-heart text-red-500"></i>
                      <div class="flex-1">
                        <div class="text-sm font-medium">{{ option.label }}</div>
                        <div class="text-xs">{{ option.description }}</div>
                      </div>
                    </div>
                  </template>
                  <template #value="{ value }">
                    <div v-if="value" class="flex items-center gap-2">
                      <i v-if="value === 'github'" class="pi pi-github"></i>
                      <i v-else-if="value === 'gitee'" class="pi pi-heart text-red-500"></i>
                      <span>{{ updateSources.find((s) => s.value === value)?.label }}</span>
                    </div>
                  </template>
                </Select>
              </div>
            </div>

            <!-- 版本信息 -->
            <div
              class="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-color">当前版本:</span>
                  <span class="text-xs not-even:rounded-md text-primary font-semibold">
                    {{ versionInfo?.current_version ? 'v' + versionInfo?.current_version : '未知' }}
                  </span>
                </div>
                <p class="text-xs text-muted-color">系统运行正常</p>
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

            <!-- 更新状态展示 - 只有在检查更新后才显示 -->
            <div v-if="hasCheckedUpdate && versionInfo" class="space-y-4">
              <!-- 可用更新 -->
              <div v-if="versionInfo.has_update" class="space-y-4">
                <div
                  class="flex items-center justify-between p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"
                >
                  <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                      <div
                        class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"
                      >
                        <i class="pi pi-arrow-up text-orange-600 dark:text-orange-400 text-sm"></i>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-3">
                        <span class="text-sm font-medium text-color">发现新版本</span>
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-md bg-orange-500 text-white"
                        >
                          v{{ versionInfo.latest_version }}
                        </span>
                      </div>
                      <p class="text-xs text-muted-color">
                        发布时间：{{ versionInfo.publish_time }}
                      </p>
                    </div>
                  </div>

                  <div class="flex-shrink-0">
                    <Button
                      label="立即更新"
                      icon="pi pi-download"
                      @click="performUpdate"
                      :loading="updating"
                      size="small"
                      severity="warning"
                    />
                  </div>
                </div>

                <!-- 更新进行中提示 -->
                <div
                  v-if="updating"
                  class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                >
                  <div class="flex items-start gap-3">
                    <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-0.5"></i>
                    <div class="space-y-1">
                      <p class="text-sm font-medium text-blue-700 dark:text-blue-300">正在更新</p>
                      <p class="text-xs text-blue-600 dark:text-blue-400">
                        更新过程可能需要几分钟时间，期间系统将暂时不可用。请稍候...
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 更新内容 -->
                <div class="space-y-3">
                  <h4 class="text-sm font-medium text-color flex items-center gap-2">
                    <i class="pi pi-list text-primary"></i>
                    更新内容
                  </h4>
                  <div class="pl-6 space-y-2">
                    <div
                      v-for="(item, index) in versionInfo.change_log"
                      :key="index"
                      class="flex items-start gap-3 text-sm text-color"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                      <span>{{ item }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 无更新状态 -->
              <div v-else class="text-center py-6">
                <div class="space-y-2">
                  <i class="pi pi-check-circle text-4xl text-green-500"></i>
                  <p class="text-sm font-medium text-color">已是最新版本</p>
                  <p class="text-xs text-muted-color">您的系统已是最新版本，无需更新</p>
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
.panel-view {
  padding: 2rem;
  margin: 0 auto;
}
</style>
