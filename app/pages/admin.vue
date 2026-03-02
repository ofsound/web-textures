<script setup lang="ts">
import type { PrimitiveDefinition, TextureDetailResponse, TextureListItem, TextureSourceGraph, TextureVersionRecord } from '~~/shared/types/texture'

definePageMeta({ middleware: 'sidebase-auth' })

const { data: sessionData, signOut } = useAuth()

const textures = ref<TextureListItem[]>([])
const selectedTextureId = ref<string | null>(null)
const detail = ref<TextureDetailResponse | null>(null)
const primitives = ref<PrimitiveDefinition[]>([])
const workingGraph = ref<TextureSourceGraph | null>(null)
const previewCssText = ref('')
const selectedVersionId = ref<string | null>(null)
const saveStatus = ref<string | null>(null)
const editorMode = ref<'gui' | 'code'>('gui')
const graphCode = ref('')
const graphCodeError = ref<string | null>(null)

const form = reactive({
  name: '',
  description: '',
  tags: ''
})

function tagsFromInput() {
  return form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function syncCodeFromGraph() {
  if (!workingGraph.value) {
    graphCode.value = ''
    return
  }

  graphCode.value = JSON.stringify(workingGraph.value, null, 2)
}

function setEditorMode(mode: 'gui' | 'code') {
  editorMode.value = mode
  graphCodeError.value = null

  if (mode === 'code') {
    syncCodeFromGraph()
  }
}

async function loadTextures() {
  const response = await $fetch('/api/textures', { query: { status: 'all', limit: 100 } })
  textures.value = response.items

  if (!selectedTextureId.value && response.items[0]) {
    selectedTextureId.value = response.items[0].id
    await loadDetail(response.items[0].id)
  }
}

async function loadPrimitives() {
  const response = await $fetch('/api/primitives')
  primitives.value = response.items
}

async function loadDetail(textureId: string) {
  const response = await $fetch<TextureDetailResponse>(`/api/textures/${textureId}`)
  detail.value = response
  selectedTextureId.value = textureId

  form.name = response.texture.name
  form.description = response.texture.description ?? ''
  form.tags = response.tags.join(', ')

  const latestDraft = response.versions.find((version) => version.status === 'draft') ?? response.versions[0]

  if (latestDraft) {
    workingGraph.value = structuredClone(latestDraft.sourceGraph)
    workingGraph.value.advancedOverride = workingGraph.value.advancedOverride ?? { cssExtra: '', htmlExtra: '', svgExtra: '' }
    selectedVersionId.value = latestDraft.id
    syncCodeFromGraph()
    await renderPreview()
  }
}

function addNode() {
  if (!workingGraph.value) {
    return
  }

  const primitive = primitives.value[0]
  if (!primitive) {
    return
  }

  workingGraph.value.nodes.push({
    id: `node-${Date.now()}`,
    primitiveId: primitive.id,
    signature: primitive.signature,
    params: { ...primitive.defaults },
    opacity: 0.65,
    blendMode: 'normal'
  })
}

function ensureAdvancedOverride() {
  if (!workingGraph.value) {
    return
  }

  if (!workingGraph.value.advancedOverride) {
    workingGraph.value.advancedOverride = {
      cssExtra: '',
      htmlExtra: '',
      svgExtra: ''
    }
  }
}

function removeNode(index: number) {
  if (!workingGraph.value) {
    return
  }

  workingGraph.value.nodes.splice(index, 1)
}

function syncPrimitive(nodeIndex: number) {
  if (!workingGraph.value) {
    return
  }

  const node = workingGraph.value.nodes[nodeIndex]
  if (!node) {
    return
  }
  const primitive = primitives.value.find((item) => item.id === node.primitiveId)

  if (!primitive) {
    return
  }

  node.signature = primitive.signature

  const mergedParams: Record<string, string | number | boolean> = { ...primitive.defaults }
  for (const [key, value] of Object.entries(node.params)) {
    mergedParams[key] = value
  }

  node.params = mergedParams
}

async function renderPreview() {
  if (!workingGraph.value) {
    return
  }

  const response = await $fetch('/api/render/preview', {
    method: 'POST',
    body: {
      sourceGraph: workingGraph.value
    }
  })

  previewCssText.value = response.previewCssText
}

async function applyCodeToGraph() {
  try {
    const parsed = JSON.parse(graphCode.value) as TextureSourceGraph
    workingGraph.value = parsed
    ensureAdvancedOverride()
    graphCodeError.value = null
    await renderPreview()
    saveStatus.value = 'Code graph applied.'
  } catch (error) {
    graphCodeError.value = error instanceof Error ? error.message : 'Invalid JSON source graph'
  }
}

async function saveMetadata() {
  if (!selectedTextureId.value) {
    return
  }

  await $fetch(`/api/textures/${selectedTextureId.value}`, {
    method: 'PATCH',
    body: {
      name: form.name,
      description: form.description,
      tags: tagsFromInput()
    }
  })

  await loadTextures()
  saveStatus.value = 'Metadata saved.'
}

async function saveDraftVersion() {
  if (!selectedTextureId.value || !workingGraph.value) {
    return
  }

  const created = await $fetch(`/api/textures/${selectedTextureId.value}/versions`, {
    method: 'POST',
    body: {
      sourceGraph: workingGraph.value
    }
  })

  selectedVersionId.value = created.id
  await loadDetail(selectedTextureId.value)
  await loadTextures()
  saveStatus.value = `Draft v${created.versionNumber} created.`
}

async function publishVersion(versionId: string) {
  if (!selectedTextureId.value) {
    return
  }

  await $fetch(`/api/textures/${selectedTextureId.value}/publish`, {
    method: 'POST',
    body: { versionId }
  })

  await loadDetail(selectedTextureId.value)
  await loadTextures()
  saveStatus.value = 'Version published.'
}

async function createTexture() {
  const name = window.prompt('Texture name')
  if (!name) {
    return
  }

  const created = await $fetch<TextureDetailResponse>('/api/textures', {
    method: 'POST',
    body: {
      name,
      description: '',
      tags: []
    }
  })

  await loadTextures()
  await loadDetail(created.texture.id)
  saveStatus.value = 'Texture created.'
}

function applyVersionToEditor(version: TextureVersionRecord) {
  workingGraph.value = structuredClone(version.sourceGraph)
  workingGraph.value.advancedOverride = workingGraph.value.advancedOverride ?? { cssExtra: '', htmlExtra: '', svgExtra: '' }
  selectedVersionId.value = version.id
  syncCodeFromGraph()
  void renderPreview()
}

onMounted(async () => {
  await Promise.all([loadPrimitives(), loadTextures()])
})
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[280px_1fr]">
    <aside class="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Textures</h2>
        <button class="rounded bg-accent px-2 py-1 text-xs font-medium text-white" @click="createTexture">New</button>
      </div>

      <div class="max-h-[70vh] space-y-2 overflow-auto pr-1">
        <button
          v-for="texture in textures"
          :key="texture.id"
          class="w-full overflow-hidden rounded-lg border text-left"
          :class="selectedTextureId === texture.id ? 'border-accent bg-accentSoft/60' : 'border-slate-200 bg-white hover:border-accent'"
          @click="loadDetail(texture.id)"
        >
          <div class="aspect-[10/1] texture-preview" :style="texture.preview.cssText" />
          <div class="px-2 py-1.5 text-xs font-medium">{{ texture.name }}</div>
        </button>
      </div>

      <button class="w-full rounded border border-slate-300 px-3 py-2 text-xs" @click="signOut({ callbackUrl: '/' })">
        Sign out {{ sessionData?.user?.email }}
      </button>
    </aside>

    <div v-if="detail && workingGraph" class="space-y-4">
      <section class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Metadata</h3>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="text-sm">
            <span class="mb-1 block font-medium">Name</span>
            <input v-model="form.name" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label class="text-sm">
            <span class="mb-1 block font-medium">Tags (CSV)</span>
            <input v-model="form.tags" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label class="text-sm md:col-span-2">
            <span class="mb-1 block font-medium">Description</span>
            <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
        <div class="mt-3">
          <button class="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white" @click="saveMetadata">Save Metadata</button>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Source Graph</h3>
          <div class="flex items-center gap-2">
            <button
              class="rounded px-2 py-1 text-xs font-medium"
              :class="editorMode === 'gui' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-700'"
              @click="setEditorMode('gui')"
            >
              GUI
            </button>
            <button
              class="rounded px-2 py-1 text-xs font-medium"
              :class="editorMode === 'code' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-700'"
              @click="setEditorMode('code')"
            >
              Code
            </button>
            <button v-if="editorMode === 'gui'" class="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white" @click="addNode">
              Add Node
            </button>
          </div>
        </div>

        <template v-if="editorMode === 'gui'">
          <div class="grid gap-3 md:grid-cols-4">
            <label class="text-xs">
              <span class="mb-1 block font-medium">Base Color</span>
              <input v-model="workingGraph.baseColor" type="color" class="h-9 w-full rounded border border-slate-300" />
            </label>
            <label class="text-xs">
              <span class="mb-1 block font-medium">Tile Size</span>
              <input v-model.number="workingGraph.tileSize" type="number" min="8" max="512" class="w-full rounded border border-slate-300 px-2 py-1" />
            </label>
            <label class="text-xs">
              <span class="mb-1 block font-medium">Zoom</span>
              <input v-model.number="workingGraph.zoom" type="number" min="0.2" max="8" step="0.1" class="w-full rounded border border-slate-300 px-2 py-1" />
            </label>
            <label class="text-xs">
              <span class="mb-1 block font-medium">Repeat</span>
              <select v-model="workingGraph.repeatMode" class="w-full rounded border border-slate-300 px-2 py-1">
                <option value="repeat">repeat</option>
                <option value="repeat-x">repeat-x</option>
                <option value="repeat-y">repeat-y</option>
                <option value="no-repeat">no-repeat</option>
              </select>
            </label>
          </div>

          <div class="mt-4 space-y-3">
            <div v-for="(node, index) in workingGraph.nodes" :key="node.id" class="rounded-lg border border-slate-200 p-3">
              <div class="mb-2 flex items-center justify-between">
                <strong class="text-xs uppercase tracking-wide text-slate-600">Node {{ index + 1 }}</strong>
                <button class="rounded border border-rose-300 px-2 py-0.5 text-xs text-rose-700" @click="removeNode(index)">Remove</button>
              </div>

              <div class="grid gap-2 md:grid-cols-4">
                <label class="text-xs">
                  <span class="mb-1 block">Primitive</span>
                  <select v-model="node.primitiveId" class="w-full rounded border border-slate-300 px-2 py-1" @change="syncPrimitive(index)">
                    <option v-for="primitive in primitives" :key="primitive.id" :value="primitive.id">
                      {{ primitive.name }}
                    </option>
                  </select>
                </label>

                <label class="text-xs">
                  <span class="mb-1 block">Opacity</span>
                  <input v-model.number="node.opacity" type="number" min="0" max="1" step="0.05" class="w-full rounded border border-slate-300 px-2 py-1" />
                </label>

                <label class="text-xs">
                  <span class="mb-1 block">Blend Mode</span>
                  <select v-model="node.blendMode" class="w-full rounded border border-slate-300 px-2 py-1">
                    <option value="normal">normal</option>
                    <option value="multiply">multiply</option>
                    <option value="screen">screen</option>
                    <option value="overlay">overlay</option>
                    <option value="soft-light">soft-light</option>
                  </select>
                </label>

                <label class="text-xs">
                  <span class="mb-1 block">Signature</span>
                  <input v-model="node.signature" class="w-full rounded border border-slate-300 px-2 py-1 font-mono" />
                </label>
              </div>

              <div class="mt-2 grid gap-2 md:grid-cols-4">
                <label class="text-xs">
                  <span class="mb-1 block">Color A</span>
                  <input v-model="node.params.colorA" class="w-full rounded border border-slate-300 px-2 py-1" />
                </label>
                <label class="text-xs">
                  <span class="mb-1 block">Color B</span>
                  <input v-model="node.params.colorB" class="w-full rounded border border-slate-300 px-2 py-1" />
                </label>
                <label class="text-xs">
                  <span class="mb-1 block">Size/Width</span>
                  <input v-model.number="node.params.size" type="number" class="w-full rounded border border-slate-300 px-2 py-1" />
                </label>
                <label class="text-xs">
                  <span class="mb-1 block">Gap/Angle</span>
                  <input v-model.number="node.params.gap" type="number" class="w-full rounded border border-slate-300 px-2 py-1" />
                </label>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-3">
            <label class="text-xs md:col-span-3">
              <span class="mb-1 block font-medium">CSS Override (constrained)</span>
              <textarea
                v-model="workingGraph.advancedOverride!.cssExtra"
                rows="2"
                class="w-full rounded border border-slate-300 px-2 py-1 font-mono"
                @focus="ensureAdvancedOverride"
              />
            </label>
            <label class="text-xs">
              <span class="mb-1 block font-medium">HTML Override</span>
              <textarea
                v-model="workingGraph.advancedOverride!.htmlExtra"
                rows="2"
                class="w-full rounded border border-slate-300 px-2 py-1 font-mono"
                @focus="ensureAdvancedOverride"
              />
            </label>
            <label class="text-xs md:col-span-2">
              <span class="mb-1 block font-medium">SVG Override</span>
              <textarea
                v-model="workingGraph.advancedOverride!.svgExtra"
                rows="2"
                class="w-full rounded border border-slate-300 px-2 py-1 font-mono"
                @focus="ensureAdvancedOverride"
              />
            </label>
          </div>
        </template>
        <div v-else class="space-y-2">
          <p class="text-xs text-slate-600">
            Code-first mode: edit the full `TextureSourceGraph` JSON directly, then apply and render.
          </p>
          <textarea
            v-model="graphCode"
            rows="20"
            class="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs"
            spellcheck="false"
          />
          <p v-if="graphCodeError" class="text-xs text-rose-700">{{ graphCodeError }}</p>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button v-if="editorMode === 'code'" class="rounded bg-slate-700 px-3 py-2 text-xs font-semibold text-white" @click="applyCodeToGraph">
            Apply JSON
          </button>
          <button class="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white" @click="renderPreview">Render Preview</button>
          <button class="rounded bg-accent px-3 py-2 text-xs font-semibold text-white" @click="saveDraftVersion">Save Draft Version</button>
          <span v-if="saveStatus" class="text-xs text-slate-600">{{ saveStatus }}</span>
        </div>

        <div class="mt-3 rounded-lg border border-slate-200 bg-slate-100 p-3">
          <div class="aspect-[10/1] rounded texture-preview" :style="previewCssText" />
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-panel">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Versions</h3>

        <div class="space-y-2">
          <div v-for="version in detail.versions" :key="version.id" class="rounded-lg border border-slate-200 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-semibold">v{{ version.versionNumber }}</p>
                <p class="text-xs text-slate-500">{{ version.status }} · {{ new Date(version.createdAt).toLocaleString() }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="rounded border border-slate-300 px-2 py-1 text-xs" @click="applyVersionToEditor(version)">Load</button>
                <button
                  v-if="version.status !== 'published'"
                  class="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                  @click="publishVersion(version.id)"
                >
                  Publish
                </button>
              </div>
            </div>

            <details class="mt-2">
              <summary class="cursor-pointer text-xs text-slate-600">Artifact Export</summary>
              <div class="mt-2 grid gap-2">
                <textarea readonly rows="4" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs">{{ version.artifactBundle.cssSnippet }}</textarea>
                <textarea readonly rows="3" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs">{{ version.artifactBundle.htmlSnippet }}</textarea>
                <textarea readonly rows="3" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs">{{ version.artifactBundle.svgDefs }}</textarea>
                <textarea v-if="version.artifactBundle.jsSnippet" readonly rows="3" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs">{{ version.artifactBundle.jsSnippet }}</textarea>
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-500 shadow-panel">
      Select or create a texture to begin authoring.
    </div>
  </section>
</template>
