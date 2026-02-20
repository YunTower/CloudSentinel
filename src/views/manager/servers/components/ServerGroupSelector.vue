<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { h } from 'vue'
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
    if (response.status && response.data) {
      groups.value = response.data || []
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

// 构建 n-select options，带颜色点渲染
const groupOptions = computed(() =>
  groups.value.map((group) => ({
    label: group.name,
    value: group.id,
    color: group.color,
  })),
)

const renderLabel = (option: { label: string; value: number; color?: string }) => {
  return h('div', { class: 'flex items-center gap-2' }, [
    option.color
      ? h('span', {
          class: 'w-3 h-3 rounded-full flex-shrink-0',
          style: { backgroundColor: option.color },
        })
      : null,
    h('span', option.label),
  ])
}
</script>

<template>
  <n-select
    :value="modelValue"
    :options="groupOptions"
    :placeholder="props.placeholder"
    :loading="loading"
    :render-label="renderLabel"
    class="w-full"
    @update:value="handleChange"
  />
</template>
