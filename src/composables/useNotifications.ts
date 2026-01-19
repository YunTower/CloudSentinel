import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ToastMessageOptions } from 'primevue/toast'
import type { ConfirmationOptions } from 'primevue/confirmationoptions'

export function useNotifications() {
  const toast = useToast()
  const confirm = useConfirm()

  const showSuccess = (message: string, detail?: string, life = 3000) => {
    toast.add({
      severity: 'success',
      summary: message,
      detail,
      life,
    })
  }

  const showError = (message: string, detail?: string, life = 5000) => {
    toast.add({
      severity: 'error',
      summary: message,
      detail,
      life,
    })
  }

  const showWarning = (message: string, detail?: string, life = 4000) => {
    toast.add({
      severity: 'warn',
      summary: message,
      detail,
      life,
    })
  }

  const showInfo = (message: string, detail?: string, life = 3000) => {
    toast.add({
      severity: 'info',
      summary: message,
      detail,
      life,
    })
  }

  const showToast = (options: ToastMessageOptions) => {
    toast.add(options)
  }

  const showConfirm = (options: ConfirmationOptions) => {
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
