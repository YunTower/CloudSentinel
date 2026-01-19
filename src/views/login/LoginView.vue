<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import { useAuthStore } from '@/stores/auth'

const { toast } = useNotifications()
const router = useRouter()
const authStore = useAuthStore()
const activeTab = ref('0') // 当前激活的标签页
const isLoading = ref(false) // 加载状态
const panelTitle = ref('CloudSentinel 云哨')
const permissions = ref(authStore.getGuestAccessConfig()) // 权限设置

const loginForm = ref({
  type: 'guest' as 'guest' | 'admin',
  username: '',
  password: '',
  rememberMe: true,
})

const handleLogin = async () => {
  const { type, username, password, rememberMe } = loginForm.value

  isLoading.value = true
  try {
    let result

    if (type === 'guest') {
      result = await authStore.handleGuestLogin(password, rememberMe, permissions.value)
      if (result.success && result.userSession) {
        toast.add({
          severity: 'success',
          summary: '登录成功',
          detail: '欢迎访客用户',
          life: 3000,
        })
      } else {
        toast.add({
          severity: 'error',
          summary: '登录失败',
          detail: result.error || '登录过程中发生错误',
          life: 5000,
        })
        return
      }
    } else {
      result = await authStore.handleAdminLogin(username, password, rememberMe)
      if (result.success && result.userSession) {
        toast.add({
          severity: 'success',
          summary: '登录成功',
          detail: `欢迎回来，${result.userSession.username}`,
          life: 3000,
        })
      } else {
        toast.add({
          severity: 'error',
          summary: '登录失败',
          detail: result.error || '登录过程中发生错误',
          life: 5000,
        })
        return
      }
    }

    // 登录成功后重定向
    const redirectUri = router.currentRoute.value.query.redirect_uri as string
    const intendedPath = sessionStorage.getItem('intended_path')

    // 确保状态更新完成后再进行路由跳转
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (redirectUri) {
      await router.replace(redirectUri)
    } else if (intendedPath) {
      await router.replace(intendedPath)
      sessionStorage.removeItem('intended_path')
    } else {
      await router.replace('/')
    }
  } catch (error) {
    console.error('Login failed:', error)
    toast.add({
      severity: 'error',
      summary: '登录失败',
      detail: (error as { message: string }).message || '登录过程中发生错误',
      life: 5000,
    })
  } finally {
    isLoading.value = false
  }
}

// 切换标签页
const switchTab = (tabIndex: string | number) => {
  activeTab.value = tabIndex.toString()
  // 重置表单
  loginForm.value = {
    type: tabIndex === '0' ? 'guest' : 'admin',
    username: '',
    password: '',
    rememberMe: true,
  }
}

// 加载公开设置
const loadPublicSettings = async () => {
  try {
    permissions.value = await authStore.loadPublicSettings()
  } catch (error) {
    console.error('Failed to load public settings:', error)
  }
}

// 加载面板标题
const loadPanelTitle = async () => {
  try {
    panelTitle.value = await authStore.getPanelTitle()
  } catch (error) {
    console.error('Failed to load panel title:', error)
  }
}

// 检查是否已登录
const checkLoginStatus = () => {
  if (authStore.isAuthenticated && router.currentRoute.value.path !== '/') {
    // 如果已经登录且不在首页，跳转到首页
    router.replace('/')
  }
}

onMounted(async () => {
  // 加载公开设置和面板标题
  await Promise.all([loadPublicSettings(), loadPanelTitle()])

  // 检查登录状态
  checkLoginStatus()

  if (!permissions.value.allowGuest) {
    switchTab('1')
  }
})
</script>

<template>
  <div class="login-view">
    <Toast position="top-right" />
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 p-4"
    >
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-color mb-3">{{ panelTitle }}</h1>
          <p class="text-lg text-muted-color">登录云哨服务器状态监测系统</p>
        </div>

        <Card class="shadow-2xl border-0">
          <template #content>
            <Tabs :value="activeTab" @update:value="switchTab" class="w-full">
              <TabList class="w-full">
                <Tab value="0" class="flex-1" v-if="permissions.allowGuest">
                  <div class="flex items-center justify-center gap-2">
                    <span>访客访问</span>
                  </div>
                </Tab>
                <Tab value="1" class="flex-1">
                  <div class="flex items-center justify-center gap-2">
                    <span>管理员登录</span>
                  </div>
                </Tab>
              </TabList>

              <TabPanels>
                <!-- 访客访问 -->
                <TabPanel value="0" class="p-0">
                  <div class="space-y-6 pt-4">
                    <div class="space-y-6">
                      <!-- 访客密码验证 -->
                      <div v-if="permissions.enablePassword">
                        <label for="guestPassword" class="block text-sm font-medium text-color mb-3"
                          >访问密码</label
                        >
                        <Password
                          id="guestPassword"
                          name="guestPassword"
                          v-model="loginForm.password"
                          placeholder="请输入访客访问密码"
                          toggleMask
                          :feedback="false"
                          autocomplete="current-password"
                          class="w-full"
                          :pt="{
                            root: { class: 'w-full' },
                            input: { class: 'w-full py-3 px-4 text-base' },
                          }"
                          @keyup.enter="handleLogin"
                        />
                      </div>
                      <div class="flex items-center gap-3">
                        <Checkbox
                          id="guestRememberMe"
                          v-model="loginForm.rememberMe"
                          :binary="true"
                          class="w-5 h-5"
                        />
                        <label for="guestRememberMe" class="text-sm text-muted-color cursor-pointer"
                          >记住登录状态</label
                        >
                      </div>

                      <Button
                        label="访客访问"
                        icon="pi pi-sign-in"
                        @click="handleLogin"
                        :loading="isLoading"
                        :disabled="permissions.enablePassword && !loginForm.password"
                        class="w-full py-4 text-base font-medium"
                      />
                    </div>
                  </div>
                </TabPanel>

                <!-- 管理员登录 -->
                <TabPanel value="1" class="p-0">
                  <div class="space-y-6 pt-4">
                    <div>
                      <label for="adminUsername" class="block text-sm font-medium text-color mb-3"
                        >用户名</label
                      >
                      <InputText
                        id="adminUsername"
                        name="username"
                        v-model="loginForm.username"
                        placeholder="请输入用户名"
                        autocomplete="username"
                        class="w-full py-3 px-4 text-base"
                        @keyup.enter="handleLogin"
                      />
                    </div>

                    <div>
                      <label for="adminPassword" class="block text-sm font-medium text-color mb-3"
                        >密码</label
                      >
                      <Password
                        id="adminPassword"
                        name="password"
                        v-model="loginForm.password"
                        placeholder="请输入密码"
                        toggleMask
                        :feedback="false"
                        autocomplete="current-password"
                        class="w-full"
                        :pt="{
                          root: { class: 'w-full' },
                          input: { class: 'w-full py-3 px-4 text-base' },
                        }"
                        @keyup.enter="handleLogin"
                      />
                    </div>

                    <div class="flex items-center gap-3">
                      <Checkbox
                        id="adminRememberMe"
                        v-model="loginForm.rememberMe"
                        :binary="true"
                        class="w-5 h-5"
                      />
                      <label for="adminRememberMe" class="text-sm text-muted-color cursor-pointer"
                        >记住登录状态</label
                      >
                    </div>

                    <Button
                      label="管理员登录"
                      icon="pi pi-sign-in"
                      @click="handleLogin"
                      :loading="isLoading"
                      :disabled="!loginForm.username || !loginForm.password"
                      class="w-full py-4 text-base font-medium"
                    />
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </template>
        </Card>

        <div class="text-center mt-8">
          <span class="text-sm text-muted-color">由 <a class="hover:underline" href="https://github.com/YunTower/CloudSentinel" target="_blank">CloudSentinel</a> 提供服务器监测支持</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .w-full.max-w-md {
    max-width: 100%;
  }
}
</style>
