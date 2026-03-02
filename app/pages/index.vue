<script setup lang="ts">
import type { TextureListItem } from '~~/shared/types/texture'
import { useVirtualRows } from '~/composables/useVirtualRows'

const query = ref('')
const tagInput = ref('')
const status = ref<'published' | 'draft' | 'all'>('published')
const items = ref<TextureListItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const hasLoadedOnce = ref(false)

const listContainer = ref<HTMLElement | null>(null)
const { virtualItems, visibleRange, topSpacer, bottomSpacer, updateMetrics } = useVirtualRows(items, listContainer, 126)

const tagCsv = computed(() =>
  tagInput.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(',')
)

async function loadTextures(reset = false) {
  if (loading.value) {
    return
  }

  loading.value = true
  loadError.value = null

  try {
    const response = await $fetch('/api/textures', {
      query: {
        q: query.value || undefined,
        tags: tagCsv.value || undefined,
        status: status.value,
        cursor: reset ? undefined : nextCursor.value ?? undefined,
        limit: 30
      }
    })

    items.value = reset ? response.items : [...items.value, ...response.items]
    nextCursor.value = response.nextCursor
    hasLoadedOnce.value = true

    await nextTick()
    updateMetrics()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load textures'
  } finally {
    loading.value = false
  }
}

watch([query, tagCsv, status], () => {
  nextCursor.value = null
  loadTextures(true)
})

watch(
  () => visibleRange.value.end,
  (end) => {
    if (nextCursor.value && end >= items.value.length - 6) {
      loadTextures(false)
    }
  }
)

onMounted(() => {
  loadTextures(true)
})
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-[280px_1fr]">
    <aside class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
      <h2 class="mb-3 text-lg font-semibold">Browse</h2>
      <div class="space-y-3">
        <label class="block text-sm">
          <span class="mb-1 block font-medium">Search</span>
          <input v-model="query" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="name, description" />
        </label>

        <label class="block text-sm">
          <span class="mb-1 block font-medium">Tags</span>
          <input v-model="tagInput" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="grid, cool, material" />
        </label>

        <label class="block text-sm">
          <span class="mb-1 block font-medium">Status</span>
          <select v-model="status" class="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
    </aside>

    <div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Texture Library</h2>
        <span class="text-xs text-slate-500">{{ items.length }} loaded</span>
      </div>

      <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        {{ loadError }}
      </div>

      <div ref="listContainer" class="h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div :style="{ height: `${topSpacer}px` }" />

        <div
          v-for="entry in virtualItems"
          :key="entry.item.id"
          class="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div class="aspect-[10/1] w-full border-b border-slate-200 texture-preview" :style="entry.item.preview.cssText" />
          <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
            <div class="flex items-center gap-2">
              <strong class="text-sm text-slate-800">{{ entry.item.name }}</strong>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">{{ entry.item.slug }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1">
              <span v-for="tag in entry.item.tags" :key="tag" class="rounded-full bg-accentSoft px-2 py-0.5 text-slate-700">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div :style="{ height: `${bottomSpacer}px` }" />

        <p v-if="loading" class="py-3 text-center text-xs text-slate-500">Loading textures...</p>
        <p v-if="!loading && hasLoadedOnce && items.length === 0" class="py-3 text-center text-sm text-slate-500">No textures found.</p>
      </div>
    </div>
  </section>
</template>
