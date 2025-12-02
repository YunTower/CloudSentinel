<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import serversApi from '@/apis/servers'
import type { ServerGroup } from '@/types/manager/servers'

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

const toast = useToast()
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
    toast.add({ severity: 'warn', summary: '验证失败', detail: '分组名称不能为空', life: 3000 })
    return
  }

  loading.value = true
  try {
    if (props.group) {
      await serversApi.updateGroup(props.group.id, form.value)
      toast.add({ severity: 'success', summary: '成功', detail: '分组更新成功', life: 3000 })
    } else {
      await serversApi.createGroup(form.value)
      toast.add({ severity: 'success', summary: '成功', detail: '分组创建成功', life: 3000 })
    }
    emit('success')
    emit('update:visible', false)
    resetForm()
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message || '操作失败'
        : '操作失败'
    toast.add({
      severity: 'error',
      summary: '失败',
      detail: errorMessage,
      life: 3000,
    })
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
  <Dialog
    v-model:visible="isVisible"
    :header="dialogHeader"
    :modal="true"
    :style="{ width: '500px' }"
    :draggable="false"
    :block-scroll="false"
  >
    <form @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-4">
        <div>
          <label for="name" class="block text-sm font-medium mb-2">分组名称 *</label>
          <InputText id="name" v-model="form.name" class="w-full" placeholder="请输入分组名称" />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium mb-2">分组描述</label>
          <Textarea
            id="description"
            v-model="form.description"
            class="w-full"
            rows="3"
            placeholder="请输入分组描述（可选）"
          />
        </div>

        <div>
          <label for="color" class="block text-sm font-medium mb-2">颜色标识</label>
          <InputText
            id="color"
            v-model="form.color"
            class="w-full"
            placeholder="例如：#FF5733（可选）"
          />
        </div>
      </div>
    </form>

    <template #footer>
      <Button label="取消" severity="secondary" @click="handleCancel" />
      <Button label="确定" :loading="loading" @click="handleSubmit" />
    </template>
  </Dialog>
</template>
