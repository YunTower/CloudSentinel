declare module 'vue' {
  export interface GlobalComponents {
    Loading: (typeof import('./Loading.vue'))['default']
  }
}

export interface LoadingProps {
  loading?: boolean
  size?: string | number
  strokeWidth?: string | number
  animationDuration?: string
  overlay?: boolean
  text?: string
}

export {}
