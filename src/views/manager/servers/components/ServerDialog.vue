<script setup lang="ts">
import { computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { Server, ServerForm } from '@/types/manager/servers'

interface Props {
  visible: boolean
  editingServer?: Server | null
  saving?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'save': [form: ServerForm]
  'cancel': []
}>()

const toast = useToast()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditing = computed(() => !!props.editingServer)

const form = defineModel<ServerForm>('form', {
  default: () => ({
    name: '',
    ip: '',
    port: 22,
    status: 'online' as const,
    location: '',
    os: '',
    architecture: '',
    kernel: '',
    hostname: '',
  })
})

const linuxCommand = computed(() => {
  return `curl -fsSL https://install.example.com/agent.sh | bash -s -- --server=${form.value.ip} --token=YOUR_TOKEN`
})

// 监听编辑服务器变化，更新表单
watch(
  () => props.editingServer,
  (server) => {
    if (server) {
      form.value = {
        name: server.name,
        ip: server.ip,
        port: server.port,
        status: server.status,
        location: server.location,
        os: server.os,
        architecture: server.architecture || '',
        kernel: server.kernel || '',
        hostname: server.hostname || '',
      }
    }
  },
  { immediate: true }
)

const handleSave = () => {
  if (!form.value.name || !form.value.ip) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '请填写必填字段',
      life: 3000,
    })
    return
  }

  emit('save', form.value)
}

const handleCancel = () => {
  emit('cancel')
}

const copyCommand = async () => {
  try {
    await navigator.clipboard.writeText(linuxCommand.value)
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: '命令已复制到剪贴板',
      life: 2000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制命令',
      life: 3000,
    })
  }
}
</script>
<template>
  <Dialog
    v-model:visible="isVisible"
    :header="isEditing ? '编辑服务器' : '添加服务器'"
    modal
    class="w-3xl"
    :pt="{
      root: 'rounded-xl border-0 shadow-2xl',
      header: 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-b border-primary-200 dark:border-primary-700 rounded-t-xl',
      content: 'p-0',
      footer: 'bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 rounded-b-xl'
    }"
  >
    <div class="p-6">
      <form @submit.prevent="handleSave" class="space-y-6">
        <!-- 基本信息 -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <i class="pi pi-server text-primary text-lg"></i>
            </div>
            <h3 class="text-lg font-semibold text-color">基本信息</h3>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-3">
              <label class="text-sm font-medium text-color flex items-center gap-2">
                <i class="pi pi-tag text-primary text-xs"></i>
                服务器名称
                <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="form.name"
                placeholder="输入服务器名称"
                required
                class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div class="space-y-3">
              <label class="text-sm font-medium text-color flex items-center gap-2">
                <i class="pi pi-globe text-primary text-xs"></i>
                IP地址
                <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="form.ip"
                placeholder="192.168.1.100"
                required
                class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div class="space-y-3">
              <label class="text-sm font-medium text-color flex items-center gap-2">
                <i class="pi pi-map-marker text-primary text-xs"></i>
                位置
              </label>
              <InputText
                v-model="form.location"
                placeholder="中国/北京"
                class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div class="space-y-3">
              <label class="text-sm font-medium text-color flex items-center gap-2">
                <i class="pi pi-desktop text-primary text-xs"></i>
                操作系统
              </label>
              <InputText
                v-model="form.os"
                placeholder="Ubuntu 22.04"
                class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <!-- 安装指令 -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <i class="pi pi-desktop text-lg"></i>
            </div>
            <h3 class="text-lg font-semibold text-color">安装被控探针</h3>
          </div>

          <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-color">Linux 安装命令</span>
                <Button
                  icon="pi pi-copy"
                  text
                  size="small"
                  @click="copyCommand"
                  v-tooltip.top="'复制命令'"
                />
              </div>
              <div class="bg-surface-900 dark:bg-surface-100 text-green-400 dark:text-green-600 p-3 rounded font-mono text-sm overflow-x-auto">
                {{ linuxCommand }}
              </div>
            </div>

            <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div class="flex items-start gap-2">
                <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-0.5"></i>
                <div class="text-sm text-blue-700 dark:text-blue-300">
                  <p class="font-medium mb-1">安装说明</p>
                  <p class="text-xs text-blue-600 dark:text-blue-400">
                    1. 在目标Linux服务器上执行安装命令<br>
                    2. 安装完成后，探针会自动连接到控制中心<br>
                    3. 系统信息将自动获取，无需手动填写
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>

    <template #footer>
      <div class="flex justify-between items-center p-6">
        <div class="flex gap-3">
          <Button
            label="取消"
            text
            @click="handleCancel"
            class="px-6 py-2"
          />
          <Button
            :label="isEditing ? '更新服务器' : '添加服务器'"
            :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
            @click="handleSave"
            :loading="props.saving"
            class="px-6 py-2 font-medium"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>
