<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton, NEmpty, NSpace, type PaginationInfo, type DataTableColumn } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import { useAuthStore } from '@/admin/stores/auth.ts'
import type { Server } from '@/shared/types/manager/servers'
import serversApi from '@/admin/apis/servers.ts'
import { formatUptimeSeconds, liveUptimeSeconds } from '@/shared/server-display/uptime'
import { isServerDataStale } from '@/shared/server-display/utils'
import { useUptimeTicker } from '@/shared/composables/useUptimeTicker'
import {
  getBillingCycle,
  getBillingType,
  getExpireCountdown,
  getTrafficLimitSummary,
} from '@/shared/utils/billing.ts'
import {
  getStatusText,
  getStatusSeverity,
  hasAgentUpdate,
  getVersionTypeConfig,
  parseVersion,
} from '@/shared/utils/version.ts'
import type { VersionType } from '@/shared/utils/version.ts'
import {
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiEyeLine,
} from '@remixicon/vue'

// Map PrimeVue severity to Naive UI NTag type
const severityToNaiveType = (
  severity: string,
): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  const map: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    success: 'success',
    danger: 'error',
    secondary: 'default',
    warning: 'warning',
    warn: 'warning',
    info: 'info',
  }
  return map[severity] ?? 'default'
}

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.role === 'admin')
const message = useMessage()
const dialog = useDialog()

const router = useRouter()

const now = useUptimeTicker()
const uptimeText = (row: Server) => {
  const seconds = liveUptimeSeconds(row.uptimeSeconds, row.uptimeSyncedAt, now.value)
  if (seconds !== undefined) return formatUptimeSeconds(seconds)
  return row.uptime || '-'
}

interface Props {
  servers: Server[]
  loading?: boolean
  deletingServerId?: string
  latestAgentVersion?: string
  latestAgentVersionType?: VersionType
  selectedServers?: Server[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'view-install-info': [server: Server]
  'delete-server': [server: Server]
  'edit-server': [server: Server]
  'update-agent': [server: Server]
  'selection-change': [servers: Server[]]
}>()

// 版本更新相关
const showUpdateDialog = ref(false)
const selectedServerForUpdate = ref<Server | null>(null)
const updatingAgentId = ref<string>('')

// 检查是否需要更新
const needsUpdate = (server: Server): boolean => {
  if (!props.latestAgentVersion || !server.agent_version) return false
  return hasAgentUpdate(
    server.agent_version,
    props.latestAgentVersion,
    props.latestAgentVersionType,
  )
}

// 显示更新对话框
const showUpdateAgentDialog = (server: Server) => {
  selectedServerForUpdate.value = server
  showUpdateDialog.value = true
}

// 确认更新
const confirmUpdateAgent = async () => {
  if (!selectedServerForUpdate.value) return

  const server = selectedServerForUpdate.value
  updatingAgentId.value = server.id

  try {
    await serversApi.updateAgent(server.id)
    message.success('更新命令已发送，Agent 将自动更新', { duration: 3000 })
    showUpdateDialog.value = false
    selectedServerForUpdate.value = null
    emit('update-agent', server)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '更新失败'
    message.error(errorMessage, { duration: 5000 })
  } finally {
    updatingAgentId.value = ''
  }
}

const checkedRowKeys = ref<string[]>([])

// 处理选中行变化
const handleCheckedRowsChange = (keys: string[], rows: Server[]) => {
  checkedRowKeys.value = keys
  emit('selection-change', rows)
}

const goToDetail = (server: Server) => {
  router.push(`/servers/${server.id}`)
}

// 确认删除
const confirmDelete = (_event: MouseEvent, server: Server) => {
  dialog.warning({
    title: '删除确认',
    content: `确定要删除服务器 "${server.name}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      emit('delete-server', server)
    },
  })
}

// 列定义
const columns = computed(() => {
  const cols: DataTableColumn<Server>[] = [
    {
      type: 'selection',
    },
    {
      key: 'name',
      title: '名称',
      sorter: 'default',
      minWidth: 200,
      render: (row: Server) =>
        h(
          NButton,
          {
            class: 'flex items-center gap-2',
            text: true,
            onClick: () => goToDetail(row),
          },
          {
            default: () => [
              h('p', { class: 'flex-1 min-w-0 space-x-1' }, [
                h('span', {}, row.name || '-'),
                h('span', { class: 'text-muted-color' }, ` (${row.ip || '-'})`),
              ]),
            ],
          },
        ),
    },
    {
      key: 'status',
      title: '状态',
      sorter: 'default',
      minWidth: 100,
      render: (row: Server) =>
        h(
          NTag,
          {
            type: severityToNaiveType(getStatusSeverity(row.status)),
            size: 'small',
            bordered: false,
          },
          { default: () => getStatusText(row.status) },
        ),
    },
    {
      key: 'group',
      title: '分组',
      sorter: 'default',
      minWidth: 120,
      render: (row: Server) => {
        if (row.group) {
          return h(
            NTag,
            {
              class: 'flex items-center gap-2',
              size: 'small',
              color: {
                textColor: row?.group?.color ?? undefined,
              },
              bordered: false,
            },
            {
              default: () => [
                row.group!.color
                  ? h('span', {
                      class: 'w-3 h-3 rounded-full',
                      style: { backgroundColor: row.group!.color },
                    })
                  : null,
                h('span', {}, row.group!.name),
              ],
            },
          )
        }
        return h(NTag, { size: 'small' }, { default: () => '-' })
      },
    },
    {
      key: 'uptime',
      title: '运行时间',
      sorter: 'default',
      minWidth: 140,
      render: (row: Server) => {
        const cells: ReturnType<typeof h>[] = [
          h('div', { class: 'text-sm font-medium text-color' }, uptimeText(row)),
        ]
        if (row.status === 'online' && isServerDataStale(row.lastReportTime)) {
          cells.push(
            h(NTag, { size: 'small', type: 'warning', bordered: false, round: true }, { default: () => '数据陈旧' }),
          )
        }
        return h('div', { class: 'flex items-center gap-2' }, cells)
      },
    },
  ]

  // 付费信息列
  cols.push({
    key: 'billing',
    title: '付费信息',
    minWidth: 150,
    render: (row: Server) => {
      if (!row.billing) return h('span', {}, '-')
      const billingChildren: ReturnType<typeof h>[] = []
      if (row.billing?.price != null) {
        billingChildren.push(
          h(NTag, { size: 'small' }, { default: () => `￥${row.billing!.price}` }),
        )
      }
      if (row.billing?.billing_cycle) {
        billingChildren.push(
          h(
            NTag,
            {
              size: 'small',
              type: getBillingType(row.billing.billing_cycle),
            },
            { default: () => getBillingCycle(row.billing!.billing_cycle ?? '') },
          ),
        )
      }
      if (row.billing?.expire_time) {
        const countdown = getExpireCountdown(row.billing.expire_time)
        const expireText = countdown === '已过期' ? '已过期' : `${countdown}后到期`
        billingChildren.push(
          h(
            NTag,
            { size: 'small', type: countdown === '已过期' ? 'error' : 'info' },
            { default: () => expireText },
          ),
        )
      }
      return h(NSpace, { size: 2 }, { default: () => billingChildren })
    },
  })

  // 流量信息列
  cols.push({
    key: 'traffic',
    title: '流量信息',
    minWidth: 150,
    render: (row: Server) => {
      const summary = getTrafficLimitSummary(
        row.billing?.traffic_limit_bytes,
        row.billing?.traffic_reset_cycle,
        row.billing?.traffic_custom_cycle_days,
        row.billing?.traffic_limit_type,
      )

      if (summary === '-') return h('span', {}, '-')
      return h('div', { class: 'flex flex-col items-start gap-1' }, [h('div', {}, summary)])
    },
  })

  cols.push({
    key: 'actions',
    title: '操作',
    width: 160,
    fixed: 'right',
    render: (row: Server) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            secondary: true,
            title: '查看详情',
            onClick: () => goToDetail(row),
          },
          { default: () => h(RiEyeLine, { size: '14px' }) },
        ),
        h(
          NButton,
          {
            size: 'small',
            secondary: true,
            onClick: () => emit('edit-server', row),
          },
          { default: () => h(RiEditLine, { size: '14px' }) },
        ),
        h(
          NButton,
          {
            size: 'small',
            secondary: true,
            type: 'error',
            loading: props.deletingServerId === row.id,
            title: '删除',
            onClick: (e: MouseEvent) => confirmDelete(e, row),
          },
          { default: () => h(RiDeleteBinLine, { size: '14px' }) },
        ),
      ]),
  })

  // Agent版本列
  if (isAdmin.value) {
    cols.splice(4, 0, {
      key: 'agent_version',
      title: '版本',
      sorter: 'default',
      minWidth: 150,
      render: (row: Server) =>
        h('div', { class: 'text-left flex gap-2 items-center' }, [
          h('div', { class: 'text-sm font-medium text-color' }, row.agent_version || '-'),
          needsUpdate(row)
            ? h(
                NTag,
                {
                  type: 'info',
                  size: 'small',
                  round: true,
                  bordered: true,
                  class: 'cursor-pointer',
                  title: '有新版本可用，点击升级',
                  onClick: () => showUpdateAgentDialog(row),
                },
                {
                  default: () => [h('i', { class: 'ri-arrow-up-circle-line' })],
                },
              )
            : null,
        ]),
    })
  }

  return cols
})
</script>

<template>
  <div>
    <n-data-table
      :columns="columns"
      :data="servers"
      :loading="loading"
      :pagination="{
        showSizePicker: true,
        prefix: (info: PaginationInfo) => `共 ${info.itemCount} 条`,
      }"
      :row-key="(row: Server) => row.id"
      :checked-row-keys="checkedRowKeys"
      @update:checked-row-keys="handleCheckedRowsChange"
      striped
      class="w-full"
    >
      <template #empty>
        <n-empty description="暂无服务器" class="py-8" />
      </template>
    </n-data-table>
    <n-modal v-model:show="showUpdateDialog" :mask-closable="false">
      <n-card
        style="width: 500px; max-width: 95vw"
        title="更新 Agent"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <div v-if="selectedServerForUpdate" class="flex flex-col gap-4">
          <div>
            <p class="text-sm text-muted-color mb-2">服务器信息</p>
            <p class="font-medium">
              {{ selectedServerForUpdate.name }} ({{ selectedServerForUpdate.ip }})
            </p>
          </div>

          <div>
            <p class="text-sm text-muted-color mb-2">当前版本</p>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ selectedServerForUpdate.agent_version || '-' }}</span>
              <n-tag
                v-if="selectedServerForUpdate.agent_version"
                :type="
                  severityToNaiveType(
                    getVersionTypeConfig(
                      parseVersion(selectedServerForUpdate.agent_version).versionType,
                    ).severity,
                  )
                "
                size="small"
              >
                {{
                  getVersionTypeConfig(
                    parseVersion(selectedServerForUpdate.agent_version).versionType,
                  ).label
                }}
              </n-tag>
            </div>
          </div>

          <div>
            <p class="text-sm text-muted-color mb-2">最新版本</p>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ latestAgentVersion || '-' }}</span>
              <n-tag
                v-if="latestAgentVersionType"
                :type="severityToNaiveType(getVersionTypeConfig(latestAgentVersionType).severity)"
                size="small"
              >
                {{ getVersionTypeConfig(latestAgentVersionType).label }}
              </n-tag>
            </div>
            <div
              v-if="latestAgentVersionType && latestAgentVersionType !== 'release'"
              class="flex items-center gap-2 text-orange-500 text-sm mt-1"
            >
              <ri-error-warning-line size="14px" />
              <span>此版本为非正式版，可能包含实验性功能或大量缺陷，请谨慎更新</span>
            </div>
          </div>

          <div class="mt-2">
            <p class="text-sm text-muted-color">
              确认后，系统将向 Agent 发送更新指令，Agent 将自动下载并安装新版本。
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button text @click="showUpdateDialog = false" :disabled="updatingAgentId !== ''">
              取消
            </n-button>
            <n-button type="primary" :loading="updatingAgentId !== ''" @click="confirmUpdateAgent">
              <template #icon>
                <ri-check-line />
              </template>
              确认更新
            </n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>
