<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import serversApi from '@/apis/servers'
import type { ServerGroup } from '@/types/manager/servers'
import { RiAddLine } from '@remixicon/vue'

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

const isVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
    if (!value) {
      resetForm()
    }
  },
})

const dialogHeader = computed(() => {
  return props.group ? '编辑分组' : '创建分组'
})

const form = ref({
  name: '',
  description: '',
  color: '',
})

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    color: '',
  }
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.group) {
        form.value = {
          name: props.group.name || '',
          description: props.group.description || '',
          color: props.group.color || '',
        }
      } else {
        resetForm()
      }
    }
  },
)

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    message.warning('分组名称不能为空', { duration: 3000 })
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
        ? (error.response as { data?: { message?: string } })?.data?.message || '操作失败'
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
  <n-modal v-model:show="isVisible" :mask-closable="false">
    <n-card :title="dialogHeader" style="width: 500px">
      <form @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-4">
          <div>
            <label for="name" class="block text-sm font-medium mb-2">分组名称 *</label>
            <n-input
              id="name"
              v-model:value="form.name"
              class="w-full"
              placeholder="请输入分组名称"
            />
          </div>

          <div>
            <label for="description" class="block text-sm font-medium mb-2">分组描述</label>
            <n-input
              id="description"
              v-model:value="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入分组描述（可选）"
            />
          </div>

          <div>
            <label for="color" class="block text-sm font-medium mb-2">颜色标识</label>
            <n-input
              id="color"
              v-model:value="form.color"
              class="w-full"
              placeholder="例如：#FF5733（可选）"
            />
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button secondary @click="handleCancel">取消</n-button>
          <n-button type="primary" :loading="loading" @click="handleSubmit">
            <template #icon>
              <ri-add-line />
            </template>
            {{ props.group ? '保存修改' : '创建分组' }}
          </n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>
