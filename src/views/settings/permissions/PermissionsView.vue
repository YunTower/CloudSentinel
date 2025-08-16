<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { authManager, type GuestAccessConfig } from '@/utils/auth'

const toast = useToast()

interface PermissionSettings extends GuestAccessConfig {
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  jwtSecret: string
  jwtExpiration: number
}

interface AdminAccount {
  username: string
  newUsername: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const permissions = ref<PermissionSettings>({
  allowGuest: true,
  enablePassword: false,
  guestPassword: '',
  hideSensitiveInfo: true,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  jwtSecret: 'your-secret-key',
  jwtExpiration: 24
})

const adminAccount = ref<AdminAccount>({
  username: 'admin',
  newUsername: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const saving = ref(false)
const updatingUsername = ref(false)
const updatingPassword = ref(false)

// 保存权限设置
const savePermissions = async () => {
  saving.value = true
  try {
    // 保存到authManager
    authManager.saveGuestAccessConfig({
      allowGuest: permissions.value.allowGuest,
      enablePassword: permissions.value.enablePassword,
      guestPassword: permissions.value.guestPassword,
      hideSensitiveInfo: permissions.value.hideSensitiveInfo
    })

    // 保存完整配置到localStorage
    localStorage.setItem('dashboard-permissions', JSON.stringify(permissions.value))

    toast.add({
      severity: 'success',
      summary: '保存成功',
      detail: '权限设置已更新',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: '请稍后重试',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

// 修改用户名
const updateUsername = async () => {
  if (adminAccount.value.newUsername === adminAccount.value.username) {
    toast.add({
      severity: 'warn',
      summary: '无需修改',
      detail: '新用户名与当前用户名相同',
      life: 3000
    })
    return
  }

  updatingUsername.value = true
  try {
    // 实际项目中这里会调用 API 修改用户名
    await new Promise(resolve => setTimeout(resolve, 1000))
    adminAccount.value.username = adminAccount.value.newUsername
    adminAccount.value.newUsername = ''
    adminAccount.value.currentPassword = ''

    toast.add({
      severity: 'success',
      summary: '修改成功',
      detail: '用户名已更新',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '修改失败',
      detail: '请稍后重试',
      life: 5000
    })
  } finally {
    updatingUsername.value = false
  }
}

// 修改密码
const updatePassword = async () => {
  if (adminAccount.value.newPassword !== adminAccount.value.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: '密码不匹配',
      detail: '新密码与确认密码不一致',
      life: 5000
    })
    return
  }

  updatingPassword.value = true
  try {
    // 实际项目中这里会调用 API 修改密码
    await new Promise(resolve => setTimeout(resolve, 1000))
    adminAccount.value.currentPassword = ''
    adminAccount.value.newPassword = ''
    adminAccount.value.confirmPassword = ''

    toast.add({
      severity: 'success',
      summary: '修改成功',
      detail: '密码已更新',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '修改失败',
      detail: '请稍后重试',
      life: 5000
    })
  } finally {
    updatingPassword.value = false
  }
}

// 加载权限设置
const loadPermissions = () => {
  try {
    const saved = localStorage.getItem('dashboard-permissions')
    if (saved) {
      const config = JSON.parse(saved)
      permissions.value = { ...permissions.value, ...config }
    }
  } catch (error) {
    console.error('加载权限设置失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadPermissions()
})
</script>
<template>
  <div class="permissions-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-color mb-2">权限设置</h1>
      <p class="text-muted-color">管理访问权限、用户认证和安全设置</p>
    </div>

    <div class="masonry-container">
      <!-- 访问控制 -->
      <Card class="masonry-item">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-lock text-primary"></i>
            <span>访问控制</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-6">
            <!-- 游客访问 -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">允许游客访问</label>
                  <p class="text-xs text-muted-color mt-1">开启后，未登录用户可以访问监控面板</p>
                </div>
                <ToggleSwitch v-model="permissions.allowGuest" />
              </div>
            </div>

            <!-- 访问密码 -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-color">启用访问密码</label>
                  <p class="text-xs text-muted-color mt-1">设置后，游客需要输入密码才能访问</p>
                </div>
                <ToggleSwitch v-model="permissions.enablePassword" />
              </div>

              <div v-if="permissions.enablePassword" class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700">
                <div class="flex flex-col gap-2">
                  <label for="guestPassword" class="text-sm font-medium text-color">访问密码</label>
                  <Password
                    id="guestPassword"
                    v-model="permissions.guestPassword"
                    placeholder="请设置访问密码"
                    toggleMask
                    :feedback="false"
                    class="w-full"
                  />
                </div>
              </div>
            </div>

            <!-- 隐藏敏感信息 -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-color">隐藏服务器敏感信息</label>
                <p class="text-xs text-muted-color mt-1">对游客隐藏服务器详细配置、IP地址等敏感信息</p>
              </div>
              <ToggleSwitch v-model="permissions.hideSensitiveInfo" />
            </div>
          </div>
        </template>
      </Card>

      <!-- 管理员账户 -->
      <Card class="masonry-item">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-user-cog text-primary"></i>
            <span>管理员账户</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- 当前用户名 -->
            <div class="flex flex-col gap-2">
              <label for="currentUsername" class="text-sm font-medium text-color">当前用户名</label>
              <InputText
                id="currentUsername"
                :value="adminAccount.username"
                disabled
                class="w-full"
              />
            </div>

            <!-- 修改用户名 -->
            <div class="flex flex-col gap-2">
              <label for="newUsername" class="text-sm font-medium text-color">新用户名</label>
              <InputText
                id="newUsername"
                v-model="adminAccount.newUsername"
                placeholder="请输入新用户名"
                class="w-full"
              />
            </div>

            <!-- 当前密码 -->
            <div class="flex flex-col gap-2">
              <label for="currentPassword" class="text-sm font-medium text-color">当前密码</label>
              <Password
                id="currentPassword"
                v-model="adminAccount.currentPassword"
                placeholder="请输入当前密码"
                toggleMask
                :feedback="false"
                class="w-full"
              />
            </div>

            <!-- 新密码 -->
            <div class="flex flex-col gap-2">
              <label for="newPassword" class="text-sm font-medium text-color">新密码</label>
              <Password
                id="newPassword"
                v-model="adminAccount.newPassword"
                placeholder="请输入新密码"
                toggleMask
                :promptLabel="'请输入密码'"
                :weakLabel="'弱'"
                :mediumLabel="'中'"
                :strongLabel="'强'"
                class="w-full"
              />
            </div>

            <!-- 确认新密码 -->
            <div class="flex flex-col gap-2">
              <label for="confirmPassword" class="text-sm font-medium text-color">确认新密码</label>
              <Password
                id="confirmPassword"
                v-model="adminAccount.confirmPassword"
                placeholder="请再次输入新密码"
                toggleMask
                :feedback="false"
                class="w-full"
              />
            </div>

            <!-- 修改按钮 -->
            <div class="flex gap-3 mt-6">
              <Button
                label="修改用户名"
                icon="pi pi-user-edit"
                @click="updateUsername"
                :loading="updatingUsername"
                :disabled="!adminAccount.newUsername || !adminAccount.currentPassword"
                severity="secondary"
                outlined
                class="flex-1"
              />
              <Button
                label="修改密码"
                icon="pi pi-key"
                @click="updatePassword"
                :loading="updatingPassword"
                :disabled="!adminAccount.newPassword || !adminAccount.confirmPassword || !adminAccount.currentPassword"
                class="flex-1"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- 会话管理 -->
      <Card class="masonry-item">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-primary"></i>
            <span>会话管理</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- 会话超时 -->
            <div class="flex flex-col gap-2">
              <label for="sessionTimeout" class="text-sm font-medium text-color">会话超时时间（分钟）</label>
              <InputNumber
                id="sessionTimeout"
                v-model="permissions.sessionTimeout"
                :min="5"
                :max="1440"
                suffix=" 分钟"
                class="w-full"
              />
            </div>

            <!-- 最大登录尝试次数 -->
            <div class="flex flex-col gap-2">
              <label for="maxLoginAttempts" class="text-sm font-medium text-color">最大登录尝试次数</label>
              <InputNumber
                id="maxLoginAttempts"
                v-model="permissions.maxLoginAttempts"
                :min="1"
                :max="10"
                suffix=" 次"
                class="w-full"
              />
            </div>

            <!-- 锁定时间 -->
            <div class="flex flex-col gap-2">
              <label for="lockoutDuration" class="text-sm font-medium text-color">锁定时间（分钟）</label>
              <InputNumber
                id="lockoutDuration"
                v-model="permissions.lockoutDuration"
                :min="1"
                :max="60"
                suffix=" 分钟"
                class="w-full"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end mt-6">
      <Button
        label="保存权限设置"
        icon="pi pi-save"
        @click="savePermissions"
        :loading="saving"
        class="px-6"
      />
    </div>
  </div>
</template>
<style scoped>
.permissions-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.masonry-container {
  column-count: 1;
  column-gap: 1.5rem;
  column-fill: balance;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 1.5rem;
  display: inline-block;
  width: 100%;
}

@media (min-width: 768px) {
  .masonry-container {
    column-count: 2;
  }
}

.masonry-item :deep(.p-card) {
  height: auto;
}
</style>
