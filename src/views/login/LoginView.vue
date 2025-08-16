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

// 访客登录表单
const guestForm = ref({
  password: '',
  rememberMe: false,
})

// 管理员登录表单
const adminForm = ref({
  username: '',
  password: '',
  rememberMe: false,
})

// 加载状态
const guestLoading = ref(false)
const adminLoading = ref(false)

// 权限设置
const permissions = ref(authManager.getGuestAccessConfig())

// 访客登录
const handleGuestLogin = async () => {
  if (!permissions.value.allowGuest) {
    toast.add({
      severity: 'error',
      summary: '访问被拒绝',
      detail: '访客访问功能已被禁用',
      life: 5000,
    })
    return
  }

  if (permissions.value.enablePassword && !guestForm.value.password) {
    toast.add({
      severity: 'error',
      summary: '密码必填',
      detail: '请输入访客访问密码',
      life: 3000,
    })
    return
  }

  if (
    permissions.value.enablePassword &&
    !authManager.validateGuestPassword(guestForm.value.password)
  ) {
    toast.add({
      severity: 'error',
      summary: '密码错误',
      detail: '访客访问密码不正确',
      life: 3000,
    })
    return
  }

  guestLoading.value = true
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 创建游客会话
    authManager.createGuestSession(guestForm.value.rememberMe)

    toast.add({
      severity: 'success',
      summary: '登录成功',
      detail: '欢迎访客用户',
      life: 3000,
    })

    // 跳转到首页
    router.push('/')
  } catch {
    toast.add({
      severity: 'error',
      summary: '登录失败',
      detail: '请稍后重试',
      life: 5000,
    })
  } finally {
    guestLoading.value = false
  }
}

// 管理员登录
const handleAdminLogin = async () => {
  if (!adminForm.value.username || !adminForm.value.password) {
    toast.add({
      severity: 'error',
      summary: '信息不完整',
      detail: '请输入用户名和密码',
      life: 3000,
    })
    return
  }

  adminLoading.value = true
  try {
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 这里应该调用真实的登录API
    // 暂时使用模拟验证
    if (adminForm.value.username === 'admin' && adminForm.value.password === 'admin123') {
      // 创建管理员会话（实际项目中应该由后端返回JWT token）
      const adminSession = {
        id: 'admin',
        username: adminForm.value.username,
        role: 'admin' as const,
        exp: Date.now() / 1000 + 24 * 60 * 60, // 24小时过期
      }

      // 创建模拟JWT token
      const mockToken = authManager['createMockJWT'](adminSession)
      authManager.setToken(mockToken, adminForm.value.rememberMe)

      toast.add({
        severity: 'success',
        summary: '登录成功',
        detail: `欢迎回来，${adminForm.value.username}`,
        life: 3000,
      })

      // 跳转到首页
      router.push('/')
    } else {
      throw new Error('用户名或密码错误')
    }
  } catch (error: unknown) {
    toast.add({
      severity: 'error',
      summary: '登录失败',
      detail: error instanceof Error ? error.message : '用户名或密码错误',
      life: 5000,
    })
  } finally {
    adminLoading.value = false
  }
}

// 加载权限设置
const loadPermissions = () => {
  try {
    const saved = localStorage.getItem('dashboard-permissions')
    if (saved) {
      const config = JSON.parse(saved)
      permissions.value = { ...permissions.value, ...config }
      // 同步到authManager
      authManager.saveGuestAccessConfig(permissions.value)
    }
  } catch (error) {
    console.error('加载权限设置失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadPermissions()

  // 如果已经登录，跳转到首页
  if (authManager.isAuthenticated()) {
    router.push('/')
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
          <h1 class="text-4xl font-bold text-color mb-3">CloudSentinel</h1>
          <p class="text-lg text-muted-color">登录云哨务器监控探针系统</p>
        </div>

        <Card class="shadow-2xl border-0">
          <template #content>
            <Tabs :value="activeTab" @update:value="activeTab = $event as string" class="w-full">
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
                          v-model="guestForm.password"
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
                            v-model="guestForm.rememberMe"
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
                        @click="handleGuestLogin"
                        :loading="guestLoading"
                        :disabled="permissions.enablePassword && !guestForm.password"
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
                        v-model="adminForm.username"
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
                        v-model="adminForm.password"
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
                        v-model="adminForm.rememberMe"
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
                      @click="handleAdminLogin"
                      :loading="adminLoading"
                      :disabled="!adminForm.username || !adminForm.password"
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
