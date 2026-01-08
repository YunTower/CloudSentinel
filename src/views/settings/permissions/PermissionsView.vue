<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { PermissionSettings, AdminAccount } from '@/types/settings/permissions'
import settingsApi from '@/apis/settings/permissions'

const toast = useToast()
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

// 处理访客密码输入
const handleGuestPasswordInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // 如果用户输入了内容，且不是星号，标记为正在编辑并更新实际密码值
  if (value && value !== '••••••••') {
    isEditingPassword.value = true
    permissions.value.guestPassword = value
    guestPasswordDisplay.value = value
  } else if (value === '') {
    // 如果清空了输入框
    if (isEditingPassword.value) {
      // 如果之前正在编辑，清空所有内容
      isEditingPassword.value = false
      guestPasswordDisplay.value = ''
      permissions.value.guestPassword = ''
    } else if (permissions.value.hasPassword) {
      // 如果之前没有编辑（显示的是星号），恢复星号显示
      guestPasswordDisplay.value = '••••••••'
      permissions.value.guestPassword = '' // 清空实际密码值，表示保持现有密码
    } else {
      // 如果没有设置过密码，保持清空
      guestPasswordDisplay.value = ''
      permissions.value.guestPassword = ''
    }
  }
}

// 处理密码输入框获得焦点
const handlePasswordFocus = () => {
  // 如果显示的是星号，清空显示让用户输入
  if (guestPasswordDisplay.value === '••••••••') {
    guestPasswordDisplay.value = ''
    isEditingPassword.value = false // 重置编辑状态，等待用户实际输入
  }
}

// 处理密码输入框失去焦点
const handlePasswordBlur = () => {
  // 如果失去焦点时输入框为空且已设置过密码且没有实际输入新密码，恢复星号显示
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
  // 如果启用了密码访问，但没有设置过密码且没有提供新密码，则提示错误
  if (
    permissions.value.enablePassword &&
    !permissions.value.hasPassword &&
    !permissions.value.guestPassword
  ) {
    toast.add({ severity: 'error', summary: '保存失败', detail: '请设置访客访问密码', life: 4000 })
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

    toast.add({ severity: 'success', summary: '保存成功', detail: '权限设置已更新', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '保存失败', detail: '请稍后重试', life: 5000 })
  } finally {
    saving.value = false
  }
}

// 修改用户名
const updateUsername = async () => {
  if (!adminAccount.value.newUsername || !adminAccount.value.currentPassword) {
    toast.add({
      severity: 'warn',
      summary: '输入不完整',
      detail: '请填写新用户名和当前密码',
      life: 3000,
    })
    return
  }

  if (adminAccount.value.newUsername === adminAccount.value.username) {
    toast.add({
      severity: 'warn',
      summary: '无需修改',
      detail: '新用户名与当前用户名相同',
      life: 3000,
    })
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

    toast.add({
      severity: 'success',
      summary: '修改成功',
      detail: '用户名已更新',
      life: 3000,
    })
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) ||
      (error instanceof Error ? error.message : null) ||
      '请稍后重试'
    toast.add({
      severity: 'error',
      summary: '修改失败',
      detail: errorMessage,
      life: 5000,
    })
  } finally {
    updatingUsername.value = false
  }
}

// 修改密码
const updatePassword = async () => {
  if (
    !adminAccount.value.newPassword ||
    !adminAccount.value.confirmPassword ||
    !adminAccount.value.currentPassword
  ) {
    toast.add({
      severity: 'warn',
      summary: '输入不完整',
      detail: '请填写所有密码字段',
      life: 3000,
    })
    return
  }

  if (adminAccount.value.newPassword !== adminAccount.value.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: '密码不匹配',
      detail: '新密码与确认密码不一致',
      life: 5000,
    })
    return
  }

  if (adminAccount.value.newPassword.length < 6) {
    toast.add({
      severity: 'error',
      summary: '密码长度不足',
      detail: '新密码长度至少为6位',
      life: 5000,
    })
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

    toast.add({
      severity: 'success',
      summary: '修改成功',
      detail: '密码已更新',
      life: 3000,
    })
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) ||
      (error instanceof Error ? error.message : null) ||
      '请稍后重试'
    toast.add({
      severity: 'error',
      summary: '修改失败',
      detail: errorMessage,
      life: 5000,
    })
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
      permissions.value.guestPassword = '' // 不显示实际密码
      permissions.value.hasPassword = !!data.hasPassword // 记录是否已设置密码
      // 如果已设置密码，用星号填充显示
      guestPasswordDisplay.value = permissions.value.hasPassword ? '••••••••' : ''
      isEditingPassword.value = false // 重置编辑状态
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
      // 加载当前管理员用户名
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
        <Button
          size="small"
          class="px-6"
          label="保存设置"
          icon="pi pi-save"
          @click="savePermissions"
          :loading="saving"
        />
      </div>
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

              <div
                v-if="permissions.enablePassword"
                class="ml-4 pl-4 border-l-2 border-surface-200 dark:border-surface-700"
              >
                <div class="flex flex-col gap-2">
                  <label for="guestPassword" class="text-sm font-medium text-color">访问密码</label>
                  <Password
                    id="guestPassword"
                    v-model="guestPasswordDisplay"
                    :placeholder="
                      permissions.hasPassword ? '已设置密码，输入新密码可修改' : '请设置访问密码'
                    "
                    toggleMask
                    :feedback="false"
                    class="w-full"
                    @input="handleGuestPasswordInput"
                    @focus="handlePasswordFocus"
                    @blur="handlePasswordBlur"
                  />
                </div>
              </div>
            </div>

            <!-- 隐藏敏感信息 -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-color">隐藏服务器敏感信息</label>
                <p class="text-xs text-muted-color mt-1">
                  对游客隐藏服务器详细配置、IP地址等敏感信息
                </p>
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
            <i class="pi pi-user text-primary"></i>
            <span>管理员账户</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div>
              <Divider align="left" type="solid">
                <b>修改用户名</b>
              </Divider>
              <!-- 修改用户名区域 -->
              <div class="space-y-4">
                <!-- 当前用户名 -->
                <div class="flex flex-col gap-2">
                  <label for="currentUsername" class="text-sm font-medium text-color"
                    >当前用户名</label
                  >
                  <InputText
                    id="currentUsername"
                    :value="adminAccount.username"
                    disabled
                    class="w-full"
                  />
                </div>

                <!-- 新用户名 -->
                <div class="flex flex-col gap-2">
                  <label for="newUsername" class="text-sm font-medium text-color">新用户名</label>
                  <InputText
                    id="newUsername"
                    v-model="adminAccount.newUsername"
                    placeholder="请输入新用户名"
                    class="w-full"
                  />

                  <!-- 当前密码（用于修改用户名） -->
                  <div class="flex flex-col gap-2">
                    <label for="currentPasswordForUsername" class="text-sm font-medium text-color"
                      >当前密码</label
                    >
                    <Password
                      id="currentPasswordForUsername"
                      v-model="adminAccount.currentPassword"
                      placeholder="请输入当前密码以验证身份"
                      toggleMask
                      :feedback="false"
                      class="w-full"
                    />
                  </div>

                  <!-- 修改用户名按钮 -->
                  <div class="mt-4">
                    <Button
                      label="修改用户名"
                      icon="pi pi-user-edit"
                      @click="updateUsername"
                      :loading="updatingUsername"
                      :disabled="!adminAccount.newUsername || !adminAccount.currentPassword"
                      severity="secondary"
                      outlined
                      class="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 修改密码 -->
            <div>
              <Divider align="left" type="solid">
                <b>修改密码</b>
              </Divider>
              <div class="space-y-4">
                <!-- 当前密码（用于修改密码） -->
                <div class="flex flex-col gap-2">
                  <label for="currentPasswordForPassword" class="text-sm font-medium text-color"
                    >当前密码</label
                  >
                  <Password
                    id="currentPasswordForPassword"
                    v-model="adminAccount.currentPassword"
                    placeholder="请输入当前密码以验证身份"
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
                    placeholder="请输入新密码（至少6位）"
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
                  <label for="confirmPassword" class="text-sm font-medium text-color"
                    >确认新密码</label
                  >
                  <Password
                    id="confirmPassword"
                    v-model="adminAccount.confirmPassword"
                    placeholder="请再次输入新密码"
                    toggleMask
                    :feedback="false"
                    class="w-full"
                  />
                </div>

                <!-- 修改密码按钮 -->
                <div class="mt-4">
                  <Button
                    label="修改密码"
                    icon="pi pi-key"
                    @click="updatePassword"
                    :loading="updatingPassword"
                    :disabled="
                      !adminAccount.newPassword ||
                      !adminAccount.confirmPassword ||
                      !adminAccount.currentPassword
                    "
                    class="w-full"
                  />
                </div>
              </div>
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
              <label for="sessionTimeout" class="text-sm font-medium text-color"
                >会话超时时间（分钟）</label
              >
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
              <label for="maxLoginAttempts" class="text-sm font-medium text-color"
                >最大登录尝试次数</label
              >
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
              <label for="lockoutDuration" class="text-sm font-medium text-color"
                >异常登录锁定时间（分钟）</label
              >
              <InputNumber
                id="lockoutDuration"
                v-model="permissions.lockoutDuration"
                :min="0"
                :max="60"
                suffix=" 分钟"
                class="w-full"
              />
              <Message size="small" severity="secondary" variant="simple"
                >游客/管理员使用密码登录失败达到
                <b>{{ permissions.maxLoginAttempts }}</b> 次后锁定IP的时间</Message
              >
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
<style scoped>
.permissions-view {
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
