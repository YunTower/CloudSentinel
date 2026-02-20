<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { RiLoginBoxLine } from '@remixicon/vue'
import { useAuthStore } from '@/stores/auth'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const message = useMessage()
const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref<FormInst | null>(null)
const isLoading = ref(false)
const loginForm = ref({
  username: '',
  password: '',
  rememberMe: true, // 默认勾选记住登录状态
})

/** 管理员登录表单校验 */
const loginRules: FormRules = {
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

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loginForm.value = {
        username: '',
        password: '',
        rememberMe: true,
      }
      loginFormRef.value?.restoreValidation()
    }
  },
)

const handleLogin = async () => {
  const valid = await new Promise<boolean>((resolve) => {
    loginFormRef.value?.validate((err) => resolve(!err?.length))
  })
  if (!valid) return

  const { username, password, rememberMe } = loginForm.value
  isLoading.value = true
  try {
    const result = await authStore.handleAdminLogin(username, password, rememberMe)
    if (result.success && result.userSession) {
      message.success('欢迎回来', { duration: 3000 })

      emit('update:visible', false)

      await new Promise((resolve) => setTimeout(resolve, 100))
      const redirectUri = router.currentRoute.value.query.redirect_uri as string
      const intendedPath = sessionStorage.getItem('intended_path')

      if (redirectUri) {
        await router.replace(redirectUri)
      } else if (intendedPath) {
        await router.replace(intendedPath)
        sessionStorage.removeItem('intended_path')
      } else {
        await router.replace(router.currentRoute.value.fullPath)
      }
    } else {
      message.error(result.error || '登录过程中发生错误', { duration: 5000 })
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

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <n-modal
    v-model:show="isVisible"
    :mask-closable="false"
    title="管理员登录"
    preset="card"
    class="w-[450px]!"
    closable
    @close="handleCancel"
  >
    <n-form
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      label-placement="top"
      require-mark-placement="right-hanging"
      class="pt-2"
    >
      <n-form-item label="用户名" path="username" required>
        <n-input
          v-model:value="loginForm.username"
          placeholder="请输入用户名"
          autocomplete="username"
          size="large"
          @keyup.enter="handleLogin"
        />
      </n-form-item>
      <n-form-item label="密码" path="password" required>
        <n-input
          v-model:value="loginForm.password"
          type="password"
          show-password-on="click"
          placeholder="请输入密码"
          autocomplete="current-password"
          size="large"
          @keyup.enter="handleLogin"
        />
      </n-form-item>
      <n-form-item path="adminRememberMe" :show-feedback="false" :show-label="false">
        <n-checkbox v-model:checked="loginForm.rememberMe" label="记住登录状态" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button type="default" :disabled="isLoading" @click="handleCancel"> 取消 </n-button>
        <n-button type="primary" :loading="isLoading" @click="handleLogin">
          <template #icon>
            <ri-login-box-line />
          </template>
          登录
        </n-button>
      </div>
    </template>
  </n-modal>
</template>
