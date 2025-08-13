<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

// 卡片配置接口
interface CardConfig {
  id: string
  name: string
  visible: boolean
  order: number
  icon: string
}

interface Props {
  visible: boolean
  cards: CardConfig[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'update:cards', cards: CardConfig[]): void
  (e: 'reset'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 内部状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const localCards = ref<CardConfig[]>([])
const isProcessing = ref(false)

// 监听props变化，更新本地状态
watch(() => props.cards, (newCards) => {
  localCards.value = [...newCards].sort((a, b) => a.order - b.order)
}, { immediate: true, deep: true })

// 拖拽相关状态
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const isDragging = ref(false)

// 事件处理
const handleCardVisibilityChange = (cardId: string, visible: boolean) => {
  const card = localCards.value.find(c => c.id === cardId)
  if (card) {
    card.visible = visible
  }
}

const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index
  isDragging.value = true
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', '')
  }
}

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  dragOverIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnd = () => {
  // 添加短暂延迟，避免立即清除状态造成视觉闪烁
  setTimeout(() => {
    draggedIndex.value = null
    dragOverIndex.value = null
    isDragging.value = false
  }, 50)
}

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()

  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    // 使用更高效的方式交换数组元素
    const sourceIndex = draggedIndex.value
    const targetIndex = dropIndex

    // 批量更新，减少响应式触发次数
    const newCards = [...localCards.value]
    const [removed] = newCards.splice(sourceIndex, 1)
    const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
    newCards.splice(insertIndex, 0, removed)

    // 批量更新order，使用 requestAnimationFrame 优化性能
    requestAnimationFrame(() => {
      newCards.forEach((card, index) => {
        card.order = index
      })
      localCards.value = newCards
    })
  }

  handleDragEnd()
}

const moveUp = (index: number) => {
  if (index > 0) {
    // 使用 requestAnimationFrame 优化批量更新
    requestAnimationFrame(() => {
      const newCards: CardConfig[] = [...localCards.value]
      // 直接交换数组元素
      const temp = newCards[index]
      newCards[index] = newCards[index - 1]
      newCards[index - 1] = temp

      // 批量更新order
      newCards.forEach((card: CardConfig, i: number) => {
        card.order = i
      })

      localCards.value = newCards
    })
  }
}

const moveDown = (index: number) => {
  if (index < localCards.value.length - 1) {
    // 使用 requestAnimationFrame 优化批量更新
    requestAnimationFrame(() => {
      const newCards: CardConfig[] = [...localCards.value]
      // 直接交换数组元素
      const temp = newCards[index]
      newCards[index] = newCards[index + 1]
      newCards[index + 1] = temp

      // 批量更新order
      newCards.forEach((card: CardConfig, i: number) => {
        card.order = i
      })

      localCards.value = newCards
    })
  }
}

const handleSave = async () => {
  isProcessing.value = true
  try {
    // 添加短暂延迟，提供视觉反馈
    await new Promise(resolve => setTimeout(resolve, 100))
    emit('update:cards', localCards.value)
    dialogVisible.value = false
  } finally {
    isProcessing.value = false
  }
}

const handleReset = async () => {
  isProcessing.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 100))
    emit('reset')
    dialogVisible.value = false
  } finally {
    isProcessing.value = false
  }
}

const handleCancel = () => {
  // 重置本地状态为原始值
  localCards.value = [...props.cards].sort((a, b) => a.order - b.order)
  dialogVisible.value = false
}

// 计算可见卡片数量
const visibleCardsCount = computed(() => {
  return localCards.value.filter(card => card.visible).length
})
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="仪表板自定义"
    :style="{ width: '80vw', maxWidth: '600px' }"
    :dismissableMask="true"
  >
    <div class="space-y-6">
      <!-- 说明 -->
      <div class="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <i class="pi pi-info-circle text-blue-600"></i>
          <span class="font-medium text-blue-800 dark:text-blue-200">自定义提示</span>
        </div>
        <p class="text-sm text-blue-700 dark:text-blue-300">
          您可以控制卡片的显示和顺序。拖拽卡片或使用箭头按钮调整顺序，取消勾选隐藏不需要的卡片。
        </p>
      </div>

      <!-- 卡片列表 -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">卡片管理</h3>
          <span class="text-sm text-muted-color">
            显示 {{ visibleCardsCount }} / {{ localCards.length }} 个卡片
          </span>
        </div>

        <div class="space-y-2">
          <div
            v-for="(card, index) in localCards"
            :key="card.id"
            class="flex items-center gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg transition-all"
            :class="{
              'bg-surface-50 dark:bg-surface-800': dragOverIndex === index,
              'opacity-50': draggedIndex === index,
              'bg-surface-0 dark:bg-surface-900': dragOverIndex !== index && draggedIndex !== index
            }"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover="handleDragOver($event, index)"
            @dragend="handleDragEnd"
            @drop="handleDrop($event, index)"
          >
            <!-- 拖拽手柄 -->
            <div class="cursor-move text-muted-color hover:text-color transition-colors">
              <i class="pi pi-bars text-sm"></i>
            </div>

            <!-- 卡片图标和名称 -->
            <div class="flex items-center gap-2 flex-1">
              <i :class="card.icon" class="text-lg"></i>
              <span class="font-medium">{{ card.name }}</span>
            </div>

            <!-- 显示/隐藏控制 -->
            <div class="flex items-center gap-2">
              <Checkbox
                :inputId="`card-${card.id}`"
                v-model="card.visible"
                binary
                @change="handleCardVisibilityChange(card.id, card.visible)"
              />
              <label :for="`card-${card.id}`" class="text-sm text-muted-color cursor-pointer">
                {{ card.visible ? '显示' : '隐藏' }}
              </label>
            </div>

            <!-- 排序按钮 -->
            <div class="flex flex-col gap-1">
              <Button
                icon="pi pi-chevron-up"
                size="small"
                text
                :disabled="index === 0"
                @click="moveUp(index)"
                class="w-6 h-6 p-0"
              />
              <Button
                icon="pi pi-chevron-down"
                size="small"
                text
                :disabled="index === localCards.length - 1"
                @click="moveDown(index)"
                class="w-6 h-6 p-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <Button
          label="重置默认"
          icon="pi pi-refresh"
          severity="secondary"
          text
          :disabled="isProcessing"
          @click="handleReset"
        />
        <div class="flex items-center gap-2">
          <Button
            label="取消"
            icon="pi pi-times"
            severity="secondary"
            :disabled="isProcessing"
            @click="handleCancel"
          />
          <Button
            :label="isProcessing ? '保存中...' : '保存'"
            :icon="isProcessing ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
            :disabled="isProcessing"
            @click="handleSave"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* 拖拽时的视觉反馈 */
.drag-over {
  border-color: var(--primary-color);
  background-color: var(--primary-color-text);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .flex.items-center.gap-3 {
    gap: 0.5rem;
  }

  .flex.flex-col.gap-1 {
    display: none;
  }
}
</style>
