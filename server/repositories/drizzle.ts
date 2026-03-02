import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import slugify from 'slugify'
import { createError } from 'h3'
import type { TestPreset, TextureListItem } from '~~/shared/types/texture'
import { getDatabase } from '~~/server/db/client'
import { auditEvents, tags, testPresetSlots, testPresets, textureTags, textures, textureVersions } from '~~/server/db/schema'
import { compileTexture } from '~~/server/domain/generator/compile'
import type { CreateTextureInput, CreateTextureVersionInput, ListTexturesInput, SavePresetInput, TextureRepository, UpdateTextureInput } from '~~/server/repositories/contracts'

function now() {
  return new Date()
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

async function resolveTextureTags(textureId: string): Promise<string[]> {
  const db = getDatabase()
  const rows = await db
    .select({ name: tags.name })
    .from(textureTags)
    .innerJoin(tags, eq(textureTags.tagId, tags.id))
    .where(eq(textureTags.textureId, textureId))

  return rows.map((row) => row.name)
}

async function upsertTags(textureId: string, inputTags: string[]) {
  const db = getDatabase()

  await db.delete(textureTags).where(eq(textureTags.textureId, textureId))

  for (const tagName of inputTags) {
    const normalized = tagName.trim()
    if (!normalized) continue

    const slug = slugify(normalized, { lower: true, strict: true })
    const existing = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1)

    let tagId = existing[0]?.id

    if (!tagId) {
      const created = await db.insert(tags).values({ name: normalized, slug }).returning({ id: tags.id })
      tagId = created[0]?.id
    }

    if (tagId) {
      await db.insert(textureTags).values({ textureId, tagId }).onConflictDoNothing()
    }
  }
}

async function recordAudit(actor: string, action: string, entityType: string, entityId: string, payload: Record<string, unknown> = {}) {
  const db = getDatabase()
  await db.insert(auditEvents).values({
    actor,
    action,
    entityType,
    entityId,
    payload
  })
}

export class DrizzleTextureRepository implements TextureRepository {
  async listTextures(input: ListTexturesInput) {
    const db = getDatabase()
    const offset = decodeCursor(input.cursor)

    const whereClauses = [isNull(textures.deletedAt)]

    if (input.q) {
      whereClauses.push(sql`${textures.name} ILIKE ${`%${input.q}%`} OR coalesce(${textures.description}, '') ILIKE ${`%${input.q}%`}`)
    }

    const rows = await db
      .select({
        id: textures.id,
        name: textures.name,
        slug: textures.slug,
        description: textures.description,
        updatedAt: textures.updatedAt
      })
      .from(textures)
      .where(and(...whereClauses))
      .orderBy(desc(textures.updatedAt))
      .offset(offset)
      .limit(input.limit + 1)

    const pageRows = rows.slice(0, input.limit)

    const items: TextureListItem[] = []

    for (const row of pageRows) {
      const versions = await db
        .select()
        .from(textureVersions)
        .where(eq(textureVersions.textureId, row.id))
        .orderBy(desc(textureVersions.versionNumber))

      const preview = versions.find((version) => (input.status === 'published' ? version.status === 'published' : input.status === 'draft' ? version.status === 'draft' : true))

      if (!preview) {
        continue
      }

      const compiled = compileTexture(preview.sourceGraph)

      const tagNames = await resolveTextureTags(row.id)
      if (input.tags.length > 0) {
        const lowerTags = tagNames.map((name) => name.toLowerCase())
        if (!input.tags.every((tag) => lowerTags.includes(tag.toLowerCase()))) {
          continue
        }
      }

      items.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        tags: tagNames,
        publishedAt: preview.publishedAt?.toISOString() ?? null,
        versionId: preview.id,
        preview: {
          cssText: compiled.previewCssText,
          html: preview.artifactBundle.htmlSnippet,
          svgDefs: preview.artifactBundle.svgDefs,
          jsSnippet: preview.artifactBundle.jsSnippet
        }
      })
    }

    return {
      items,
      nextCursor: rows.length > input.limit ? encodeCursor(offset + input.limit) : null
    }
  }

  async getTextureDetail(textureId: string) {
    const db = getDatabase()
    const row = await db.select().from(textures).where(and(eq(textures.id, textureId), isNull(textures.deletedAt))).limit(1)

    if (!row[0]) {
      return null
    }

    const versions = await db
      .select()
      .from(textureVersions)
      .where(eq(textureVersions.textureId, textureId))
      .orderBy(desc(textureVersions.versionNumber))

    const tagNames = await resolveTextureTags(textureId)

    return {
      texture: {
        id: row[0].id,
        name: row[0].name,
        slug: row[0].slug,
        description: row[0].description,
        createdAt: row[0].createdAt.toISOString(),
        updatedAt: row[0].updatedAt.toISOString(),
        deletedAt: row[0].deletedAt?.toISOString() ?? null
      },
      versions: versions.map((version) => ({
        id: version.id,
        textureId: version.textureId,
        versionNumber: version.versionNumber,
        status: version.status,
        sourceGraph: version.sourceGraph,
        artifactBundle: version.artifactBundle,
        createdAt: version.createdAt.toISOString(),
        publishedAt: version.publishedAt?.toISOString() ?? null
      })),
      tags: tagNames
    }
  }

  async createTexture(input: CreateTextureInput) {
    const db = getDatabase()
    const slug = `${slugify(input.name, { lower: true, strict: true })}-${Math.random().toString(36).slice(2, 6)}`

    const created = await db
      .insert(textures)
      .values({
        name: input.name,
        slug,
        description: input.description ?? null
      })
      .returning({ id: textures.id })

    const textureId = created[0]?.id

    if (!textureId) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create texture' })
    }

    await upsertTags(textureId, input.tags)
    await recordAudit(input.actor, 'create', 'texture', textureId, { name: input.name, tags: input.tags })

    const detail = await this.getTextureDetail(textureId)
    if (!detail) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch created texture' })
    }

    return detail
  }

  async updateTexture(textureId: string, input: UpdateTextureInput) {
    const db = getDatabase()

    const updatePayload: Record<string, unknown> = {
      updatedAt: now()
    }

    if (typeof input.name === 'string') {
      updatePayload.name = input.name
      updatePayload.slug = `${slugify(input.name, { lower: true, strict: true })}-${textureId.slice(0, 4)}`
    }

    if (typeof input.description === 'string') {
      updatePayload.description = input.description
    }

    await db.update(textures).set(updatePayload).where(eq(textures.id, textureId))

    if (input.tags) {
      await upsertTags(textureId, input.tags)
    }

    await recordAudit(input.actor, 'update', 'texture', textureId, {
      name: input.name,
      tags: input.tags
    })

    return this.getTextureDetail(textureId)
  }

  async softDeleteTexture(textureId: string, actor: string) {
    const db = getDatabase()
    const rows = await db
      .update(textures)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(textures.id, textureId))
      .returning({ id: textures.id })

    if (rows[0]) {
      await recordAudit(actor, 'delete', 'texture', textureId)
      return true
    }

    return false
  }

  async createVersion(input: CreateTextureVersionInput) {
    const db = getDatabase()

    const latest = await db
      .select({ versionNumber: textureVersions.versionNumber })
      .from(textureVersions)
      .where(eq(textureVersions.textureId, input.textureId))
      .orderBy(desc(textureVersions.versionNumber))
      .limit(1)

    const versionNumber = (latest[0]?.versionNumber ?? 0) + 1

    const inserted = await db
      .insert(textureVersions)
      .values({
        textureId: input.textureId,
        versionNumber,
        status: 'draft',
        sourceGraph: input.sourceGraph,
        artifactBundle: input.artifactBundle
      })
      .returning()

    const row = inserted[0]

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create version' })
    }

    await db.update(textures).set({ updatedAt: now() }).where(eq(textures.id, input.textureId))
    await recordAudit(input.actor, 'create_version', 'texture_version', row.id, {
      textureId: input.textureId,
      versionNumber
    })

    return {
      id: row.id,
      textureId: row.textureId,
      versionNumber: row.versionNumber,
      status: row.status,
      sourceGraph: row.sourceGraph,
      artifactBundle: row.artifactBundle,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null
    }
  }

  async publishVersion(textureId: string, versionId: string, actor: string) {
    const db = getDatabase()

    await db
      .update(textureVersions)
      .set({ status: 'archived' })
      .where(and(eq(textureVersions.textureId, textureId), eq(textureVersions.status, 'published')))

    const rows = await db
      .update(textureVersions)
      .set({ status: 'published', publishedAt: now() })
      .where(and(eq(textureVersions.textureId, textureId), eq(textureVersions.id, versionId)))
      .returning()

    const row = rows[0]

    if (!row) {
      return null
    }

    await recordAudit(actor, 'publish', 'texture_version', row.id, { textureId })

    return {
      id: row.id,
      textureId: row.textureId,
      versionNumber: row.versionNumber,
      status: row.status,
      sourceGraph: row.sourceGraph,
      artifactBundle: row.artifactBundle,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null
    }
  }

  async listPublishedVersions() {
    const db = getDatabase()
    const rows = await db
      .select()
      .from(textureVersions)
      .where(eq(textureVersions.status, 'published'))
      .orderBy(desc(textureVersions.publishedAt))

    return rows.map((row) => ({
      id: row.id,
      textureId: row.textureId,
      versionNumber: row.versionNumber,
      status: row.status,
      sourceGraph: row.sourceGraph,
      artifactBundle: row.artifactBundle,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null
    }))
  }

  async listPresets() {
    const db = getDatabase()
    const presets = await db.select().from(testPresets).orderBy(desc(testPresets.updatedAt))
    const presetIds = presets.map((preset) => preset.id)

    const slots = presetIds.length > 0
      ? await db.select().from(testPresetSlots).where(inArray(testPresetSlots.presetId, presetIds))
      : []

    return presets.map<TestPreset>((preset) => ({
      id: preset.id,
      name: preset.name,
      createdAt: preset.createdAt.toISOString(),
      updatedAt: preset.updatedAt.toISOString(),
      slots: slots
        .filter((slot) => slot.presetId === preset.id)
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map((slot) => ({
          slotIndex: slot.slotIndex,
          textureVersionId: slot.textureVersionId,
          fitMode: slot.fitMode,
          scale: slot.scale,
          position: slot.position
        }))
    }))
  }

  async savePreset(input: SavePresetInput) {
    const db = getDatabase()
    let presetId = input.id

    if (presetId) {
      await db.update(testPresets).set({ name: input.name, updatedAt: now() }).where(eq(testPresets.id, presetId))
      await db.delete(testPresetSlots).where(eq(testPresetSlots.presetId, presetId))
    } else {
      const created = await db.insert(testPresets).values({ name: input.name }).returning({ id: testPresets.id })
      presetId = created[0]?.id
    }

    if (!presetId) {
      throw createError({ statusCode: 500, statusMessage: 'Unable to persist preset' })
    }

    await db.insert(testPresetSlots).values(
      input.slots.map((slot) => ({
        presetId,
        slotIndex: slot.slotIndex,
        textureVersionId: slot.textureVersionId,
        fitMode: slot.fitMode,
        scale: slot.scale,
        position: slot.position
      }))
    )

    const presets = await this.listPresets()
    const saved = presets.find((preset) => preset.id === presetId)

    if (!saved) {
      throw createError({ statusCode: 500, statusMessage: 'Unable to load saved preset' })
    }

    await recordAudit(input.actor, input.id ? 'update' : 'create', 'test_preset', saved.id, {
      name: saved.name
    })

    return saved
  }
}
