import { createDiscreteApi } from 'naive-ui'

const { message, dialog } = createDiscreteApi(['message', 'dialog'])

// Compat types matching previous PrimeVue API shapes
interface ToastOptions {
  severity: 'success' | 'error' | 'warn' | 'info'
  summary: string
  detail?: string
  life?: number
}

interface ConfirmOptions {
  message: string
  header?: string
  acceptProps?: { label?: string; severity?: string; outlined?: boolean }
  rejectProps?: { label?: string; severity?: string; outlined?: boolean }
  acceptClass?: string
  acceptLabel?: string
  rejectLabel?: string
  icon?: string
  target?: HTMLElement
  accept?: () => void
  reject?: () => void
}

// Toast compat object – mimics primevue's useToast().add() API
const toast = {
  add(options: ToastOptions) {
    const content = options.detail
      ? `${options.summary}: ${options.detail}`
      : options.summary
    const duration = options.life ?? 3000
    switch (options.severity) {
      case 'success':
        message.success(content, { duration })
        break
      case 'error':
        message.error(content, { duration })
        break
      case 'warn':
        message.warning(content, { duration })
        break
      default:
        message.info(content, { duration })
    }
  },
}

// Confirm compat object – mimics primevue's useConfirm().require() API
const confirm = {
  require(options: ConfirmOptions) {
    dialog.warning({
      title: options.header || '确认',
      content: options.message,
      positiveText:
        options.acceptProps?.label || options.acceptLabel || '确认',
      negativeText:
        options.rejectProps?.label || options.rejectLabel || '取消',
      onPositiveClick: options.accept,
      onNegativeClick: options.reject,
    })
  },
}

export function useNotifications() {
  const showSuccess = (msg: string, detail?: string, life = 3000) => {
    toast.add({ severity: 'success', summary: msg, detail, life })
  }

  const showError = (msg: string, detail?: string, life = 5000) => {
    toast.add({ severity: 'error', summary: msg, detail, life })
  }

  const showWarning = (msg: string, detail?: string, life = 4000) => {
    toast.add({ severity: 'warn', summary: msg, detail, life })
  }

  const showInfo = (msg: string, detail?: string, life = 3000) => {
    toast.add({ severity: 'info', summary: msg, detail, life })
  }

  const showToast = (options: ToastOptions) => {
    toast.add(options)
  }

  const showConfirm = (options: ConfirmOptions) => {
    confirm.require(options)
  }

  return {
    toast,
    confirm,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
    showConfirm,
  }
}
