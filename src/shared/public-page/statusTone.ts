export const publicStatusTone = {
  success: {
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  warning: {
    dot: 'bg-amber-500',
    pill: 'bg-amber-500/10 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  },
  danger: {
    dot: 'bg-red-500',
    pill: 'bg-red-500/10 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
  info: {
    dot: 'bg-sky-500',
    pill: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  },
  neutral: {
    dot: 'bg-zinc-400',
    pill: 'bg-zinc-950/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
  },
} as const
