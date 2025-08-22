<script setup lang="ts">
import {ref} from 'vue'
import {type FileUploadUploadEvent} from 'primevue/fileupload'

interface PanelSettings {
  title: string
}

interface VersionInfo {
  current: string
  latest: string
  hasUpdate: boolean
  updateTime: string
  changelog: string[]
}

interface UpdateSource {
  label: string
  value: string
  url: string
  description: string
}

const panelSettings = ref<PanelSettings>({
  title: 'CloudSentinel',
})

const saving = ref(false)
const checkingUpdate = ref(false)
const updating = ref(false)

// 更新源配置
const updateSources = ref<UpdateSource[]>([
  {
    label: 'GitHub',
    value: 'github',
    url: 'https://github.com/example/cloudsentinel',
    description: '官方源，更新及时，国外访问较快'
  },
  {
    label: 'Gitee',
    value: 'gitee',
    url: 'https://gitee.com/example/cloudsentinel',
    description: '国内镜像源，国内访问较快'
  }
])

const selectedUpdateSource = ref('github')

// 版本信息
const versionInfo = ref<VersionInfo>({
  current: '1.2.3',
  latest: '1.3.0',
  hasUpdate: true,
  updateTime: '2024-01-15',
  changelog: [
    '新增服务器监控面板自定义布局',
    '优化内存使用率计算算法',
    '修复网络 I/O 显示异常问题',
    '增强安全性设置选项',
    '支持更多监控指标展示'
  ]
})

// 检查更新
const checkForUpdate = async () => {
  checkingUpdate.value = true
  try {
    const currentSource = updateSources.value.find(s => s.value === selectedUpdateSource.value)
    console.log(`正在从 ${currentSource?.label} 检查更新...`, currentSource?.url)

    // 实际项目中这里会调用 API 检查更新
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 模拟更新检查结果
    const hasNewVersion = Math.random() > 0.5
    if (hasNewVersion) {
      versionInfo.value.latest = '1.4.0'
      versionInfo.value.hasUpdate = true
      versionInfo.value.updateTime = new Date().toISOString().split('T')[0]
      versionInfo.value.changelog = [
        '新增实时性能监控图表',
        '支持多服务器批量管理',
        '优化用户界面响应速度',
        '增加自动备份功能',
        '修复已知安全漏洞'
      ]
    } else {
      versionInfo.value.hasUpdate = false
    }

    console.log('Update check completed:', versionInfo.value)
    // 可以添加 Toast 提示
  } catch (error) {
    console.error('Failed to check for updates:', error)
  } finally {
    checkingUpdate.value = false
  }
}

// 执行更新
const performUpdate = async () => {
  updating.value = true
  try {
    const currentSource = updateSources.value.find(s => s.value === selectedUpdateSource.value)
    console.log(`正在从 ${currentSource?.label} 下载更新...`, currentSource?.url)

    // 实际项目中这里会调用 API 执行更新
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 更新成功后更新版本信息
    versionInfo.value.current = versionInfo.value.latest
    versionInfo.value.hasUpdate = false
    versionInfo.value.changelog = []

    console.log('Update completed successfully')
    // 可以添加 Toast 提示和页面刷新
  } catch (error) {
    console.error('Failed to perform update:', error)
  } finally {
    updating.value = false
  }
}

// 保存设置
const savePanelSettings = async () => {
  saving.value = true
  try {
    // 实际项目中这里会调用 API 保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 可以添加 Toast 提示
  } catch (error) {
    console.error('Failed to save panel settings:', error)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="panel-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-color mb-2">面板设置</h1>
      <p class="text-muted-color">配置面板的基本信息和外观设置</p>
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
                  选择系统更新的下载源，{{ updateSources.find(s => s.value === selectedUpdateSource)?.description }}
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
                      <i
                        v-if="option.value === 'github'"
                        class="pi pi-github"
                      ></i>
                      <i
                        v-else-if="option.value === 'gitee'"
                        class="pi pi-heart text-red-500"
                      ></i>
                      <div class="flex-1">
                        <div class="text-sm font-medium">{{ option.label }}</div>
                        <div class="text-xs">{{ option.description }}</div>
                      </div>
                    </div>
                  </template>
                  <template #value="{ value }">
                    <div v-if="value" class="flex items-center gap-2">
                      <i
                        v-if="value === 'github'"
                        class="pi pi-github"
                      ></i>
                      <i
                        v-else-if="value === 'gitee'"
                        class="pi pi-heart text-red-500"
                      ></i>
                      <span>{{ updateSources.find(s => s.value === value)?.label }}</span>
                    </div>
                  </template>
                </Select>
              </div>
            </div>

            <!-- 版本信息 -->
            <div class="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-color">当前版本:</span>
                  <span class="text-xs not-even:rounded-md text-primary font-semibold">
                    v{{ versionInfo.current }}
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

                        <!-- 可用更新 -->
            <div v-if="versionInfo.hasUpdate" class="space-y-4">
              <div class="flex items-center justify-between p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                <div class="flex items-center gap-4">
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <i class="pi pi-arrow-up text-orange-600 dark:text-orange-400 text-sm"></i>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-medium text-color">发现新版本</span>
                      <span class="px-2 py-1 text-xs font-medium rounded-md bg-orange-500 text-white">
                        v{{ versionInfo.latest }}
                      </span>
                    </div>
                    <p class="text-xs text-muted-color">
                      发布时间：{{ versionInfo.updateTime }}
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
              <div v-if="updating" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
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
                    v-for="(item, index) in versionInfo.changelog"
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
        </template>
      </Card>

    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end mt-6">
      <Button
        label="保存设置"
        icon="pi pi-save"
        @click="savePanelSettings"
        :loading="saving"
        class="px-6"
      />
    </div>
  </div>
</template>
<style scoped>
.panel-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
