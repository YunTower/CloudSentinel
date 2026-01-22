<script setup lang="ts">
import { computed } from 'vue'
import { useNotifications } from '@/composables/useNotifications'
import type { Server } from '@/types/manager/servers'

interface Props {
  server?: Server | null
  agentKey?: string
  serverIP?: string
  websocketURL?: string
}

const props = withDefaults(defineProps<Props>(), {
  server: null,
  agentKey: '',
  serverIP: '',
  websocketURL: '',
})

const { toast } = useNotifications()

// 计算安装命令
const installCommand = computed(() => {
  const basicCommand =
    'curl -L https://raw.githubusercontent.com/YunTower/CloudSentinel-Agent/refs/heads/master/install.sh -o cloudsentinel_agent.sh && chmod +x cloudsentinel_agent.sh && sudo ./cloudsentinel_agent.sh'
  if (props.server) {
    if (!props.server.agent_key) return '无法生成安装命令：缺少Agent Key'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/agent`
    return basicCommand + ` --server=${wsUrl} --key=${props.server.agent_key} --daemon`
  }
  if (!props.agentKey || !props.serverIP) return '无法生成安装命令：缺少Agent Key或服务器IP'
  return basicCommand + ` --server=${props.websocketURL} --key=${props.agentKey} --daemon`
})

// 获取当前使用的 Agent Key
const currentAgentKey = computed(() => {
  console.log(props)
  return props.server?.agent_key || props.agentKey || '未设置'
})

/**
 * 通用复制到剪贴板函数
 * 优先使用现代 Clipboard API，失败时降级到传统方法
 * @param text 要复制的文本
 * @returns 是否复制成功
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  // 尝试使用现代 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.warn('Clipboard API 失败，尝试降级方案:', error)
    }
  }

  // 降级到传统 execCommand 方法
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      return true
    }
  } catch (error) {
    console.error('传统复制方法也失败:', error)
  }

  return false
}

// 复制 Agent Key
const copyAgentKey = async () => {
  const key = currentAgentKey.value
  if (!key || key === '未设置') {
    toast.add({
      severity: 'warn',
      summary: '无法复制',
      detail: 'Agent Key 不存在',
      life: 2000,
    })
    return
  }

  const success = await copyToClipboard(key)
  if (success) {
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: 'Agent Key已复制到剪贴板',
      life: 2000,
    })
  } else {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制Agent Key',
      life: 3000,
    })
  }
}

// 复制安装命令
const copyInstallCommand = async () => {
  const success = await copyToClipboard(installCommand.value)
  if (success) {
    toast.add({
      severity: 'success',
      summary: '复制成功',
      detail: '安装命令已复制到剪贴板',
      life: 2000,
    })
  } else {
    toast.add({
      severity: 'error',
      summary: '复制失败',
      detail: '请手动复制安装命令',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 连接密钥 -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <h4 class="text-lg font-semibold text-color">Agent Key</h4>
        </div>
        <Button
          icon="pi pi-copy"
          text
          size="small"
          @click="copyAgentKey"
          v-tooltip.top="'复制密钥'"
        />
      </div>
      <div class="space-y-3">
        <code
          class="block bg-surface-900 dark:bg-surface-800 text-green-400 dark:text-green-300 p-3 rounded font-mono text-sm break-all whitespace-pre-wrap"
        >
          {{ currentAgentKey }}
        </code>
      </div>
    </div>

    <!-- 安装命令 -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <h4 class="text-lg font-semibold text-color">Linux 安装命令</h4>
        </div>
        <Button
          icon="pi pi-copy"
          text
          size="small"
          @click="copyInstallCommand"
          v-tooltip.top="'复制命令'"
        />
      </div>
      <div class="space-y-3">
        <code
          class="block bg-surface-900 dark:bg-surface-800 text-green-400 dark:text-green-300 p-3 rounded font-mono text-sm break-all whitespace-pre-wrap"
        >
          {{ installCommand }}
        </code>
      </div>
    </div>
  </div>
</template>
