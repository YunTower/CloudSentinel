import { ref, computed, nextTick } from 'vue'

// 卡片配置接口
export interface CardConfig {
  id: string
  name: string
  visible: boolean
  order: number
  icon: string
}

// 默认卡片配置
const DEFAULT_CARDS: CardConfig[] = [
  {
    id: 'overview',
    name: '概览统计',
    visible: true,
    order: 0,
    icon: 'pi pi-chart-bar'
  },
  {
    id: 'charts',
    name: '系统图表',
    visible: true,
    order: 1,
    icon: 'pi pi-chart-line'
  },
  {
    id: 'alerts',
    name: '告警面板',
    visible: true,
    order: 2,
    icon: 'pi pi-bell'
  },
  {
    id: 'servers',
    name: '服务器状态',
    visible: true,
    order: 3,
    icon: 'pi pi-server'
  },
  {
    id: 'ranking',
    name: '资源排行',
    visible: true,
    order: 4,
    icon: 'pi pi-list'
  }
]

const STORAGE_KEY = 'dashboard-config'

export function useDashboardConfig() {
  // 响应式配置状态
  const cards = ref<CardConfig[]>([])

  // 加载配置
  const loadConfig = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const config = JSON.parse(saved) as CardConfig[]
        // 验证配置完整性，确保所有默认卡片都存在
        const configMap = new Map(config.map(card => [card.id, card]))

        cards.value = DEFAULT_CARDS.map(defaultCard => {
          const savedCard = configMap.get(defaultCard.id)
          return savedCard ? { ...defaultCard, ...savedCard } : defaultCard
        })
      } else {
        cards.value = [...DEFAULT_CARDS]
      }
    } catch (error) {
      console.error('加载仪表板配置失败:', error)
      cards.value = [...DEFAULT_CARDS]
    }
  }

  // 保存配置
  const saveConfig = async (newCards: CardConfig[]) => {
    try {
      cards.value = [...newCards]
      // 使用 nextTick 确保 DOM 更新完成后再保存
      await nextTick()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards.value))
    } catch (error) {
      console.error('保存仪表板配置失败:', error)
    }
  }

  // 重置为默认配置
  const resetConfig = async () => {
    cards.value = [...DEFAULT_CARDS]
    try {
      await nextTick()
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('重置仪表板配置失败:', error)
    }
  }

  // 获取可见卡片（按顺序排序）
  const visibleCards = computed(() => {
    return cards.value
      .filter(card => card.visible)
      .sort((a, b) => a.order - b.order)
  })

  // 获取特定卡片的配置
  const getCardConfig = (cardId: string) => {
    return cards.value.find(card => card.id === cardId)
  }

  // 检查卡片是否可见
  const isCardVisible = (cardId: string) => {
    const card = getCardConfig(cardId)
    return card ? card.visible : false
  }

  // 获取卡片在可见列表中的索引
  const getCardVisibleIndex = (cardId: string) => {
    const visibleCardIds = visibleCards.value.map(card => card.id)
    return visibleCardIds.indexOf(cardId)
  }

  // 更新本地配置（不自动保存到localStorage，避免重复存储）
  const updateLocalConfig = (newCards: CardConfig[]) => {
    cards.value = [...newCards]
  }

  // 初始化配置
  loadConfig()

  return {
    cards,
    visibleCards,
    loadConfig,
    saveConfig,
    resetConfig,
    updateLocalConfig,
    getCardConfig,
    isCardVisible,
    getCardVisibleIndex
  }
}

// 导出默认配置，供其他组件使用
export { DEFAULT_CARDS }
