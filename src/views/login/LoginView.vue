<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { RiLoginBoxLine } from '@remixicon/vue'

const message = useMessage()
const router = useRouter()
const authStore = useAuthStore()
const activeTab = ref('0') // 当前激活的标签页
const isLoading = ref(false) // 加载状态
const panelTitle = ref('CloudSentinel 云哨')
const permissions = ref(authStore.getGuestAccessConfig()) // 权限设置

const guestFormRef = ref<FormInst | null>(null)
const adminFormRef = ref<FormInst | null>(null)

const loginForm = ref({
  type: 'guest' as 'guest' | 'admin',
  username: '',
  password: '',
  rememberMe: true,
})

/** 访客表单校验：启用密码时必填 */
const guestRules: FormRules = {
  password: [
    {
      required: true,
      message: '请输入访客访问密码',
      trigger: ['blur', 'input'],
    },
  ],
}

/** 管理员表单校验 */
const adminRules: FormRules = {
  username: [
    {
      required: true,
      message: '请输入用户名',
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: ['blur', 'input'],
    },
  ],
}

const handleLogin = async () => {
  const { type, username, password, rememberMe } = loginForm.value

  if (type === 'guest') {
    if (permissions.value.enablePassword) {
      const valid = await new Promise<boolean>((resolve) => {
        guestFormRef.value?.validate((err) => resolve(!err?.length))
      })
      if (!valid) return
    }
  } else {
    const valid = await new Promise<boolean>((resolve) => {
      adminFormRef.value?.validate((err) => resolve(!err?.length))
    })
    if (!valid) return
  }

  isLoading.value = true
  try {
    let result

    if (type === 'guest') {
      result = await authStore.handleGuestLogin(password, rememberMe, permissions.value)
      if (result.success && result.userSession) {
        message.success('欢迎访客用户', { duration: 3000 })
      } else {
        message.error(result.error || '登录过程中发生错误', { duration: 5000 })
        return
      }
    } else {
      result = await authStore.handleAdminLogin(username, password, rememberMe)
      if (result.success && result.userSession) {
        message.success('欢迎回来', { duration: 3000 })
      } else {
        message.error(result.error || '登录过程中发生错误', { duration: 5000 })
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
    message.error((error as { message: string }).message || '登录过程中发生错误', {
      duration: 5000,
    })
  } finally {
    isLoading.value = false
  }
}

/** 切换标签页并重置表单与校验 */
const switchTab = (tabIndex: string | number) => {
  activeTab.value = tabIndex.toString()
  loginForm.value = {
    type: tabIndex === '0' ? 'guest' : 'admin',
    username: '',
    password: '',
    rememberMe: true,
  }
  guestFormRef.value?.restoreValidation()
  adminFormRef.value?.restoreValidation()
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
  <div class="w-full">
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 p-4"
    >
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-color mb-3">{{ panelTitle }}</h1>
          <p class="text-lg text-muted-color">登录云哨服务器状态监测系统</p>
        </div>

        <n-card class="shadow-2xl border-0">
          <n-tabs :value="activeTab" justify-content="center" @update:value="switchTab">
            <n-tab-pane v-if="permissions.allowGuest" name="0" tab="访客访问">
              <n-form
                ref="guestFormRef"
                :model="loginForm"
                :rules="permissions.enablePassword ? guestRules : undefined"
                label-placement="top"
                require-mark-placement="right-hanging"
                class="pt-4"
              >
                <n-form-item
                  v-if="permissions.enablePassword"
                  label="访问密码"
                  path="password"
                  required
                >
                  <n-input
                    v-model:value="loginForm.password"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入访客访问密码"
                    class="w-full"
                    @keyup.enter="handleLogin"
                  />
                </n-form-item>
                <n-form-item path="guestRememberMe" :show-feedback="false" :show-label="false">
                  <n-checkbox v-model:checked="loginForm.rememberMe" label="记住登录状态" />
                </n-form-item>
                <n-form-item>
                  <n-button
                    type="primary"
                    class="w-full"
                    :loading="isLoading"
                    block
                    @click="handleLogin"
                  >
                    <template #icon>
                      <ri-login-box-line />
                    </template>
                    访客访问
                  </n-button>
                </n-form-item>
              </n-form>
            </n-tab-pane>

            <n-tab-pane name="1" tab="管理员登录">
              <n-form
                ref="adminFormRef"
                :model="loginForm"
                :rules="adminRules"
                label-placement="top"
                require-mark-placement="right-hanging"
                class="pt-4"
              >
                <n-form-item label="用户名" path="username" required>
                  <n-input
                    v-model:value="loginForm.username"
                    placeholder="请输入用户名"
                    class="w-full"
                    @keyup.enter="handleLogin"
                  />
                </n-form-item>
                <n-form-item label="密码" path="password" required>
                  <n-input
                    v-model:value="loginForm.password"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入密码"
                    class="w-full"
                    @keyup.enter="handleLogin"
                  />
                </n-form-item>
                <n-form-item path="adminRememberMe" :show-feedback="false" :show-label="false">
                  <n-checkbox v-model:checked="loginForm.rememberMe" label="记住登录状态" />
                </n-form-item>
                <n-form-item>
                  <n-button
                    type="primary"
                    class="w-full"
                    :loading="isLoading"
                    block
                    @click="handleLogin"
                  >
                    <template #icon>
                      <ri-login-box-line />
                    </template>
                    管理员登录
                  </n-button>
                </n-form-item>
              </n-form>
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <div class="text-center mt-8">
          <span class="text-sm text-muted-color"
            >由
            <a
              class="hover:underline"
              href="https://github.com/YunTower/CloudSentinel"
              target="_blank"
              >CloudSentinel</a
            >
            提供服务器监测支持</span
          >
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
