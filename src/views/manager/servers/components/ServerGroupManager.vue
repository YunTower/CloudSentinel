<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import serversApi from '@/apis/servers'
import type { ServerGroup, Server } from '@/types/manager/servers'
import { RiDeleteBinLine, RiEditLine } from '@remixicon/vue'

interface Props {
  visible: boolean
  servers?: Server[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'refresh'): void
  (e: 'edit-group', group: ServerGroup): void
}

const props = withDefaults(defineProps<Props>(), {
  servers: () => [],
})

const emit = defineEmits<Emits>()

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const groups = ref<ServerGroup[]>([])

// 处理 visible 的双向绑定
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

// 计算每个分组的服务器数量
const groupServerCounts = computed(() => {
  const counts: Record<number, number> = {}
  props.servers.forEach((server) => {
    if (server.group_id) {
      counts[server.group_id] = (counts[server.group_id] || 0) + 1
    }
  })
  return counts
})

// 加载分组列表
const loadGroups = async () => {
  loading.value = true
  try {
    const response = await serversApi.getGroups()
    if (response.status && response.data) {
      groups.value = response.data || []
    }
  } catch (error) {
    console.error('加载分组列表失败:', error)
    message.error('无法加载分组列表', { duration: 3000 })
  } finally {
    loading.value = false
  }
}

// 删除分组
const handleDelete = (group: ServerGroup) => {
  const serverCount = groupServerCounts.value[group.id] || 0
  const confirmContent =
    serverCount > 0
      ? `确定要删除分组 "${group.name}" 吗？该分组下有 ${serverCount} 台服务器，删除后这些服务器将变为未分组状态。`
      : `确定要删除分组 "${group.name}" 吗？`

  dialog.warning({
    title: '删除确认',
    content: confirmContent,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const response = await serversApi.deleteGroup(group.id)
        if (response.status) {
          message.success(`分组 "${group.name}" 已删除`, { duration: 3000 })
          await loadGroups()
          emit('refresh')
        } else {
          throw new Error(response.message || '删除失败')
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '删除失败'
        message.error(errorMessage, { duration: 3000 })
      }
    },
  })
}

// 编辑分组
const handleEdit = (group: ServerGroup) => {
  emit('edit-group', group)
}

onMounted(() => {
  if (props.visible) {
    loadGroups()
  }
})

// 监听 visible 变化，重新加载数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadGroups()
    }
  },
)
</script>

<template>
  <n-modal
    v-model:show="isVisible"
    title="分组管理"
    :mask-closable="false"
    class="w-[700px]!"
    preset="card"
  >
    <div v-if="loading" class="flex items-center justify-center py-12">
      <n-spin size="large" />
    </div>

    <div v-else>
      <div v-if="groups.length === 0" class="py-12">
        <n-empty description="暂无分组" />
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-200 dark:border-surface-700">
            <th class="text-left py-2 px-3 font-medium">分组名称</th>
            <th class="text-left py-2 px-3 font-medium">描述</th>
            <th class="text-left py-2 px-3 font-medium">服务器数量</th>
            <th class="text-left py-2 px-3 font-medium" style="width: 150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in groups"
            :key="group.id"
            class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800"
          >
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <span
                  v-if="group.color"
                  class="w-3 h-3 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: group.color }"
                />
                <span class="font-medium">{{ group.name }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-muted-color">{{ group.description || '-' }}</td>
            <td class="py-2 px-3">
              <n-tag type="info">{{ groupServerCounts[group.id] || 0 }}</n-tag>
            </td>
            <td class="py-2 px-3">
              <div class="flex gap-2">
                <n-button text size="small" @click="handleEdit(group)">
                  <template #icon>
                    <ri-edit-line />
                  </template>
                </n-button>
                <n-button text size="small" type="error" @click="handleDelete(group)">
                  <template #icon>
                    <ri-delete-bin-line />
                  </template>
                </n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <n-button secondary @click="emit('update:visible', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>
