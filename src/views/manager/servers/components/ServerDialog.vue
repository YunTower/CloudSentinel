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
  save: [form: ServerForm]
  cancel: []
}>()

const toast = useToast()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
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
  }),
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
  { immediate: true },
)

const handleSave = () => {
  // 验证必填字段
  if (!form.value.name || !form.value.ip) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '请填写服务器名称和IP地址',
      life: 3000,
    })
    return
  }

  // 验证IP格式（简单验证）
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  if (!ipPattern.test(form.value.ip)) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '请输入有效的IP地址',
      life: 3000,
    })
    return
  }

  // 验证通信端口范围
  if (form.value.port && (form.value.port < 1 || form.value.port > 65535)) {
    toast.add({
      severity: 'error',
      summary: '验证失败',
      detail: '通信端口号必须在1-65535之间',
      life: 3000,
    })
    return
  }

  emit('save', form.value)
}

const handleCancel = () => {
  emit('cancel')
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
      header:
        'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-b border-primary-200 dark:border-primary-700 rounded-t-xl',
      content: 'p-0',
      footer:
        'bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 rounded-b-xl',
    }"
  >
    <div class="p-6">
      <form @submit.prevent="handleSave" class="space-y-6">
        <!-- 基本信息 -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
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
                <i class="pi pi-sitemap text-primary text-xs"></i>
                通信端口
                <span class="text-red-500">*</span>
              </label>
              <InputNumber
                v-model="form.port"
                placeholder="22"
                :min="1"
                :max="65535"
                :use-grouping="false"
                class="w-full"
              />
            </div>

            <div class="space-y-3">
              <label class="text-sm font-medium text-color flex items-center gap-2">
                <i class="pi pi-map-marker text-primary text-xs"></i>
                地域
              </label>
              <InputText
                v-model="form.location"
                placeholder="留空则自动获取"
                class="w-full border-surface-300 dark:border-surface-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </form>
    </div>

    <template #footer>
      <div class="flex justify-between items-center p-6">
        <div class="flex gap-3">
          <Button label="取消" text @click="handleCancel" class="px-6 py-2" />
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
