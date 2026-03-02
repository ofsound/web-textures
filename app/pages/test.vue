<script setup lang="ts">
import type { TestPreset, TextureListItem, TestPresetSlot, TextureListResponse } from '~~/shared/types/texture'

const textures = ref<TextureListItem[]>([])
const presets = ref<TestPreset[]>([])
const activeSlot = ref<number | null>(null)
const presetName = ref('Untitled Preset')
const notice = ref<string | null>(null)

const slotTemplates = [
  { slotIndex: 0, name: 'Hero Banner', class: 'col-span-3 h-48 md:h-56' },
  { slotIndex: 1, name: 'Panel A', class: 'col-span-2 h-44 md:h-52' },
  { slotIndex: 2, name: 'Panel B', class: 'col-span-1 h-40 md:h-48' },
  { slotIndex: 3, name: 'Panel C', class: 'col-span-1 h-40 md:h-48' },
  { slotIndex: 4, name: 'Panel D', class: 'col-span-3 h-40 md:h-48' }
]

const slots = ref<TestPresetSlot[]>(
  Array.from({ length: 5 }, (_, slotIndex) => ({
    slotIndex,
    textureVersionId: null,
    fitMode: 'tile',
    scale: 56,
    position: 'center'
  }))
)

const selectedPresetId = ref<string | null>(null)
const activeSlotState = computed(() => (activeSlot.value === null ? null : slots.value[activeSlot.value] ?? null))
const rawFetch = $fetch as unknown as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const textureByVersionId = computed(() => {
  const map = new Map<string, TextureListItem>()
  for (const texture of textures.value) {
    map.set(texture.versionId, texture)
  }
  return map
})

function slotPreviewStyle(slotIndex: number) {
  const slot = slots.value[slotIndex]
  if (!slot?.textureVersionId) {
    return ''
  }

  const texture = textureByVersionId.value.get(slot.textureVersionId)
  if (!texture) {
    return ''
  }

  const repeatValue = slot.fitMode === 'tile' ? 'repeat' : 'no-repeat'
  const sizeValue = slot.fitMode === 'tile' ? `${slot.scale}px ${slot.scale}px` : slot.fitMode

  return `${texture.preview.cssText}; background-size: ${sizeValue}; background-repeat: ${repeatValue}; background-position: ${slot.position};`
}

function applyTexture(slotIndex: number, texture: TextureListItem) {
  const slot = slots.value[slotIndex]
  if (!slot) {
    return
  }

  slot.textureVersionId = texture.versionId
}

async function loadPublishedTextures() {
  const loaded: TextureListItem[] = []
  let cursor: string | null = null

  do {
    const response: TextureListResponse = await rawFetch('/api/textures', {
      query: {
        status: 'published',
        limit: 50,
        cursor: cursor ?? undefined
      }
    })

    loaded.push(...response.items)
    cursor = response.nextCursor
  } while (cursor)

  textures.value = loaded
}

async function loadPresets() {
  const response = await rawFetch<{ items: TestPreset[] }>('/api/test-presets')
  presets.value = response.items
}

function loadPreset(preset: TestPreset) {
  selectedPresetId.value = preset.id
  presetName.value = preset.name
  slots.value = preset.slots.map((slot) => ({ ...slot }))
}

async function savePreset() {
  try {
    const saved = await rawFetch<TestPreset>('/api/test-presets', {
      method: 'POST',
      body: {
        id: selectedPresetId.value ?? undefined,
        name: presetName.value,
        slots: slots.value
      }
    })

    notice.value = `Saved preset: ${saved.name}`
    selectedPresetId.value = saved.id
    await loadPresets()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to save preset (admin login required).'
  }
}

function applyToActiveSlot(texture: TextureListItem) {
  if (activeSlot.value === null) {
    return
  }

  applyTexture(activeSlot.value, texture)
}

onMounted(async () => {
  await Promise.all([loadPublishedTextures(), loadPresets()])
})
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-[1fr_320px]">
    <div class="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Test View</h2>
        <label class="text-sm">
          <span class="mr-2 text-slate-600">Preset Name</span>
          <input v-model="presetName" class="rounded-lg border border-slate-300 px-2 py-1" />
        </label>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="panel in slotTemplates"
          :key="panel.slotIndex"
          type="button"
          class="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left transition hover:border-accent"
          :class="panel.class"
          :style="slotPreviewStyle(panel.slotIndex)"
          @click="activeSlot = panel.slotIndex"
        >
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/60 to-transparent p-2 text-xs text-white">
            {{ panel.name }}
          </div>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white" @click="savePreset">Save Preset</button>
        <span v-if="notice" class="text-xs text-slate-600">{{ notice }}</span>
      </div>
    </div>

    <aside class="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
      <div>
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Slot Assignment</h3>
        <p v-if="activeSlot === null" class="text-sm text-slate-500">Click a test panel to assign a texture.</p>
        <div v-else class="space-y-2">
          <p class="text-sm font-medium">Active Slot: {{ activeSlot + 1 }}</p>
          <div class="max-h-56 space-y-2 overflow-auto pr-1">
            <button
              v-for="texture in textures"
              :key="texture.id"
              type="button"
              class="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left hover:border-accent"
              @click="applyToActiveSlot(texture)"
            >
              <div class="aspect-[10/1] texture-preview" :style="texture.preview.cssText" />
              <div class="px-2 py-1 text-xs">
                {{ texture.name }}
              </div>
            </button>
          </div>

          <div v-if="activeSlotState" class="grid grid-cols-2 gap-2 text-xs">
            <label class="space-y-1">
              <span>Fit Mode</span>
              <select v-model="activeSlotState.fitMode" class="w-full rounded border border-slate-300 px-2 py-1">
                <option value="tile">tile</option>
                <option value="cover">cover</option>
                <option value="contain">contain</option>
              </select>
            </label>
            <label class="space-y-1">
              <span>Scale</span>
              <input v-model.number="activeSlotState.scale" type="number" min="8" max="400" class="w-full rounded border border-slate-300 px-2 py-1" />
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Saved Presets</h3>
        <div class="space-y-2">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-accent"
            @click="loadPreset(preset)"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>
    </aside>
  </section>
</template>
