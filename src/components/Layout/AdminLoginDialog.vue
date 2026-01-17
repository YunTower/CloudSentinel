<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const loginForm = ref({
  username: '',
  password: '',
  rememberMe: true, // 默认勾选记住登录状态
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
      toast.add({
        severity: 'success',
        summary: '登录成功',
        detail: `欢迎回来，${result.userSession.username}`,
        life: 3000,
      })

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
      toast.add({
        severity: 'error',
        summary: '登录失败',
        detail: result.error || '登录过程中发生错误',
        life: 5000,
      })
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

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    @update:visible="(value) => emit('update:visible', value)"
    modal
    :closable="true"
    :draggable="false"
    class="w-full max-w-md"
    header="管理员登录"
  >
    <div class="space-y-6 pt-4">
      <div>
        <label for="adminUsername" class="block text-sm font-medium text-color mb-3">用户名</label>
        <InputText
          id="adminUsername"
          v-model="loginForm.username"
          placeholder="请输入用户名"
          class="w-full py-3 px-4 text-base"
          @keyup.enter="handleLogin"
        />
      </div>

      <div>
        <label for="adminPassword" class="block text-sm font-medium text-color mb-3">密码</label>
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
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="取消" severity="secondary" @click="handleCancel" :disabled="isLoading" />
        <Button
          label="登录"
          icon="pi pi-sign-in"
          @click="handleLogin"
          :loading="isLoading"
          :disabled="!loginForm.username || !loginForm.password"
        />
      </div>
    </template>
  </Dialog>
</template>
