import { nanoid } from 'nanoid'
import slugify from 'slugify'
import { createError } from 'h3'
import type { TestPreset, TextureDetailResponse, TextureListItem, TextureVersionRecord } from '~~/shared/types/texture'
import type { CreateTextureInput, CreateTextureVersionInput, ListTexturesInput, SavePresetInput, TextureRepository, UpdateTextureInput } from '~~/server/repositories/contracts'
import { buildDefaultSourceGraph, compileTexture } from '~~/server/domain/generator/compile'

interface MemoryTexture {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface MemoryTextureVersion extends TextureVersionRecord {
  previewCssText: string
}

interface MemoryTag {
  id: string
  name: string
  slug: string
}

interface MemoryStore {
  textures: MemoryTexture[]
  versions: MemoryTextureVersion[]
  textureTags: Array<{ textureId: string; tagId: string }>
  tags: MemoryTag[]
  presets: TestPreset[]
  auditEvents: Array<{
    id: string
    actor: string
    action: string
    entityType: string
    entityId: string
    payload: Record<string, unknown>
    createdAt: string
  }>
}

const store: MemoryStore = {
  textures: [],
  versions: [],
  textureTags: [],
  tags: [],
  presets: [],
  auditEvents: []
}

let seeded = false

function nowIso() {
  return new Date().toISOString()
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64')
}

function decodeCursor(cursor?: string): number {
  if (!cursor) {
    return 0
  }

  const parsed = Number(Buffer.from(cursor, 'base64').toString('utf8'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function getOrCreateTag(name: string): MemoryTag {
  const slug = slugify(name, { lower: true, strict: true })
  const found = store.tags.find((tag) => tag.slug === slug)

  if (found) {
    return found
  }

  const newTag: MemoryTag = {
    id: nanoid(10),
    name,
    slug
  }

  store.tags.push(newTag)
  return newTag
}

function applyTags(textureId: string, tags: string[]) {
  store.textureTags = store.textureTags.filter((row) => row.textureId !== textureId)

  for (const tagName of tags) {
    const tag = getOrCreateTag(tagName)
    store.textureTags.push({ textureId, tagId: tag.id })
  }
}

function getTagNamesForTexture(textureId: string): string[] {
  return store.textureTags
    .filter((row) => row.textureId === textureId)
    .map((row) => store.tags.find((tag) => tag.id === row.tagId)?.name)
    .filter((tag): tag is string => Boolean(tag))
}

function recordAudit(actor: string, action: string, entityType: string, entityId: string, payload: Record<string, unknown> = {}) {
  store.auditEvents.push({
    id: nanoid(12),
    actor,
    action,
    entityType,
    entityId,
    payload,
    createdAt: nowIso()
  })
}

function toDetail(texture: MemoryTexture): TextureDetailResponse {
  return {
    texture,
    versions: store.versions
      .filter((version) => version.textureId === texture.id)
      .map((version) => ({
        id: version.id,
        textureId: version.textureId,
        versionNumber: version.versionNumber,
        status: version.status,
        sourceGraph: version.sourceGraph,
        artifactBundle: version.artifactBundle,
        createdAt: version.createdAt,
        publishedAt: version.publishedAt
      }))
      .sort((a, b) => b.versionNumber - a.versionNumber),
    tags: getTagNamesForTexture(texture.id)
  }
}

function pickPreview(textureId: string, status: ListTexturesInput['status']) {
  const versions = store.versions
    .filter((version) => version.textureId === textureId)
    .sort((a, b) => b.versionNumber - a.versionNumber)

  if (status === 'published') {
    return versions.find((version) => version.status === 'published')
  }

  if (status === 'draft') {
    return versions.find((version) => version.status === 'draft') ?? versions[0]
  }

  return versions[0]
}

function seedDemoData() {
  if (seeded) {
    return
  }

  seeded = true

  const templates = [
    { name: 'Aqua Stripe', tags: ['linear', 'cool'] },
    { name: 'Paper Grain', tags: ['material', 'warm'] },
    { name: 'Blueprint Grid', tags: ['technical', 'grid'] },
    { name: 'Perlin Cloud', tags: ['noise', 'perlin'] }
  ]

  const primitiveByTemplate: Record<string, { primitiveId: string; signature: string }> = {
    'Aqua Stripe': { primitiveId: 'linear-stripes', signature: 'p_001' },
    'Paper Grain': { primitiveId: 'paper-grain', signature: 'p_018' },
    'Blueprint Grid': { primitiveId: 'blueprint-grid', signature: 'p_019' },
    'Perlin Cloud': { primitiveId: 'perlin-noise', signature: 'p_021' }
  }

  for (const template of templates) {
    const textureId = nanoid(12)
    const slug = slugify(template.name, { lower: true, strict: true })

    const texture: MemoryTexture = {
      id: textureId,
      name: template.name,
      slug,
      description: `${template.name} seeded texture`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null
    }

    store.textures.push(texture)
    applyTags(textureId, template.tags)

    const defaultGraph = buildDefaultSourceGraph()
    const firstNode = defaultGraph.nodes[0]
    const mapping = primitiveByTemplate[template.name]

    if (firstNode && mapping) {
      firstNode.primitiveId = mapping.primitiveId
      firstNode.signature = mapping.signature

      if (mapping.primitiveId === 'perlin-noise') {
        firstNode.params = {
          baseFrequency: 0.85,
          octaves: 5,
          seed: 17,
          scale: 104,
          noiseType: 'fractalNoise'
        }
        firstNode.opacity = 0.6
        firstNode.blendMode = 'soft-light'
        defaultGraph.baseColor = '#e8efe7'
      }
    }

    const compiled = compileTexture(defaultGraph)

    store.versions.push({
      id: nanoid(14),
      textureId,
      versionNumber: 1,
      status: 'published',
      sourceGraph: compiled.sourceGraph,
      artifactBundle: compiled.artifactBundle,
      previewCssText: compiled.previewCssText,
      createdAt: nowIso(),
      publishedAt: nowIso()
    })
  }
}

export class MemoryTextureRepository implements TextureRepository {
  constructor() {
    seedDemoData()
  }

  async listTextures(input: ListTexturesInput) {
    let textures = store.textures.filter((texture) => !texture.deletedAt)

    if (input.q) {
      const query = input.q.toLowerCase()
      textures = textures.filter((texture) => {
        const haystack = `${texture.name} ${texture.description ?? ''}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    if (input.tags.length > 0) {
      textures = textures.filter((texture) => {
        const names = getTagNamesForTexture(texture.id).map((tag) => tag.toLowerCase())
        return input.tags.every((tag) => names.includes(tag.toLowerCase()))
      })
    }

    textures = textures.filter((texture) => Boolean(pickPreview(texture.id, input.status)))
    textures.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    const offset = decodeCursor(input.cursor)
    const page = textures.slice(offset, offset + input.limit)
    const hasMore = textures.length > offset + page.length

    const items: TextureListItem[] = page.map((texture) => {
      const previewVersion = pickPreview(texture.id, input.status)

      if (!previewVersion) {
        throw createError({ statusCode: 500, statusMessage: `No preview version for texture ${texture.id}` })
      }

      return {
        id: texture.id,
        name: texture.name,
        slug: texture.slug,
        tags: getTagNamesForTexture(texture.id),
        publishedAt: previewVersion.publishedAt,
        versionId: previewVersion.id,
        preview: {
          cssText: previewVersion.previewCssText,
          html: previewVersion.artifactBundle.htmlSnippet,
          svgDefs: previewVersion.artifactBundle.svgDefs,
          jsSnippet: previewVersion.artifactBundle.jsSnippet
        }
      }
    })

    return {
      items,
      nextCursor: hasMore ? encodeCursor(offset + page.length) : null
    }
  }

  async getTextureDetail(textureId: string) {
    const texture = store.textures.find((item) => item.id === textureId && !item.deletedAt)
    return texture ? toDetail(texture) : null
  }

  async createTexture(input: CreateTextureInput) {
    const now = nowIso()
    const texture: MemoryTexture = {
      id: nanoid(12),
      name: input.name,
      slug: `${slugify(input.name, { lower: true, strict: true })}-${nanoid(4)}`,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }

    store.textures.push(texture)
    applyTags(texture.id, input.tags)
    recordAudit(input.actor, 'create', 'texture', texture.id, { name: texture.name, tags: input.tags })

    return toDetail(texture)
  }

  async updateTexture(textureId: string, input: UpdateTextureInput) {
    const texture = store.textures.find((item) => item.id === textureId && !item.deletedAt)

    if (!texture) {
      return null
    }

    if (typeof input.name === 'string') {
      texture.name = input.name
      texture.slug = `${slugify(input.name, { lower: true, strict: true })}-${texture.id.slice(0, 4)}`
    }

    if (typeof input.description === 'string') {
      texture.description = input.description
    }

    if (input.tags) {
      applyTags(textureId, input.tags)
    }

    texture.updatedAt = nowIso()
    recordAudit(input.actor, 'update', 'texture', texture.id, { name: texture.name, tags: input.tags ?? getTagNamesForTexture(texture.id) })
    return toDetail(texture)
  }

  async softDeleteTexture(textureId: string, actor: string) {
    const texture = store.textures.find((item) => item.id === textureId && !item.deletedAt)

    if (!texture) {
      return false
    }

    texture.deletedAt = nowIso()
    texture.updatedAt = nowIso()
    recordAudit(actor, 'delete', 'texture', texture.id)
    return true
  }

  async createVersion(input: CreateTextureVersionInput) {
    const texture = store.textures.find((item) => item.id === input.textureId && !item.deletedAt)

    if (!texture) {
      throw createError({ statusCode: 404, statusMessage: 'Texture not found' })
    }

    const versionNumber = store.versions.filter((version) => version.textureId === texture.id).length + 1
    const now = nowIso()

    const nextVersion: MemoryTextureVersion = {
      id: nanoid(14),
      textureId: texture.id,
      versionNumber,
      status: 'draft',
      sourceGraph: input.sourceGraph,
      artifactBundle: input.artifactBundle,
      previewCssText: input.previewCssText,
      createdAt: now,
      publishedAt: null
    }

    store.versions.push(nextVersion)
    texture.updatedAt = now

    recordAudit(input.actor, 'create_version', 'texture_version', nextVersion.id, {
      textureId: texture.id,
      versionNumber
    })

    return {
      id: nextVersion.id,
      textureId: nextVersion.textureId,
      versionNumber: nextVersion.versionNumber,
      status: nextVersion.status,
      sourceGraph: nextVersion.sourceGraph,
      artifactBundle: nextVersion.artifactBundle,
      createdAt: nextVersion.createdAt,
      publishedAt: nextVersion.publishedAt
    }
  }

  async publishVersion(textureId: string, versionId: string, actor: string) {
    const versions = store.versions.filter((version) => version.textureId === textureId)
    const target = versions.find((version) => version.id === versionId)

    if (!target) {
      return null
    }

    const now = nowIso()

    for (const version of versions) {
      if (version.status === 'published') {
        version.status = 'archived'
      }
    }

    target.status = 'published'
    target.publishedAt = now
    recordAudit(actor, 'publish', 'texture_version', target.id, { textureId: target.textureId })

    return {
      id: target.id,
      textureId: target.textureId,
      versionNumber: target.versionNumber,
      status: target.status,
      sourceGraph: target.sourceGraph,
      artifactBundle: target.artifactBundle,
      createdAt: target.createdAt,
      publishedAt: target.publishedAt
    }
  }

  async listPublishedVersions() {
    return store.versions
      .filter((version) => version.status === 'published')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((version) => ({
        id: version.id,
        textureId: version.textureId,
        versionNumber: version.versionNumber,
        status: version.status,
        sourceGraph: version.sourceGraph,
        artifactBundle: version.artifactBundle,
        createdAt: version.createdAt,
        publishedAt: version.publishedAt
      }))
  }

  async listPresets() {
    return [...store.presets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async savePreset(input: SavePresetInput) {
    const now = nowIso()

    if (input.id) {
      const existing = store.presets.find((preset) => preset.id === input.id)

      if (existing) {
        existing.name = input.name
        existing.slots = input.slots
        existing.updatedAt = now
        recordAudit(input.actor, 'update', 'test_preset', existing.id, { name: existing.name })
        return existing
      }
    }

    const nextPreset: TestPreset = {
      id: nanoid(12),
      name: input.name,
      slots: input.slots,
      createdAt: now,
      updatedAt: now
    }

    store.presets.push(nextPreset)
    recordAudit(input.actor, 'create', 'test_preset', nextPreset.id, { name: nextPreset.name })
    return nextPreset
  }
}
