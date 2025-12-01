<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import serversApi from '@/apis/servers'
import type { ServerGroup } from '@/types/manager/servers'

interface Props {
  modelValue?: number | null
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: number | null): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择分组',
})

const emit = defineEmits<Emits>()

const groups = ref<ServerGroup[]>([])
const loading = ref(false)

const loadGroups = async () => {
  loading.value = true
  try {
    const response = await serversApi.getGroups()
    if (response.data.status) {
      groups.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载分组列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadGroups()
})

const handleChange = (value: number | null) => {
  emit('update:modelValue', value)
}

// 暴露刷新方法
defineExpose({
  refresh: loadGroups,
})
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="groups"
    option-label="name"
    option-value="id"
    :placeholder="placeholder"
    :loading="loading"
    class="w-full"
    @update:model-value="handleChange"
  >
    <template #option="slotProps">
      <div class="flex items-center gap-2">
        <span
          v-if="slotProps.option.color"
          class="w-3 h-3 rounded-full"
          :style="{ backgroundColor: slotProps.option.color }"
        />
        <span>{{ slotProps.option.name }}</span>
      </div>
    </template>
  </Select>
</template>

