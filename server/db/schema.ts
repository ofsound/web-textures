import { boolean, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { TextureArtifactBundle, TextureSourceGraph } from '~~/shared/types/texture'

export const textureVersionStatusEnum = pgEnum('texture_version_status', ['draft', 'published', 'archived'])
export const fitModeEnum = pgEnum('fit_mode', ['cover', 'contain', 'tile'])

export const textures = pgTable('textures', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
})

export const textureVersions = pgTable('texture_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  textureId: uuid('texture_id').notNull().references(() => textures.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  status: textureVersionStatusEnum('status').default('draft').notNull(),
  sourceGraph: jsonb('source_graph').$type<TextureSourceGraph>().notNull(),
  artifactBundle: jsonb('artifact_bundle').$type<TextureArtifactBundle>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true })
})

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const textureTags = pgTable(
  'texture_tags',
  {
    textureId: uuid('texture_id').notNull().references(() => textures.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.textureId, table.tagId] })
  })
)

export const primitives = pgTable('primitives', {
  id: text('id').primaryKey(),
  signature: text('signature').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  defaults: jsonb('defaults').$type<Record<string, string | number | boolean>>().notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const testPresets = pgTable('test_presets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export const testPresetSlots = pgTable('test_preset_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  presetId: uuid('preset_id').notNull().references(() => testPresets.id, { onDelete: 'cascade' }),
  slotIndex: integer('slot_index').notNull(),
  textureVersionId: uuid('texture_version_id').references(() => textureVersions.id, { onDelete: 'set null' }),
  fitMode: fitModeEnum('fit_mode').default('tile').notNull(),
  scale: integer('scale').default(56).notNull(),
  position: text('position').default('center').notNull()
})

export const textureAssets = pgTable('texture_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  textureId: uuid('texture_id').notNull().references(() => textures.id, { onDelete: 'cascade' }),
  assetType: text('asset_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})
