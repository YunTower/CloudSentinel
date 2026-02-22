<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import serversApi from '@/apis/servers'
import type { ServerGroup } from '@/types/manager/servers'
import { RiAddLine, RiCheckLine } from '@remixicon/vue'

interface Props {
  visible: boolean
  group?: ServerGroup | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const message = useMessage()
const loading = ref(false)
const formRef = ref<FormInst | null>(null)

const isVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
    if (!value) {
      resetForm()
    }
  },
})

const form = ref({
  name: '',
  description: '',
  color: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { type: 'string', min: 1, max: 32, message: '分组名称长度为 1～32 个字符', trigger: 'blur' },
  ],
  description: [
    { type: 'string', max: 200, message: '描述最多 200 个字符', trigger: 'blur' },
  ],
}

/** 颜色选择器预设 */
const colorSwatches = [
  '#22C55E', // 鲜绿
  '#3B82F6', // 亮蓝
  '#F43F5E', // 玫红
  '#F59E0B', // 琥珀
  '#8B5CF6', // 亮紫
  '#06B6D4', // 青蓝
  '#EC4899', // 粉红
  '#14B8A6', // 薄荷青
  '#6366F1', // 靛蓝
  '#F97316', // 橙
  '#84CC16', // 黄绿
  '#0EA5E9', // 天蓝
  '#A855F7', // 紫
  '#EAB308', // 明黄
  '#EF4444', // 红
]

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    color: '',
  }
  formRef.value?.restoreValidation()
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.group) {
        form.value = {
          name: props.group.name ?? '',
          description: props.group.description ?? '',
          color: props.group.color ?? '',
        }
      } else {
        resetForm()
      }
    }
  },
)

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    if (props.group) {
      await serversApi.updateGroup(props.group.id, form.value)
      message.success('分组更新成功', { duration: 3000 })
    } else {
      await serversApi.createGroup(form.value)
      message.success('分组创建成功', { duration: 3000 })
    }
    emit('success')
    emit('update:visible', false)
    resetForm()
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message ?? '操作失败'
        : '操作失败'
    message.error(errorMessage, { duration: 3000 })
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
  resetForm()
}
</script>

<template>
  <n-modal
    v-model:show="isVisible"
    :title="props.group ? '编辑分组' : '创建分组'"
    :mask-closable="false"
    class="w-[700px]!"
    preset="card"
    closable
  >
    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-placement="top"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="分组名称" path="name" required>
        <n-input
          v-model:value="form.name"
          placeholder="请输入分组名称"
          maxlength="32"
          show-count
          clearable
        />
      </n-form-item>

      <n-form-item label="分组描述" path="description">
        <n-input
          v-model:value="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入分组描述（可选）"
          maxlength="200"
          show-count
        />
      </n-form-item>

      <n-form-item label="颜色标识" path="color">
        <n-color-picker
          v-model:value="form.color"
          :modes="['hex']"
          :swatches="colorSwatches"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button secondary @click="handleCancel">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleSubmit">
          <template #icon>
            <ri-add-line v-if="!props.group" />
            <ri-check-line v-else />
          </template>
          {{ props.group ? '保存修改' : '创建分组' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>
