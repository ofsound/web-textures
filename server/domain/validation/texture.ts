import { z } from 'zod'

const colorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Expected hex color')
const safeTextSchema = z.string().max(8000)

export const textureNodeSchema = z.object({
  id: z.string().min(1).max(64),
  primitiveId: z.string().min(1).max(64),
  signature: z.string().min(1).max(64),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  opacity: z.number().min(0).max(1).optional(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'difference']).optional()
})

export const textureSourceGraphSchema = z.object({
  version: z.literal(1),
  baseColor: colorSchema,
  tileSize: z.number().int().min(8).max(512),
  zoom: z.number().min(0.2).max(8),
  repeatMode: z.enum(['repeat', 'repeat-x', 'repeat-y', 'no-repeat']),
  nodes: z.array(textureNodeSchema).min(1).max(16),
  advancedOverride: z
    .object({
      cssExtra: safeTextSchema.optional(),
      htmlExtra: safeTextSchema.optional(),
      svgExtra: safeTextSchema.optional()
    })
    .optional()
})

export const textureMetadataSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(12).default([])
})

export const listTexturesQuerySchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(['draft', 'published', 'all']).default('published'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24)
})

export const createVersionSchema = z.object({
  sourceGraph: textureSourceGraphSchema
})

export const publishVersionSchema = z.object({
  versionId: z.string().min(1)
})

export const presetSlotSchema = z.object({
  slotIndex: z.number().int().min(0).max(4),
  textureVersionId: z.string().nullable(),
  fitMode: z.enum(['cover', 'contain', 'tile']).default('tile'),
  scale: z.number().int().min(8).max(400).default(56),
  position: z.string().default('center')
})

export const savePresetSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  slots: z.array(presetSlotSchema).length(5)
})

export const previewRenderSchema = z.object({
  sourceGraph: textureSourceGraphSchema
})
