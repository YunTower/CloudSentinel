<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { useMessage, useDialog, NButton, NTag } from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'
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

// 表格列定义
const columns = computed<DataTableColumn<ServerGroup>[]>(() => [
  {
    key: 'name',
    title: '分组名称',
    minWidth: 160,
    render: (row: ServerGroup) =>
      h('div', { class: 'flex items-center gap-2' }, [
        row.color
          ? h('span', {
              class: 'w-3 h-3 rounded-full flex-shrink-0',
              style: { backgroundColor: row.color },
            })
          : null,
        h('span', { class: 'font-medium' }, row.name),
      ]),
  },
  {
    key: 'description',
    title: '描述',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: (row: ServerGroup) => row.description || '-',
  },
  {
    key: 'serverCount',
    title: '服务器数量',
    width: 120,
    render: (row: ServerGroup) =>
      h(NTag, { type: 'info', size: 'small' }, () =>
        String(groupServerCounts.value[row.id] ?? 0),
      ),
  },
  {
    key: 'actions',
    title: '操作',
    width: 120,
    render: (row: ServerGroup) =>
      h('div', { class: 'flex gap-2' }, [
        h(
          NButton,
          {
            text: true,
            size: 'small',
            onClick: () => handleEdit(row),
          },
          { default: () => h(RiEditLine, { size: '14px' }) },
        ),
        h(
          NButton,
          {
            text: true,
            size: 'small',
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => h(RiDeleteBinLine, { size: '14px' }) },
        ),
      ]),
  },
])

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
    <n-data-table
      :columns="columns"
      :data="groups"
      :loading="loading"
      :row-key="(row: ServerGroup) => row.id"
      size="small"
      class="w-full"
    >
      <template #empty>
        <n-empty description="暂无分组" class="py-8" />
      </template>
    </n-data-table>

    <template #footer>
      <div class="flex justify-end">
        <n-button secondary @click="emit('update:visible', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>
