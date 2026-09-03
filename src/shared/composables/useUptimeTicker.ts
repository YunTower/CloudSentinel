import { onUnmounted, ref, type Ref } from 'vue'

// 全局共享的每秒时钟：多个组件复用同一个 interval，触发各处运行时间等按秒刷新
const sharedNow = ref(Date.now())
let sharedTimer: ReturnType<typeof setInterval> | null = null
let refCount = 0

/**
 * 返回一个每秒更新的“当前时间戳(ms)”响应式引用。
 * 组件内调用即可让依赖它的 computed 每秒重新计算。
 */
export function useUptimeTicker(): Ref<number> {
  refCount += 1
  if (!sharedTimer) {
    sharedTimer = setInterval(() => {
      sharedNow.value = Date.now()
    }, 1000)
  }

  onUnmounted(() => {
    refCount -= 1
    if (refCount <= 0 && sharedTimer) {
      clearInterval(sharedTimer)
      sharedTimer = null
      refCount = 0
    }
  })

  return sharedNow
}
