<script setup lang="ts">
import {ref} from 'vue'
import {type FileUploadUploadEvent} from 'primevue/fileupload'

interface SiteSettings {
  title: string
  favicon: string
  logo: string
}

const siteSettings = ref<SiteSettings>({
  title: 'CloudSentinel',
  favicon: '',
  logo: ''
})

const saving = ref(false)

// 上传图标
const onFaviconUpload = (event: FileUploadUploadEvent) => {
  // 实际项目中这里会处理文件上传
  console.log('Favicon uploaded:', event)
  // if (Array.isArray(event.files) && event.files.length > 0) {
  //   siteSettings.value.favicon = URL.createObjectURL(event.files[0])
  // }
}

// 上传 Logo
const onLogoUpload = (event: FileUploadUploadEvent) => {
  // 实际项目中这里会处理文件上传
  console.log('Logo uploaded:', event)
  // if (Array.isArray(event.files) && event.files.length > 0) {
  //   siteSettings.value.logo = URL.createObjectURL(event.files[0])
  // }
}

// 保存设置
const saveSiteSettings = async () => {
  saving.value = true
  try {
    // 实际项目中这里会调用 API 保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Site settings saved:', siteSettings.value)
    // 可以添加 Toast 提示
  } catch (error) {
    console.error('Failed to save site settings:', error)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="site-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-color mb-2">站点设置</h1>
      <p class="text-muted-color">配置站点的基本信息和外观设置</p>
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
            <!-- 站点标题 -->
            <div class="flex flex-col gap-2">
              <label for="siteTitle" class="text-sm font-medium text-color">站点标题</label>
              <InputText
                id="siteTitle"
                v-model="siteSettings.title"
                placeholder="请输入站点标题"
                class="w-full"
              />
            </div>

            <!-- 网站图标 -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-color">网站图标 (Favicon)</label>
              <div class="flex items-center gap-4">
                <div
                  class="w-16 h-16 rounded-lg flex items-center justify-center bg-surface-50 dark:bg-surface-800">
                  <img v-if="siteSettings.favicon" :src="siteSettings.favicon" alt="favicon"
                       class="w-12 h-12 object-contain">
                  <i v-else class="pi pi-image text-2xl text-muted-color"></i>
                </div>
                <div class="flex-1">
                  <FileUpload
                    mode="basic"
                    name="favicon"
                    :url="'/api/upload'"
                    accept="image/*"
                    :maxFileSize="1000000"
                    @upload="onFaviconUpload"
                    chooseLabel="选择图标"
                    class="p-button-outlined"
                  />
                  <small class="text-muted-color block mt-1">支持 PNG、ICO 格式，建议 32x32
                    像素</small>
                </div>
              </div>
            </div>

            <!-- Logo -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-color">网站 Logo</label>
              <div class="flex items-center gap-4">
                <div
                  class="w-16 h-16 rounded-lg flex items-center justify-center bg-surface-50 dark:bg-surface-800">
                  <img v-if="siteSettings.logo" :src="siteSettings.logo" alt="logo"
                       class="w-12 h-12 object-contain">
                  <i v-else class="pi pi-image text-2xl text-muted-color"></i>
                </div>
                <div class="flex-1">
                  <FileUpload
                    mode="basic"
                    name="logo"
                    :url="'/api/upload'"
                    accept="image/*"
                    :maxFileSize="2000000"
                    @upload="onLogoUpload"
                    chooseLabel="选择 Logo"
                    class="p-button-outlined"
                  />
                  <small class="text-muted-color block mt-1">支持 PNG、JPG 格式，建议 200x50
                    像素</small>
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
        @click="saveSiteSettings"
        :loading="saving"
        class="px-6"
      />
    </div>
  </div>
</template>
<style scoped>
.site-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
