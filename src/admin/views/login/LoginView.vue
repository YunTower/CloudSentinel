<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { useAuthStore } from '@/admin/stores/auth'
import { isSafeInternalRedirect } from '@/admin/router/guards'
import { RiLoginCircleLine } from '@remixicon/vue'

const message = useMessage()
const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false) // 加载状态
const panelTitle = ref('CloudSentinel 云哨')

const adminFormRef = ref<FormInst | null>(null)

const loginForm = ref({
  username: '',
  password: '',
  rememberMe: true,
})

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
  const { username, password, rememberMe } = loginForm.value

  const valid = await new Promise<boolean>((resolve) => {
    adminFormRef.value?.validate((err) => resolve(!err?.length))
  })
  if (!valid) return

  isLoading.value = true
  try {
    const result = await authStore.handleAdminLogin(username, password, rememberMe)
    if (result.success && result.userSession) {
      message.success('欢迎回来', { duration: 3000 })
    } else {
      message.error(result.error || '登录过程中发生错误', { duration: 5000 })
      return
    }

    // 登录成功后重定向
    const redirectUri = router.currentRoute.value.query.redirect_uri as string
    const intendedPath = sessionStorage.getItem('intended_path')

    // 确保状态更新完成后再进行路由跳转
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (isSafeInternalRedirect(redirectUri)) {
      await router.replace(redirectUri)
    } else if (intendedPath && isSafeInternalRedirect(intendedPath)) {
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

// 加载面板标题
const loadPanelTitle = async () => {
  try {
    panelTitle.value = await authStore.getPanelTitle()
  } catch (error) {
    console.error('Failed to load panel title:', error)
  }
}

// 检查是否已登录，若已登录则跳回意图路径或首页
const checkLoginStatus = () => {
  if (authStore.isAuthenticated) {
    const redirectUri = router.currentRoute.value.query.redirect_uri as string | undefined
    router.replace(
      redirectUri && isSafeInternalRedirect(redirectUri) && redirectUri !== '/login'
        ? redirectUri
        : '/',
    )
  }
}

onMounted(async () => {
  await loadPanelTitle()

  // 检查登录状态
  checkLoginStatus()
})
</script>

<template>
  <div class="w-full h-full min-h-dvh flex flex-col items-center justify-center">
    <div class="w-full max-w-md">
      <n-card :bordered="false" class="rounded-md!">
        <div class="text-center mb-12">
          <n-h1 class="text-color mb-1!">{{ panelTitle }}</n-h1>
          <n-p class="text-muted-color mt-0!">登录云哨服务器状态监测系统</n-p>
        </div>
        <n-form
          ref="adminFormRef"
          :model="loginForm"
          :rules="adminRules"
          label-placement="top"
          require-mark-placement="right-hanging"
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
            <n-button type="primary" class="w-full" :loading="isLoading" block @click="handleLogin">
              <template #icon>
                <n-icon>
                  <ri-login-circle-line />
                </n-icon>
              </template>
              管理员登录
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>
    </div>
    <div class="text-center absolute bottom-5">
      <span class="text-sm text-muted-color"
        >由
        <a class="hover:underline" href="https://github.com/YunTower/CloudSentinel" target="_blank"
          >CloudSentinel</a
        >
        提供服务器监测支持</span
      >
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
