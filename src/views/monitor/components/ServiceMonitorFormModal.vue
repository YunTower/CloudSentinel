<script setup lang="ts">
import { computed } from 'vue'
import { type ServiceMonitorForm } from '@/apis/service-monitors'

const props = defineProps<{
  show: boolean
  editingId: number | null
  form: ServiceMonitorForm
  servers: { id: string; name: string }[]
  saving: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:form': [value: ServiceMonitorForm]
  save: []
}>()

const typeOptions = [
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' },
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'ICMP Ping', value: 'icmp' },
  { label: 'DNS', value: 'dns' },
  { label: 'TLS 证书', value: 'tls' },
]

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
]

const serverOptions = computed(() => props.servers.map((s) => ({ label: s.name, value: s.id })))

const needsPort = computed(() =>
  ['tcp', 'udp', 'tls'].includes(props.form.type),
)
const supportsHttpExpectations = computed(() => props.form.type === 'http' || props.form.type === 'https')

const set = <K extends keyof ServiceMonitorForm>(key: K, value: ServiceMonitorForm[K]) => {
  emit('update:form', { ...props.form, [key]: value })
}
</script>

<template>
  <n-modal :show="show" :mask-closable="false" @update:show="emit('update:show', $event)">
    <n-card
      style="width: 520px; max-width: 95vw"
      :title="editingId ? '编辑监测任务' : '添加监测任务'"
      :bordered="false"
      role="dialog"
    >
      <n-form
        :model="form"
        label-placement="left"
        label-width="90px"
        :label-style="{ whiteSpace: 'nowrap' }"
      >
        <n-form-item label="名称">
          <n-input :value="form.name" placeholder="任务名称" @update:value="set('name', $event)" />
        </n-form-item>
        <n-form-item label="分组">
          <n-input
            :value="form.group_name"
            placeholder="例如 核心服务 / 外部依赖"
            @update:value="set('group_name', $event)"
          />
        </n-form-item>
        <n-form-item label="类型">
          <n-select :value="form.type" :options="typeOptions" @update:value="set('type', $event)" />
        </n-form-item>
        <n-form-item label="目标地址">
          <n-input
            :value="form.target"
            :placeholder="needsPort ? 'example.com' : 'https://example.com'"
            @update:value="set('target', $event)"
          />
        </n-form-item>
        <n-form-item v-if="needsPort" label="端口">
          <n-input-number
            :value="form.port"
            :min="1"
            :max="65535"
            style="width: 100%"
            @update:value="set('port', $event ?? 0)"
          />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch :value="form.enabled" @update:value="set('enabled', $event)" />
        </n-form-item>

        <n-collapse class="mt-2">
          <n-collapse-item title="高级设置" name="advanced">
            <n-form
              :model="form"
              label-placement="left"
              label-width="90px"
              :label-style="{ whiteSpace: 'nowrap' }"
            >
              <n-form-item label="检测间隔">
                <n-input-number
                  :value="form.interval"
                  :min="10"
                  :max="3600"
                  style="width: 100%"
                  @update:value="set('interval', $event ?? 60)"
                >
                  <template #suffix>秒</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="超时时间">
                <n-input-number
                  :value="form.timeout"
                  :min="1"
                  :max="60"
                  style="width: 100%"
                  @update:value="set('timeout', $event ?? 10)"
                >
                  <template #suffix>秒</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="失败阈值">
                <n-input-number
                  :value="form.failure_threshold"
                  :min="1"
                  :max="10"
                  style="width: 100%"
                  @update:value="set('failure_threshold', $event ?? 1)"
                >
                  <template #suffix>次</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="恢复阈值">
                <n-input-number
                  :value="form.recovery_threshold"
                  :min="1"
                  :max="10"
                  style="width: 100%"
                  @update:value="set('recovery_threshold', $event ?? 1)"
                >
                  <template #suffix>次</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="检测服务器">
                <n-select
                  :value="form.server_ids"
                  multiple
                  :options="serverOptions"
                  placeholder="留空则由面板直接检测"
                  @update:value="set('server_ids', $event)"
                />
              </n-form-item>
              <template v-if="supportsHttpExpectations">
                <n-form-item label="期望状态码">
                  <n-input-number
                    :value="form.expect_status"
                    :min="0"
                    :max="599"
                    placeholder="0 = 任意 2xx"
                    style="width: 100%"
                    @update:value="set('expect_status', $event ?? 0)"
                  />
                </n-form-item>
                <n-form-item label="期望响应体">
                  <n-input
                    :value="form.expect_body"
                    placeholder="响应体包含此字符串则视为正常（留空跳过）"
                    @update:value="set('expect_body', $event)"
                  />
                </n-form-item>
                <n-form-item label="请求方法">
                  <n-select
                    :value="form.http_method || 'GET'"
                    :options="methodOptions"
                    @update:value="set('http_method', $event)"
                  />
                </n-form-item>
                <n-form-item label="请求 Header">
                  <n-input
                    :value="form.http_headers"
                    type="textarea"
                    :autosize="{ minRows: 3, maxRows: 8 }"
                    placeholder='JSON 对象，例如 {"Authorization":"Bearer token"}'
                    @update:value="set('http_headers', $event)"
                  />
                </n-form-item>
                <n-form-item label="请求 Body">
                  <n-input
                    :value="form.http_body"
                    type="textarea"
                    :autosize="{ minRows: 3, maxRows: 10 }"
                    placeholder="POST/PUT/PATCH/DELETE 请求体"
                    @update:value="set('http_body', $event)"
                  />
                </n-form-item>
              </template>
            </n-form>
          </n-collapse-item>
        </n-collapse>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" :loading="saving" @click="emit('save')">保存</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>
