<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import serversApi from '@/apis/servers'
import type { ServerGroup, Server } from '@/types/manager/servers'

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

const toast = useToast()
const confirm = useConfirm()
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
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载分组列表',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

// 删除分组
const handleDelete = (group: ServerGroup) => {
  const serverCount = groupServerCounts.value[group.id] || 0
  const message =
    serverCount > 0
      ? `确定要删除分组 "${group.name}" 吗？该分组下有 ${serverCount} 台服务器，删除后这些服务器将变为未分组状态。`
      : `确定要删除分组 "${group.name}" 吗？`

  confirm.require({
    message,
    header: '删除确认',
    rejectProps: {
      label: '取消',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: '删除',
      severity: 'danger',
    },
    accept: async () => {
      try {
        const response = await serversApi.deleteGroup(group.id)
        if (response.status) {
          toast.add({
            severity: 'success',
            summary: '删除成功',
            detail: `分组 "${group.name}" 已删除`,
            life: 3000,
          })
          await loadGroups()
          emit('refresh')
        } else {
          throw new Error(response.message || '删除失败')
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '删除失败'
        toast.add({
          severity: 'error',
          summary: '删除失败',
          detail: errorMessage,
          life: 3000,
        })
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
  <Dialog
    v-model:visible="isVisible"
    header="分组管理"
    :modal="true"
    :style="{ width: '800px' }"
    :draggable="false"
    :block-scroll="false"
  >
    <div v-if="loading" class="flex items-center justify-center py-12">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
    </div>

    <div v-else>
      <div v-if="groups.length === 0" class="text-center py-12 text-muted-color">
        <i class="pi pi-folder mb-4 opacity-50 text-[2rem]!"></i>
        <p>暂无分组，请先创建分组</p>
      </div>

      <DataTable
        v-else
        :value="groups"
        :paginator="groups.length > 10"
        :rows="10"
        :rows-per-page-options="[10, 20, 50]"
        striped-rows
        class="p-datatable-sm"
      >
        <Column field="name" header="分组名称" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span
                v-if="data.color"
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: data.color }"
              />
              <span class="font-medium">{{ data.name }}</span>
            </div>
          </template>
        </Column>

        <Column field="description" header="描述">
          <template #body="{ data }">
            <span class="text-muted-color">{{ data.description || '-' }}</span>
          </template>
        </Column>

        <Column header="服务器数量" sortable>
          <template #body="{ data }">
            <Tag :value="groupServerCounts[data.id] || 0" severity="info" />
          </template>
        </Column>

        <Column header="操作" :exportable="false" style="width: 150px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button
                icon="pi pi-pen-to-square"
                text
                size="small"
                v-tooltip.top="'编辑'"
                @click="handleEdit(data)"
              />
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                size="small"
                v-tooltip.top="'删除'"
                @click="handleDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <template #footer>
      <Button label="关闭" severity="secondary" @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

