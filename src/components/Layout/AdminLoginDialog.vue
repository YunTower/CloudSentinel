<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from '@/composables/useNotifications'
import { useAuthStore } from '@/stores/auth'
import { RiLogoutBoxLine } from '@remixicon/vue'

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

const isLoading = ref(false)
const loginForm = ref({
  username: '',
  password: '',
  rememberMe: true, // 默认勾选记住登录状态
})

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
        rememberMe: true, // 默认勾选记住登录状态
      }
    }
  },
)

const handleLogin = async () => {
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
  <n-modal v-model:show="isVisible" :mask-closable="false">
    <n-card
      style="width: 448px"
      title="管理员登录"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
      @close="handleCancel"
    >
      <div class="space-y-6 pt-2">
        <div>
          <label for="adminUsername" class="block text-sm font-medium mb-2">用户名</label>
          <n-input
            id="adminUsername"
            v-model:value="loginForm.username"
            placeholder="请输入用户名"
            autocomplete="username"
            size="large"
            @keyup.enter="handleLogin"
          />
        </div>

        <div>
          <label for="adminPassword" class="block text-sm font-medium mb-2">密码</label>
          <n-input
            id="adminPassword"
            v-model:value="loginForm.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            autocomplete="current-password"
            size="large"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="flex items-center gap-3">
          <n-checkbox id="adminRememberMe" v-model:checked="loginForm.rememberMe">
            记住登录状态
          </n-checkbox>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button type="default" :disabled="isLoading" @click="handleCancel"> 取消 </n-button>
          <n-button
            type="primary"
            :loading="isLoading"
            :disabled="!loginForm.username || !loginForm.password"
            @click="handleLogin"
          >
            <template #icon>
              <ri-logout-box-line />
            </template>
            登录
          </n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>
