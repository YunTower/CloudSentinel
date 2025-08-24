<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { authManager } from '@/utils/auth'

// 路由和通知
const router = useRouter()
const toast = useToast()

// 当前激活的标签页
const activeTab = ref('0')

// 统一登录表单
const loginForm = ref({
  type: 'guest' as 'guest' | 'admin',
  username: '',
  password: '',
  rememberMe: false,
})

// 加载状态
const isLoading = ref(false)

// 权限设置
const permissions = ref(authManager.getGuestAccessConfig())

// 面板标题
const panelTitle = ref('CloudSentinel 云哨')

// 统一登录方法
const handleLogin = async () => {
  const { type, username, password, rememberMe } = loginForm.value

  // 访客登录验证
  if (type === 'guest') {
    if (!permissions.value.allowGuest) {
      toast.add({
        severity: 'error',
        summary: '访问被拒绝',
        detail: '访客访问功能已被禁用',
        life: 5000,
      })
      return
    }

    if (permissions.value.enablePassword && !password) {
      toast.add({
        severity: 'error',
        summary: '密码必填',
        detail: '请输入访客访问密码',
        life: 3000,
      })
      return
    }

    if (permissions.value.enablePassword && !authManager.validateGuestPassword(password)) {
      toast.add({
        severity: 'error',
        summary: '密码错误',
        detail: '访客访问密码不正确',
        life: 3000,
      })
      return
    }
  }

  // 管理员登录验证
  if (type === 'admin') {
    if (!username || !password) {
      toast.add({
        severity: 'error',
        summary: '信息不完整',
        detail: '请输入用户名和密码',
        life: 3000,
      })
      return
    }
  }

  isLoading.value = true
  try {
    if (type === 'guest') {
      // 游客登录
      await authManager.guestLogin(password, rememberMe)

      toast.add({
        severity: 'success',
        summary: '登录成功',
        detail: '欢迎访客用户',
        life: 3000,
      })
    } else {
      // 管理员登录
      const userSession = await authManager.login(username, password, rememberMe)

      toast.add({
        severity: 'success',
        summary: '登录成功',
        detail: `欢迎回来，${userSession.username}`,
        life: 3000,
      })
    }

    // 跳转到首页
    await router.push('/')
  } catch (error: unknown) {
    toast.add({
      severity: 'error',
      summary: '登录失败',
      detail: error instanceof Error ? error.message : '请稍后重试',
      life: 5000,
    })
  } finally {
    isLoading.value = false
  }
}

// 切换登录类型时重置表单
const handleTabChange = (tabValue: string | number) => {
  const newTab = tabValue.toString()

  // 如果尝试选择访客访问tab但权限不足，强制选择管理员登录
  if (newTab === '0' && !permissions.value.allowGuest) {
    activeTab.value = '1'
    loginForm.value.type = 'admin'
  } else {
    activeTab.value = newTab
    loginForm.value.type = newTab === '0' ? 'guest' : 'admin'
  }

  // 重置表单数据
  loginForm.value.username = ''
  loginForm.value.password = ''
  loginForm.value.rememberMe = false
}

// 加载公开设置
const loadPublicSettings = async () => {
  try {
    // 从API加载权限设置
    const config = await authManager.loadPublicSettings()
    permissions.value = config

    // 从API加载面板标题
    const title = await authManager.getPanelTitle()
    panelTitle.value = title

    // 如果未开启游客登录，默认选中管理员登录tab
    if (!permissions.value.allowGuest) {
      activeTab.value = '1'
      loginForm.value.type = 'admin'
    }
  } catch (error) {
    console.error('加载公开设置失败:', error)
    // 如果API失败，使用默认配置
    permissions.value = authManager.getGuestAccessConfig()

    // 同样检查默认配置下的游客登录权限
    if (!permissions.value.allowGuest) {
      activeTab.value = '1'
      loginForm.value.type = 'admin'
    }
  }
}

onMounted(async () => {
  await loadPublicSettings()

  // 如果已经登录且不在首页，跳转到首页
  if (authManager.isAuthenticated() && router.currentRoute.value.path !== '/') {
    router.replace('/')
  }
})
</script>

<template>
  <div class="login-view">
    <Toast />
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 p-4"
    >
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-color mb-3">{{ panelTitle }}</h1>
          <p class="text-lg text-muted-color">登录云哨务器监控探针系统</p>
        </div>

        <Card class="shadow-2xl border-0">
          <template #content>
            <Tabs :value="activeTab" @update:value="handleTabChange" class="w-full">
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
                          v-model="loginForm.password"
                          placeholder="请输入访客访问密码"
                          toggleMask
                          :feedback="false"
                          class="w-full"
                          :pt="{
                            root: { class: 'w-full' },
                            input: { class: 'w-full py-3 px-4 text-base' },
                          }"
                        />
                        <div class="flex items-center gap-3">
                          <Checkbox
                            id="guestRememberMe"
                            v-model="loginForm.rememberMe"
                            :binary="true"
                            class="w-5 h-5"
                          />
                          <label
                            for="guestRememberMe"
                            class="text-sm text-muted-color cursor-pointer"
                            >记住登录状态</label
                          >
                        </div>
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
                        v-model="loginForm.username"
                        placeholder="请输入用户名"
                        class="w-full py-3 px-4 text-base"
                      />
                    </div>

                    <div>
                      <label for="adminPassword" class="block text-sm font-medium text-color mb-3"
                        >密码</label
                      >
                      <Password
                        id="adminPassword"
                        v-model="loginForm.password"
                        placeholder="请输入密码"
                        toggleMask
                        :feedback="false"
                        class="w-full"
                        :pt="{
                          root: { class: 'w-full' },
                          input: { class: 'w-full py-3 px-4 text-base' },
                        }"
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
          <p class="text-sm text-muted-color">© 2024 CloudSentinel. 服务器监控探针系统</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .login-view {
    padding: 1rem;
  }

  .w-full.max-w-md {
    max-width: 100%;
  }
}
</style>
