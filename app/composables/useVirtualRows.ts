import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useVirtualRows<T>(items: Ref<T[]>, containerRef: Ref<HTMLElement | null>, rowHeight: number, overscan = 4) {
  const scrollTop = ref(0)
  const containerHeight = ref(0)

  function updateMetrics() {
    const container = containerRef.value
    if (!container) {
      return
    }

    scrollTop.value = container.scrollTop
    containerHeight.value = container.clientHeight
  }

  function onScroll() {
    updateMetrics()
  }

  onMounted(() => {
    const container = containerRef.value
    if (!container) {
      return
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    updateMetrics()
    window.addEventListener('resize', updateMetrics)
  })

  onBeforeUnmount(() => {
    const container = containerRef.value
    if (container) {
      container.removeEventListener('scroll', onScroll)
    }

    window.removeEventListener('resize', updateMetrics)
  })

  const visibleRange = computed(() => {
    const total = items.value.length

    if (total === 0) {
      return { start: 0, end: 0 }
    }

    const start = Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight.value / rowHeight) + overscan * 2
    const end = Math.min(total, start + visibleCount)

    return { start, end }
  })

  const virtualItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end).map((item, index) => ({
      item,
      index: start + index
    }))
  })

  const topSpacer = computed(() => visibleRange.value.start * rowHeight)
  const bottomSpacer = computed(() => {
    const total = items.value.length
    const hidden = total - visibleRange.value.end
    return Math.max(0, hidden * rowHeight)
  })

  return {
    visibleRange,
    virtualItems,
    topSpacer,
    bottomSpacer,
    updateMetrics
  }
}
