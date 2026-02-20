<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import type { PermissionSettings, AdminAccount } from '@/types/settings/permissions'
import settingsApi from '@/apis/settings/permissions'
import { RiSaveLine } from '@remixicon/vue'

const message = useMessage()

const permissionsFormRef = ref<FormInst | null>(null)
const usernameFormRef = ref<FormInst | null>(null)
const passwordFormRef = ref<FormInst | null>(null)

const permissions = ref<PermissionSettings>({
  allowGuest: true,
  enablePassword: false,
  guestPassword: '',
  hasPassword: false, // 是否已设置密码
  hideSensitiveInfo: true,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  jwtSecret: 'your-secret-key',
  jwtExpiration: 24,
})

const adminAccount = ref<AdminAccount>({
  username: 'admin',
  newUsername: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const saving = ref(false)
const updatingUsername = ref(false)
const updatingPassword = ref(false)

// 访客密码显示值
const guestPasswordDisplay = ref('')
// 标记用户是否正在编辑密码
const isEditingPassword = ref(false)

const permissionRules: FormRules = {
  guestPassword: [
    {
      validator: (_rule, value: string) => {
        if (permissions.value.enablePassword && !permissions.value.hasPassword && !value?.trim()) {
          return new Error('请设置访客访问密码')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  sessionTimeout: [
    { required: true, type: 'number', message: '请输入会话超时时间', trigger: 'blur' },
    { type: 'number', min: 5, max: 1440, message: '范围 5-1440 分钟', trigger: ['blur', 'input'] },
  ],
  maxLoginAttempts: [
    { required: true, type: 'number', message: '请输入最大登录尝试次数', trigger: 'blur' },
    { type: 'number', min: 1, max: 10, message: '范围 1-10 次', trigger: ['blur', 'input'] },
  ],
  lockoutDuration: [
    { required: true, type: 'number', message: '请输入锁定时间', trigger: 'blur' },
    { type: 'number', min: 0, max: 60, message: '范围 0-60 分钟', trigger: ['blur', 'input'] },
  ],
}

const usernameRules: FormRules = {
  newUsername: [
    { required: true, message: '请输入新用户名', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        if (value && value === adminAccount.value.username) {
          return new Error('新用户名不能与当前用户名相同')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
  currentPassword: [{ required: true, message: '请输入当前密码以验证身份', trigger: 'blur' }],
}

const passwordRules: FormRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: ['blur', 'input'] },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string) => {
        if (value !== adminAccount.value.newPassword) {
          return new Error('两次输入的密码不一致')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

// 处理访客密码输入
const handleGuestPasswordInput = (value: string) => {
  if (value && value !== '••••••••') {
    isEditingPassword.value = true
    permissions.value.guestPassword = value
    guestPasswordDisplay.value = value
  } else if (value === '') {
    if (isEditingPassword.value) {
      isEditingPassword.value = false
      guestPasswordDisplay.value = ''
      permissions.value.guestPassword = ''
    } else if (permissions.value.hasPassword) {
      guestPasswordDisplay.value = '••••••••'
      permissions.value.guestPassword = ''
    } else {
      guestPasswordDisplay.value = ''
      permissions.value.guestPassword = ''
    }
  }
}

// 处理密码输入框获得焦点
const handlePasswordFocus = () => {
  if (guestPasswordDisplay.value === '••••••••') {
    guestPasswordDisplay.value = ''
    isEditingPassword.value = false
  }
}

// 处理密码输入框失去焦点
const handlePasswordBlur = () => {
  if (
    guestPasswordDisplay.value === '' &&
    permissions.value.hasPassword &&
    !permissions.value.guestPassword
  ) {
    guestPasswordDisplay.value = '••••••••'
    isEditingPassword.value = false
  }
}

// 保存权限设置
const savePermissions = async () => {
  try {
    await permissionsFormRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    await settingsApi.savePermissionsSettings({
      allowGuest: permissions.value.allowGuest,
      enablePassword: permissions.value.enablePassword,
      guestPassword: permissions.value.guestPassword,
      hideSensitiveInfo: permissions.value.hideSensitiveInfo,
      sessionTimeout: permissions.value.sessionTimeout,
      maxLoginAttempts: permissions.value.maxLoginAttempts,
      lockoutDuration: permissions.value.lockoutDuration,
      jwtSecret: permissions.value.jwtSecret,
      jwtExpiration: permissions.value.jwtExpiration,
    })

    message.success('权限设置已更新', { duration: 3000 })
  } catch {
    message.error('请稍后重试', { duration: 5000 })
  } finally {
    saving.value = false
  }
}

// 修改用户名
const updateUsername = async () => {
  try {
    await usernameFormRef.value?.validate()
  } catch {
    return
  }
  updatingUsername.value = true
  try {
    await settingsApi.savePermissionsSettings({
      allowGuest: permissions.value.allowGuest,
      enablePassword: permissions.value.enablePassword,
      guestPassword: permissions.value.guestPassword,
      hideSensitiveInfo: permissions.value.hideSensitiveInfo,
      sessionTimeout: permissions.value.sessionTimeout,
      maxLoginAttempts: permissions.value.maxLoginAttempts,
      lockoutDuration: permissions.value.lockoutDuration,
      jwtSecret: permissions.value.jwtSecret,
      jwtExpiration: permissions.value.jwtExpiration,
      newUsername: adminAccount.value.newUsername,
      currentPassword: adminAccount.value.currentPassword,
    })
    adminAccount.value.username = adminAccount.value.newUsername
    adminAccount.value.newUsername = ''
    adminAccount.value.currentPassword = ''

    message.success('用户名已更新', { duration: 3000 })
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) ||
      (error instanceof Error ? error.message : null) ||
      '请稍后重试'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    updatingUsername.value = false
  }
}

// 修改密码
const updatePassword = async () => {
  try {
    await passwordFormRef.value?.validate()
  } catch {
    return
  }
  updatingPassword.value = true
  try {
    await settingsApi.savePermissionsSettings({
      allowGuest: permissions.value.allowGuest,
      enablePassword: permissions.value.enablePassword,
      guestPassword: permissions.value.guestPassword,
      hideSensitiveInfo: permissions.value.hideSensitiveInfo,
      sessionTimeout: permissions.value.sessionTimeout,
      maxLoginAttempts: permissions.value.maxLoginAttempts,
      lockoutDuration: permissions.value.lockoutDuration,
      jwtSecret: permissions.value.jwtSecret,
      jwtExpiration: permissions.value.jwtExpiration,
      newPassword: adminAccount.value.newPassword,
      confirmPassword: adminAccount.value.confirmPassword,
      currentPassword: adminAccount.value.currentPassword,
    })
    adminAccount.value.currentPassword = ''
    adminAccount.value.newPassword = ''
    adminAccount.value.confirmPassword = ''

    message.success('密码已更新', { duration: 3000 })
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) ||
      (error instanceof Error ? error.message : null) ||
      '请稍后重试'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    updatingPassword.value = false
  }
}

// 加载权限设置
const loadPermissions = async () => {
  try {
    const res = await settingsApi.getPermissionsSettings()
    const data = res?.data
    if (data) {
      permissions.value.allowGuest = !!data.allowGuest
      permissions.value.enablePassword = !!data.enablePassword
      permissions.value.guestPassword = ''
      permissions.value.hasPassword = !!data.hasPassword
      guestPasswordDisplay.value = permissions.value.hasPassword ? '••••••••' : ''
      isEditingPassword.value = false
      permissions.value.hideSensitiveInfo = !!data.hideSensitiveInfo
      permissions.value.sessionTimeout =
        Number(data.sessionTimeout) || permissions.value.sessionTimeout
      permissions.value.maxLoginAttempts =
        Number(data.maxLoginAttempts) || permissions.value.maxLoginAttempts
      permissions.value.lockoutDuration =
        Number(data.lockoutDuration) || permissions.value.lockoutDuration
      permissions.value.jwtSecret = String(data.jwtSecret || '')
      permissions.value.jwtExpiration =
        Number(data.jwtExpiration) || permissions.value.jwtExpiration
      if (data.adminUsername) {
        adminAccount.value.username = data.adminUsername
      }
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
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-color mb-2">权限设置</h1>
        <p class="text-muted-color">管理访问权限、用户认证和安全设置</p>
      </div>
      <div>
        <n-button type="primary" @click="savePermissions" :loading="saving">
          <template #icon>
            <ri-save-line />
          </template>
          保存设置
        </n-button>
      </div>
    </div>

    <n-form
      ref="permissionsFormRef"
      :model="permissions"
      :rules="permissionRules"
      label-placement="top"
      class="masonry-container"
    >
      <!-- 访问控制 -->
      <n-card class="masonry-item">
        <template #header>
          <div class="flex items-center gap-2">
            <span>访问控制</span>
          </div>
        </template>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-color">允许游客访问</label>
              <p class="text-xs text-muted-color mt-1">开启后，未登录用户可以访问监控面板</p>
            </div>
            <n-switch v-model:value="permissions.allowGuest" />
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-color">启用访问密码</label>
                <p class="text-xs text-muted-color mt-1">设置后，游客需要输入密码才能访问</p>
              </div>
              <n-switch v-model:value="permissions.enablePassword" />
            </div>
            <n-form-item
              v-if="permissions.enablePassword"
              path="guestPassword"
              label="访问密码"
              class="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
            >
              <n-input
                :value="guestPasswordDisplay"
                type="password"
                show-password-on="click"
                :placeholder="
                  permissions.hasPassword ? '已设置密码，输入新密码可修改' : '请设置访问密码'
                "
                class="w-full"
                @update:value="handleGuestPasswordInput"
                @focus="handlePasswordFocus"
                @blur="handlePasswordBlur"
              />
            </n-form-item>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-color">隐藏服务器敏感信息</label>
              <p class="text-xs text-muted-color mt-1">
                对游客隐藏服务器详细配置、IP地址等敏感信息
              </p>
            </div>
            <n-switch v-model:value="permissions.hideSensitiveInfo" />
          </div>
        </div>
      </n-card>

      <!-- 管理员账户 -->
      <n-card class="masonry-item">
        <template #header>
          <div class="flex items-center gap-2">
            <span>管理员账户</span>
          </div>
        </template>
        <div class="space-y-4">
          <div>
            <n-divider title-placement="left">修改用户名</n-divider>
            <n-form
              ref="usernameFormRef"
              :model="adminAccount"
              :rules="usernameRules"
              label-placement="top"
            >
              <n-form-item label="当前用户名" path="username">
                <n-input :value="adminAccount.username" disabled class="w-full" />
              </n-form-item>
              <n-form-item label="新用户名" path="newUsername" required>
                <n-input
                  v-model:value="adminAccount.newUsername"
                  placeholder="请输入新用户名"
                  class="w-full"
                />
              </n-form-item>
              <n-form-item label="当前密码" path="currentPassword" required>
                <n-input
                  v-model:value="adminAccount.currentPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入当前密码以验证身份"
                  class="w-full"
                />
              </n-form-item>
              <div class="w-full flex justify-end mt-4">
                <n-button
                  class="w-full"
                  type="primary"
                  :loading="updatingUsername"
                  @click="updateUsername"
                >
                  修改用户名
                </n-button>
              </div>
            </n-form>
          </div>

          <div>
            <n-divider title-placement="left">修改密码</n-divider>
            <n-form
              ref="passwordFormRef"
              :model="adminAccount"
              :rules="passwordRules"
              label-placement="top"
            >
              <n-form-item label="当前密码" path="currentPassword" required>
                <n-input
                  v-model:value="adminAccount.currentPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入当前密码以验证身份"
                  class="w-full"
                />
              </n-form-item>
              <n-form-item label="新密码" path="newPassword" required>
                <n-input
                  v-model:value="adminAccount.newPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入新密码（至少6位）"
                  class="w-full"
                />
              </n-form-item>
              <n-form-item label="确认新密码" path="confirmPassword" required>
                <n-input
                  v-model:value="adminAccount.confirmPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请再次输入新密码"
                  class="w-full"
                />
              </n-form-item>
              <div class="w-full flex justify-end mt-4">
                <n-button
                  type="primary"
                  class="w-full"
                  :loading="updatingPassword"
                  @click="updatePassword"
                >
                  修改密码
                </n-button>
              </div>
            </n-form>
          </div>
        </div>
      </n-card>

      <!-- 会话管理 -->
      <n-card class="masonry-item">
        <template #header>
          <div class="flex items-center gap-2">
            <i class="ri-time-line text-primary"></i>
            <span>会话管理</span>
          </div>
        </template>
        <div class="space-y-4">
          <n-form-item label="会话超时时间" path="sessionTimeout" required>
            <n-input-number
              v-model:value="permissions.sessionTimeout"
              :min="5"
              :max="1440"
              :show-button="false"
              class="w-full"
            >
              <template #suffix> 分钟 </template>
            </n-input-number>
          </n-form-item>
          <n-form-item label="最大登录尝试次数" path="maxLoginAttempts" required>
            <n-input-number
              v-model:value="permissions.maxLoginAttempts"
              :min="1"
              :max="10"
              :show-button="false"
              class="w-full"
            >
              <template #suffix> 次 </template>
            </n-input-number>
          </n-form-item>
          <n-form-item label="异常登录锁定时间" path="lockoutDuration" required>
            <div class="w-full flex flex-col">
              <n-input-number
                v-model:value="permissions.lockoutDuration"
                :min="0"
                :max="60"
                :show-button="false"
                class="w-full"
              >
                <template #suffix> 分钟 </template>
              </n-input-number>
              <n-alert type="default" :show-icon="false" class="mt-2">
                游客/管理员使用密码登录失败达到
                <b>{{ permissions.maxLoginAttempts }}</b> 次后锁定IP的时间
              </n-alert>
            </div>
          </n-form-item>
        </div>
      </n-card>
    </n-form>
  </div>
</template>
<style scoped>
.permissions-view {
  margin: 0 auto;
}

.masonry-container {
  column-count: 1;
  column-gap: 0.5rem;
  column-fill: balance;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 0.5rem;
  display: inline-block;
  width: 100%;
}

@media (min-width: 768px) {
  .masonry-container {
    column-count: 2;
  }
}
</style>
